'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { usePermission } from '@/contexts/PermissionContext'
import { toast } from 'react-hot-toast'

// Hooks
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, useBulkDeleteLeads, useBulkUpdateLeads } from '@/hooks/useLeads'
import { useProjects } from '@/hooks/useProjects'
import { useQuery } from '@tanstack/react-query'

// Components
import dynamic from 'next/dynamic'

// Components
// ... existing imports ...
import { LeadTable } from '@/components/crm/leads/LeadTable'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'

const LeadFilters = dynamic(() => import('@/components/crm/leads/LeadFilters').then(mod => mod.LeadFilters), {
  loading: () => <Skeleton className="h-16 w-full mb-6" />
})
const LeadDialog = dynamic(() => import('@/components/crm/leads/LeadDialog').then(mod => mod.LeadDialog))
const LeadSourceDialog = dynamic(() => import('@/components/crm/LeadSourceDialog'))

export default function LeadsPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [projectId, setProjectId] = useState(null)
  const [selectedLeads, setSelectedLeads] = useState(new Set())
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState(null)
  const [isRefreshingLeads, setIsRefreshingLeads] = useState(false)

  // Permissions
  const canCreate = usePermission('create_leads')
  const canEditAll = usePermission('edit_all_leads')
  const canEditTeam = usePermission('edit_team_leads')
  const canEditOwn = usePermission('edit_own_leads')
  const canDelete = usePermission('delete_leads')

  // Helper: Can Edit
  const canEditLead = (lead) => {
    if (canEditAll || canEditTeam) return true
    if (canEditOwn && lead.assigned_to_user?.id) { /* Check own ID usage if accessible */ return true }
    return true
  }

  // Data Fetching
  const { data: leadsResponse, isLoading: leadsLoading, isPlaceholderData, refetch: refetchLeads } = useLeads({
    search: searchQuery,
    stageId: stageFilter !== 'all' ? stageFilter : undefined,
    projectId: projectId,
    page: page,
    limit: limit,
    sortBy: sortBy,
    sortOrder: sortOrder
  })

  const leads = leadsResponse?.leads || []
  const metadata = leadsResponse?.metadata || {}

  const handleRefreshLeads = async () => {
    setIsRefreshingLeads(true)
    try {
      await refetchLeads()
    } finally {
      setIsRefreshingLeads(false)
    }
  }

  const leadsListLoading = leadsLoading || isRefreshingLeads

  const { data: projects } = useProjects({ status: 'active' })

  // Fetch users for assignment (inline hook usage since simple)
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    }
  })
  const users = usersData?.users || []

  // Mutations
  const createLeadMutation = useCreateLead()
  const updateLeadMutation = useUpdateLead()
  const deleteLeadMutation = useDeleteLead()
  const bulkDeleteMutation = useBulkDeleteLeads()
  const bulkUpdateMutation = useBulkUpdateLeads()

  // Handlers
  const handleCreateEditSubmit = async (data) => {
    try {
      if (editingLead) {
        await updateLeadMutation.mutateAsync({
          leadId: editingLead.id,
          updates: data
        })
      } else {
        await createLeadMutation.mutateAsync(data)
      }
      setIsDialogOpen(false)
      setEditingLead(null)
      await refetchLeads()
      toast.success(editingLead ? 'Lead updated' : 'Lead added')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save lead')
    }
  }

  const handleEditClick = (lead) => {
    setEditingLead(lead)
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (lead) => {
    setLeadToDelete(lead)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!leadToDelete) return
    try {
      await deleteLeadMutation.mutateAsync(leadToDelete.id)
      setDeleteDialogOpen(false)
      setLeadToDelete(null)
      setSelectedLeads(prev => {
        const next = new Set(prev)
        next.delete(leadToDelete.id)
        return next
      })
      await refetchLeads()
      toast.success('Lead deleted')
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete lead')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedLeads.size} selected leads?`)) return

    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedLeads))
      setSelectedLeads(new Set())
      await refetchLeads()
      toast.success('Leads deleted successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete leads')
    }
  }

  const handleBulkAssign = async (userId) => {
    if (selectedLeads.size === 0) return

    try {
      await bulkUpdateMutation.mutateAsync({
        leadIds: Array.from(selectedLeads),
        updates: { assigned_to: userId }
      })
      setSelectedLeads(new Set())
      await refetchLeads()
      toast.success('Leads assigned successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to assign leads')
    }
  }

  const handleStatusUpdate = async (id, stageId) => {
    try {
      await updateLeadMutation.mutateAsync({
        leadId: id,
        updates: { stageId: stageId === 'none' ? null : stageId }
      })
      await refetchLeads()
      toast.success('Lead stage updated')
    } catch (error) {
      console.error(error)
      toast.error('Failed to update status')
    }
  }

  // Fetch all stages for inline editing
  const { data: stagesData } = useQuery({
    queryKey: ['pipeline-stages-all'],
    queryFn: async () => {
      const res = await fetch('/api/pipeline/stages')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    }
  })
  const allStages = stagesData?.stages || []

  // Helpers
  // ... existing code ...

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsSourceDialogOpen(true)} disabled={!canCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button>
        </div>
      </div>

      <LeadFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        stageFilter={stageFilter}
        setStageFilter={setStageFilter}
        projectId={projectId}
        setProjectId={setProjectId}
        projects={projects || []}
        stages={allStages}
        onRefresh={handleRefreshLeads}
        loading={leadsListLoading}
      />

      <LeadTable
        leads={leads}
        loading={leadsListLoading}
        selectedLeads={selectedLeads}
        setSelectedLeads={setSelectedLeads}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        canEditLead={canEditLead}
        canDelete={canDelete}
        onStatusUpdate={handleStatusUpdate}
        stages={allStages}
        onBulkDelete={handleBulkDelete}
        onBulkAssign={handleBulkAssign}
        users={users}

        // Pagination Props
        page={page}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={(val) => {
          setLimit(val)
          setPage(1)
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(field) => {
          if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
          } else {
            setSortBy(field)
            setSortOrder('desc')
          }
          setPage(1)
        }}
        hasMore={metadata?.hasMore}
        totalLeads={metadata?.total || 0}
        isLoadingMore={isPlaceholderData}
      />

      <LeadDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingLead(null)
        }}
        lead={editingLead}
        projects={projects || []}
        users={users}
        onSubmit={handleCreateEditSubmit}
        submitting={createLeadMutation.isPending || updateLeadMutation.isPending}
      />

      <LeadSourceDialog
        open={isSourceDialogOpen}
        onOpenChange={setIsSourceDialogOpen}
        projectId={projectId}
        projects={projects || []}
        users={users}
        onSuccess={refetchLeads}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
