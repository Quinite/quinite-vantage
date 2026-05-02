'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Archive, AlertCircle, ShieldAlert, Loader2, LayoutGrid, List, Users, CheckCircle2, Package, Clock } from 'lucide-react'
import dynamic from 'next/dynamic'
import { usePermission } from '@/contexts/PermissionContext'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'
import { useSubscription } from '@/contexts/SubscriptionContext'

// Hooks
import { 
  useLeads, 
  useCreateLead, 
  useUpdateLead, 
  useDeleteLead, 
  useBulkDeleteLeads, 
  useBulkUpdateLeads,
  useArchiveLead,
  useBulkArchiveLeads,
  useRestoreLead,
  useBulkRestoreLeads
} from '@/hooks/useLeads'
import { useProjects } from '@/hooks/useProjects'
import { useQuery } from '@tanstack/react-query'
import { useUsers } from '@/hooks/usePipelines'

// Components
import { LeadTable } from '@/components/crm/leads/LeadTable'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'

const LeadFilters = dynamic(() => import('@/components/crm/leads/LeadFilters').then(mod => mod.LeadFilters), {
  loading: () => <Skeleton className="h-16 w-full mb-6" />
})
const LeadDialog = dynamic(() => import('@/components/crm/leads/LeadDialog').then(mod => mod.LeadDialog))
const LeadSourceDialog = dynamic(() => import('@/components/crm/LeadSourceDialog'))
// PipelineBoard import removed as it is no longer used here

export default function LeadsPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [projectId, setProjectId] = useState(null)
  const [assignedTo, setAssignedTo] = useState(null)
  const [selectedLeads, setSelectedLeads] = useState(new Set())
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [viewMode, setViewMode] = useState('active') // 'active' or 'archived'

  // View type is now fixed to table
  const viewType = 'table'
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [isRefreshingLeads, setIsRefreshingLeads] = useState(false)

  // Archive States
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [leadToArchive, setLeadToArchive] = useState(null)
  const [archiveImpact, setArchiveImpact] = useState(null)
  const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] = useState(false)
  const [bulkArchiveImpact, setBulkArchiveImpact] = useState(null)
  const [isCalculatingImpact, setIsCalculatingImpact] = useState(false)

  // Permissions & Auth
  const { profile } = useAuth()
  const canCreate = usePermission('create_leads')
  const { isExpired: subExpired } = useSubscription()
  const canEditAll = usePermission('edit_all_leads')
  const canEditTeam = usePermission('edit_team_leads')
  const canEditOwn = usePermission('edit_own_leads')
  const canDelete = usePermission('delete_leads')
  const isPlatformAdmin = profile?.role === 'platform_admin'

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
    assignedTo: assignedTo,
    page: page,
    limit: limit,
    sortBy: sortBy,
    sortOrder: sortOrder,
    viewMode: viewMode
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




  const { data: projects } = useProjects({ status: 'active' })

  // Fetch users for assignment
  const { data: users = [] } = useUsers()

  // Mutations
  const createLeadMutation = useCreateLead()
  const updateLeadMutation = useUpdateLead()
  const deleteLeadMutation = useDeleteLead()
  const bulkDeleteMutation = useBulkDeleteLeads()
  const bulkUpdateMutation = useBulkUpdateLeads()
  const archiveLeadMutation = useArchiveLead()
  const bulkArchiveMutation = useBulkArchiveLeads()
  const restoreLeadMutation = useRestoreLead()
  const bulkRestoreMutation = useBulkRestoreLeads()

  // Derived Loading State
  const leadsListLoading = leadsLoading || isRefreshingLeads || deleteLeadMutation.isPending || bulkDeleteMutation.isPending || bulkArchiveMutation.isPending || restoreLeadMutation.isPending || bulkRestoreMutation.isPending

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





  const handleArchiveClick = async (lead) => {
    setLeadToArchive(lead)
    setArchiveDialogOpen(true)
    setIsCalculatingImpact(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/archive-preview`)
      const data = await res.json()
      setArchiveImpact(data.impact)
    } catch (e) {
      console.error(e)
    } finally {
      setIsCalculatingImpact(false)
    }
  }

  const handleRestore = async (lead) => {
    setIsRefreshingLeads(true)
    try {
      await restoreLeadMutation.mutateAsync(lead.id)
      await refetchLeads()
      toast.success('Lead restored to pipeline')
    } catch (error) {
      console.error(error)
      toast.error('Failed to restore lead')
    } finally {
      setIsRefreshingLeads(false)
    }
  }

  const confirmArchive = async () => {
    if (!leadToArchive) return
    setIsRefreshingLeads(true)
    try {
      await archiveLeadMutation.mutateAsync(leadToArchive.id)
      setArchiveDialogOpen(false)
      setLeadToArchive(null)
      await refetchLeads()
      toast.success('Lead archived safely')
    } catch (error) {
      console.error(error)
      toast.error('Failed to archive lead')
    } finally {
      setIsRefreshingLeads(false)
    }
  }



  const handleBulkArchive = async () => {
    if (selectedLeads.size === 0) return
    
    setIsCalculatingImpact(true)
    setBulkArchiveDialogOpen(true)
    try {
      const res = await fetch('/api/leads/bulk-archive/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads) })
      })
      const data = await res.json()
      setBulkArchiveImpact(data.impact)
    } catch (e) {
      console.error(e)
      toast.error('Failed to calculate impact')
    } finally {
      setIsCalculatingImpact(false)
    }
  }

  const confirmBulkArchive = async () => {
    if (selectedLeads.size === 0) return
    setIsRefreshingLeads(true)
    const count = selectedLeads.size
    try {
      await bulkArchiveMutation.mutateAsync(Array.from(selectedLeads))
      setSelectedLeads(new Set())
      setBulkArchiveDialogOpen(false)
      setBulkArchiveImpact(null)
      await refetchLeads()
      toast.success(`${count} leads archived safely`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to archive leads')
    } finally {
      setIsRefreshingLeads(false)
    }
  }

  const handleBulkRestore = async () => {
    if (selectedLeads.size === 0) return
    if (!confirm(`Restore ${selectedLeads.size} leads back to the active pipeline?`)) return

    setIsRefreshingLeads(true)
    try {
      await bulkRestoreMutation.mutateAsync(Array.from(selectedLeads))
      setSelectedLeads(new Set())
      await refetchLeads()
      toast.success(`${selectedLeads.size} leads restored`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to restore leads')
    } finally {
      setIsRefreshingLeads(false)
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Lead Management</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Manage and track your sales pipeline and lead interactions.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => setIsSourceDialogOpen(true)}
            disabled={!canCreate || subExpired}
            title={subExpired ? 'Subscription expired — renew to add leads' : undefined}
            className="w-full md:w-auto justify-center h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all duration-200"
          >
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
        assignedTo={assignedTo}
        setAssignedTo={setAssignedTo}
        projects={projects || []}
        stages={allStages}
        users={users}
        onRefresh={handleRefreshLeads}
        loading={leadsListLoading}
        viewMode={viewMode}
        setViewMode={(val) => {
          setViewMode(val)
          setPage(1)
        }}
      />

      {/* Kanban view removed */}

      {viewType === 'table' ? <LeadTable
        leads={leads}
        loading={leadsListLoading}
        viewMode={viewMode}
        selectedLeads={selectedLeads}
        setSelectedLeads={setSelectedLeads}
        onEdit={handleEditClick}
        onArchive={handleArchiveClick}
        onRestore={handleRestore}
        onBulkRestore={handleBulkRestore}
        canEditLead={canEditLead}
        canDelete={canDelete}
        isPlatformAdmin={isPlatformAdmin}
        onStatusUpdate={handleStatusUpdate}
        stages={allStages}
        onBulkArchive={handleBulkArchive}
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
      /> : null}

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



      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-600" />
              Safe Lead Archive?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Archiving removes the lead from active pipelines but preserves all history and performance metrics for reporting.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isCalculatingImpact ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calculating archive impact...</p>
            </div>
          ) : archiveImpact && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-100">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Active Campaigns</span>
                  </div>
                  <span className="text-sm font-bold text-orange-600">{archiveImpact.active_campaigns} will be frozen</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-sm font-medium">Pending Tasks</span>
                  </div>
                  <span className="text-sm font-bold text-slate-600 font-mono">{archiveImpact.pending_tasks} cancelled</span>
                </div>

                {archiveImpact.open_deals > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-sm font-medium">Open Deals</span>
                    </div>
                    <span className="text-sm font-bold text-slate-600">{archiveImpact.open_deals} marked as Lost</span>
                  </div>
                )}
                
                {archiveImpact.has_linked_unit && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-xs text-blue-700">
                      <strong>Note:</strong> Associated unit will stay marked as <strong>{archiveImpact.linked_unit_sold ? 'Sold' : 'Reserved'}</strong>. This does not release the inventory back to the market.
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground italic">
                All call recordings and conversation transcripts will be safely preserved.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveLeadMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmArchive}
              disabled={isCalculatingImpact || archiveLeadMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {archiveLeadMutation.isPending ? 'Archiving...' : 'Confirm Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Archive Dialog */}
      <AlertDialog open={bulkArchiveDialogOpen} onOpenChange={setBulkArchiveDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-600" />
              Bulk Archive Leads
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to archive <span className="font-bold text-slate-900">{selectedLeads.size} leads</span>. 
              This will safely move them out of your active pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isCalculatingImpact ? (
            <div className="py-6 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-sm text-slate-500">Calculating aggregated impact...</p>
            </div>
          ) : bulkArchiveImpact ? (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100 my-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aggregated Impact</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-md">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{bulkArchiveImpact.pending_tasks}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Tasks Cancelled</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-100 rounded-md">
                    <Package className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{bulkArchiveImpact.active_deals}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Deals Lost</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 rounded-md">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{bulkArchiveImpact.active_campaigns}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Campaign Removal</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{bulkArchiveImpact.has_linked_units}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Linked Units</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                  * All active tasks will be cancelled, deals marked as lost, and leads removed from any active AI call queues.
                </p>
              </div>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkArchiveImpact(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkArchive}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isCalculatingImpact}
            >
              {isRefreshingLeads ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
              Archive {selectedLeads.size} Leads
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
