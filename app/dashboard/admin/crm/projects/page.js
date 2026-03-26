'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Plus, Sparkles, Loader2, Briefcase, LayoutGrid, List, X, Lock, RefreshCw, ChevronDown, ChevronUp, Archive, History, Megaphone, Users, PhoneCall, AlertCircle, Store, IndianRupee } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import dynamic from 'next/dynamic'
import ProjectCard from '@/components/projects/ProjectCard'
import ProjectList from '@/components/projects/ProjectList'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'
import { useProjects } from '@/hooks/useProjects'
import { formatCurrency } from '@/lib/utils/currency'

const ProjectForm = dynamic(() => import('@/components/projects/ProjectForm'), {
  loading: () => <Skeleton className="h-96 w-full" />
})

// Helper for safe number parsing
const safeParseFloat = (val) => {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

const formatPrice = (price) => {
  if (!price) return '0'
  const n = Number(price)
  if (n >= 10000000) return (n / 10000000).toFixed(2) + ' Cr'
  if (n >= 100000) return (n / 100000).toFixed(2) + ' Lac'
  return n.toLocaleString('en-IN')
}

export default function ProjectsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Handle debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Data Fetching
  const {
    data: projectsData,
    metadata: projectsMetadata,
    isLoading: loading,
    isFetching,
    isPlaceholderData,
    refetch
  } = useProjects({
    search: debouncedSearchTerm,
    page,
    limit: 20
  })

  // Combined loading state for skeleton: initial loading OR fetching new search/page/refresh
  // Adding a small delay or check to make it "speedy" as per user request
  // (React Query's isFetching is usually enough)
  const showSkeleton = loading || isFetching

  // useProjects now returns flattened data
  const projects = projectsData || []
  const metadata = projectsMetadata || {}


  const [submitting, setSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  // Edit State
  const [editOpen, setEditOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  // View State
  const [viewOpen, setViewOpen] = useState(false)
  const [viewingProject, setViewingProject] = useState(null)

  // Permissions
  const canView = usePermission('view_projects')
  const canCreate = usePermission('create_projects')
  const canEdit = usePermission('edit_projects')
  const canDelete = usePermission('delete_projects')

  // Delete State
  const [deletingId, setDeletingId] = useState(null)

  // Confirm State
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => { },
    variant: 'default' // 'default' | 'destructive'
  })

  // Full Description State
  const [showFullDesc, setShowFullDesc] = useState(false)

  // Removed manual fetch
  // useEffect(() => { fetchProjects() }, [])
  // async function fetchProjects() { ... }

  // --- Actions ---

  const handleCreate = async (formData) => {
    setSubmitting(true)
    try {
      // Transform logic (map flat form fields to nested schema)
      const payload = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        image_url: formData.imageUrl,
        image_path: formData.imagePath,
        // Inventory fields
        total_units: safeParseFloat(formData.totalUnits),
        unit_types: formData.unitTypes,
        price_range: { min: safeParseFloat(formData.priceMin), max: safeParseFloat(formData.priceMax) },
        project_status: formData.projectStatus || 'planning',
        is_draft: formData.isDraft || false,
        show_in_inventory: formData.showInInventory !== false,
        real_estate: {
          rera_number: formData.reraNumber,
          transaction: formData.transaction,
          property: {
            plot_area: safeParseFloat(formData.plotArea),
            category: formData.propertyCategory,
            use_case: formData.propertyUseCase,
            ...(formData.propertyCategory === 'residential' ? {
              residential: {
                bhk: formData.bhk,
                carpet_area: safeParseFloat(formData.carpetArea),
                built_up_area: safeParseFloat(formData.builtUpArea),
                super_built_up_area: safeParseFloat(formData.superBuiltUpArea)
              }
            } : {}),
            ...(formData.propertyCategory === 'commercial' ? {
              commercial: {
                area: safeParseFloat(formData.commercialArea),
                built_up_area: safeParseFloat(formData.commercialBuiltUpArea),
                ground_floor: formData.groundFloor
              }
            } : {}),
            ...(formData.propertyCategory === 'land' ? {
              land: {
                plot_area: safeParseFloat(formData.plotArea)
              }
            } : {})
          },
          location: {
            city: formData.locCity,
            locality: formData.locLocality,
            landmark: formData.locLandmark,
            state: formData.locState,
            country: formData.locCountry,
            pincode: formData.locPincode
          },
          pricing: { min: safeParseFloat(formData.priceMin), max: safeParseFloat(formData.priceMax) },
          media: { thumbnail: formData.imageUrl || null },
          description: formData.description || ''
        },
        possession_date: formData.possessionDate || null,
        completion_date: formData.completionDate || null
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await refetch() // Refresh list instead of manual state update
      setCreateOpen(false)
      toast.success("Project created successfully!")
      setShowCreateForm(false)
    } catch (err) {
      toast.error(err.message || "Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (formData) => {
    if (!editingProject) return
    setSubmitting(true)

    try {
      // Same transform logic as create (ensure consistency)
      const payload = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        image_url: formData.imageUrl,
        image_path: formData.imagePath,
        // Inventory fields
        total_units: safeParseFloat(formData.totalUnits),
        unit_types: formData.unitTypes,
        price_range: { min: safeParseFloat(formData.priceMin), max: safeParseFloat(formData.priceMax) },
        project_status: formData.projectStatus || 'planning',
        is_draft: formData.isDraft || false,
        show_in_inventory: formData.showInInventory !== false,
        real_estate: {
          rera_number: formData.reraNumber,
          transaction: formData.transaction,
          property: {
            plot_area: safeParseFloat(formData.plotArea),
            category: formData.propertyCategory,
            use_case: formData.propertyUseCase,
            ...(formData.propertyCategory === 'residential' ? {
              residential: {
                bhk: formData.bhk,
                carpet_area: safeParseFloat(formData.carpetArea),
                built_up_area: safeParseFloat(formData.builtUpArea),
                super_built_up_area: safeParseFloat(formData.superBuiltUpArea)
              }
            } : {}),
            ...(formData.propertyCategory === 'commercial' ? {
              commercial: {
                area: safeParseFloat(formData.commercialArea),
                built_up_area: safeParseFloat(formData.commercialBuiltUpArea),
                ground_floor: formData.groundFloor
              }
            } : {}),
            ...(formData.propertyCategory === 'land' ? {
              land: {
                plot_area: safeParseFloat(formData.plotArea)
              }
            } : {})
          },
          location: {
            city: formData.locCity,
            locality: formData.locLocality,
            landmark: formData.locLandmark,
            state: formData.locState,
            country: formData.locCountry,
            pincode: formData.locPincode
          },
          pricing: { min: safeParseFloat(formData.priceMin), max: safeParseFloat(formData.priceMax) },
          media: { thumbnail: formData.imageUrl || null },
          description: formData.description || ''
        },
        possession_date: formData.possessionDate || null,
        completion_date: formData.completionDate || null
      }

      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')

      await refetch() // Refresh list
      setEditOpen(false)
      toast.success("Project updated successfully!")
    } catch (err) {
      toast.error(err.message || "Update failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = async (project) => {
    const loadingToast = toast.loading("Calculating project impact...")
    try {
      const res = await fetch(`/api/projects/${project.id}/archive-preview`)
      const data = await res.json()
      toast.dismiss(loadingToast)

      if (!res.ok) throw new Error(data.error || "Failed to fetch counts")

      const { counts } = data
      const isBlocked = counts.running_campaigns > 0

      setConfirmDialog({
        open: true,
        title: 'Safe Project Archive?',
        variant: 'destructive',
        description: (
          <div className="space-y-4 pt-2">
            <p className="text-[13px] text-slate-600 leading-relaxed italic border-l-2 border-orange-400 pl-3">
              Archiving <strong>{project.name}</strong> will deactivate all associated business data. This action is safe and recoverable.
            </p>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-500">
                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200/60">
                  <Megaphone className="w-3 h-3 text-orange-500" />
                </div>
                <span>{counts.campaigns} Campaigns</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-500">
                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200/60">
                  <Users className="w-3 h-3 text-orange-500" />
                </div>
                <span>{counts.leads} Total Leads</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-500">
                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200/60">
                  <Store className="w-3 h-3 text-orange-500" />
                </div>
                <span>{counts.inventory} Unit Items</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-500">
                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200/60">
                  <PhoneCall className="w-3 h-3 text-orange-500" />
                </div>
                <span>{counts.calls} Call Records</span>
              </div>
            </div>

            {isBlocked && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-red-800 leading-none">Archiving Blocked</p>
                  <p className="text-[10px] text-red-600 leading-tight">
                    This project has {counts.running_campaigns} running campaign(s). Pause or end them manually to enable project archiving.
                  </p>
                </div>
              </div>
            )}

            {!isBlocked && (
              <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl flex gap-3 items-start">
                <div className="p-1 bg-amber-100 rounded-full mt-0.5">
                  <History className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <p className="text-[10px] text-amber-700 leading-tight italic">
                  Associated campaigns, leads, and inventory will be archived automatically. Performance metrics are preserved for historical record.
                </p>
              </div>
            )}
          </div>
        ),
        onConfirm: async () => {
          if (isBlocked) {
            toast.error("Blocked: Running campaigns must be stopped first")
            return
          }

          setDeletingId(project.id)
          try {
            const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Archive failed')

            await refetch()
            toast.success(data.message || "Project and its data archived safely")
          } catch (err) {
            toast.error(err.message || 'Error archiving project')
          } finally {
            setDeletingId(null)
          }
        }
      })
    } catch (e) {
      toast.dismiss(loadingToast)
      toast.error(e.message || "Error calculating archive impact")
    }
  }

  const handleRestore = (project) => {
    setConfirmDialog({
      open: true,
      title: 'Restore Project?',
      description: `Would you like to restore "${project.name}" back to the active list? It will be visible to your team and in the inventory again.`,
      variant: 'default',
      onConfirm: async () => {
        setDeletingId(project.id) // Reuse deletingId for loading state
        try {
          const res = await fetch(`/api/projects/${project.id}/restore`, { method: 'POST' })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Restore failed')

          await refetch()
          toast.success(data.message || "Project restored successfully")
        } catch (err) {
          toast.error(err.message || 'Error restoring project')
        } finally {
          setDeletingId(null)
          setConfirmDialog(p => ({ ...p, open: false }))
        }
      }
    })
  }

  const handleToggleVisibility = (project) => {
    const newVisibility = !project.public_visibility
    setConfirmDialog({
      open: true,
      title: `${newVisibility ? 'Show' : 'Hide'} Project?`,
      description: `Would you like to make "${project.name}" ${newVisibility ? 'publicly visible' : 'hidden from public leads'}?`,
      variant: 'default',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_visibility: newVisibility })
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Failed to update visibility')
          }

          await refetch()
          toast.success(`Project is now ${newVisibility ? 'Public' : 'Hidden'}`)
        } catch (err) {
          toast.error(err.message)
        }
      }
    })
  }


  return (
    <div className="min-h-screen bg-muted/5">
      {/* Header */}
      <div className="p-6 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Projects
          </h1>

          <PermissionTooltip
            hasPermission={canCreate}
            message="You need 'Create Projects' permission to add new projects. Contact your administrator."
          >
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={!canCreate}
              className="w-auto"
            >
              {!canCreate && <Lock className="w-3.5 h-3.5 mr-2" />}
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Button>
          </PermissionTooltip>
        </div>

        {/* Filter Card */}
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search projects..."
                  className="w-full"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1) // Reset to page 1 on search
                  }}
                />
              </div>

              {/* View Toggle */}
              <div className="bg-muted/50 p-1 rounded-lg flex items-center gap-1 border border-border/50 shrink-0">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`h-7 w-7 p-0 ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`h-7 w-7 p-0 ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                className="shrink-0"
                disabled={isFetching}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-6 space-y-6">


        {/* Projects Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showSkeleton ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                  <Skeleton className="h-48 w-full bg-slate-200" />
                  <div className="p-5 space-y-4">
                    <Skeleton className="h-6 w-3/4 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-2/3 rounded" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="flex justify-between pt-4">
                      <Skeleton className="h-9 w-24 rounded-md" />
                      <Skeleton className="h-9 w-24 rounded-md" />
                    </div>
                  </div>
                </div>
              ))
            ) : projects.length === 0 ? (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No projects found</p>
                <p className="mt-1 text-sm">Create your first project to get started</p>
              </div>
            ) : (
              projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={(p) => {
                    setEditingProject(p)
                    setEditOpen(true)
                  }}
                  onDelete={handleArchive}
                  isArchived={!!project.archived_at}
                  onRestore={handleRestore}
                  onView={(p) => {
                    setViewingProject(p)
                    setViewOpen(true)
                  }}
                  onStartCampaign={(p) => {
                    router.push(`/dashboard/admin/crm/campaigns?project_id=${p.id}`)
                  }}
                  onToggleVisibility={handleToggleVisibility}
                  deleting={deletingId === project.id}
                />
              ))
            )}
          </div>
        ) : (
          <div>
            {showSkeleton ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-16 rounded-md" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48 rounded" />
                        <Skeleton className="h-3 w-32 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-4 w-32 rounded" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ProjectList
                projects={projects}
                loading={loading}
                onEdit={(p) => {
                  setEditingProject(p)
                  setEditOpen(true)
                }}
                onDelete={handleArchive}
                isArchived={false} // List will handle mixing if we pass data, but we need to check if List handles it per row
                onRestore={handleRestore}
                onView={(p) => {
                  setViewingProject(p)
                  setViewOpen(true)
                }}
                onStartCampaign={(p) => {
                  router.push(`/dashboard/admin/crm/campaigns?project_id=${p.id}`)
                }}
                onToggleVisibility={handleToggleVisibility}
                deletingId={deletingId}
                page={page}
                onPageChange={setPage}
                hasMore={metadata.hasMore}
                isLoadingMore={isPlaceholderData}
              />
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Create New Project
            </DialogTitle>
            <DialogDescription>Fill in the details to create a new real estate project</DialogDescription>
          </DialogHeader>
          <ProjectForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            isSubmitting={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <ProjectForm
              initialData={editingProject}
              onSubmit={handleUpdate}
              onCancel={() => setEditOpen(false)}
              isSubmitting={submitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Project Details Modal */}
      <Dialog open={!!viewingProject} onOpenChange={() => { setViewingProject(null); setShowFullDesc(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
          </DialogHeader>
          {viewingProject && (
            <div className="mt-4">
              <div className="space-y-6">
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-sm relative group">
                  {viewingProject.image_url ? (
                    <img
                      src={viewingProject.image_url}
                      alt={viewingProject.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Building2 className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-white text-xl font-bold">{viewingProject.name}</h2>
                        {(viewingProject.is_draft || viewingProject.project_status === 'draft') ? (
                          <Badge variant="secondary" className="bg-orange-600 text-white border-0">
                            Draft
                          </Badge>
                        ) : viewingProject.project_status && (
                          <Badge
                            variant={
                              viewingProject.project_status === 'ready_to_move' ? 'default' :
                                viewingProject.project_status === 'under_construction' ? 'secondary' :
                                  viewingProject.project_status === 'completed' ? 'outline' : 'secondary'
                            }
                            className={
                              viewingProject.project_status === 'ready_to_move' ? 'bg-green-600 text-white' :
                                viewingProject.project_status === 'under_construction' ? 'bg-yellow-600 text-white' :
                                  viewingProject.project_status === 'completed' ? 'bg-gray-600 text-white' : 'bg-blue-600 text-white'
                            }
                          >
                            {viewingProject.project_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        )}
                        {viewingProject.project_type && (
                          <Badge variant="outline" className="bg-white/20 text-white border-white/40">
                            {viewingProject.project_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-white/90 text-sm">{viewingProject.address}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {viewingProject.description && (
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-2">About This Project</h3>
                    <div className="text-slate-600 text-sm leading-relaxed">
                      {viewingProject.description.length > 300 && !showFullDesc ? (
                        <>
                          {viewingProject.description.substring(0, 300)}...
                          <button
                            onClick={() => setShowFullDesc(true)}
                            className="text-primary font-medium hover:underline ml-1 inline-flex items-center gap-0.5"
                          >
                            Read more <ChevronDown className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          {viewingProject.description}
                          {viewingProject.description.length > 300 && (
                            <button
                              onClick={() => setShowFullDesc(false)}
                              className="text-primary font-medium hover:underline ml-2 inline-flex items-center gap-0.5"
                            >
                              Show less <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {(() => {
                  let meta = {}
                  try {
                    meta = typeof viewingProject.metadata === 'string'
                      ? JSON.parse(viewingProject.metadata)
                      : viewingProject.metadata || {}
                  } catch (e) {
                    console.error("Failed to parse metadata", e)
                  }
                  const re = meta.real_estate || {}
                  const prop = re.property || {}
                  const loc = re.location || {}
                  const price = re.pricing || {}
                  const res = prop.residential || {}
                  const comm = prop.commercial || {}
                  const land = prop.land || {}
                  const amenities = meta.amenities || []

                  // Use metadata-based pricing as fallback
                  const priceRange = price || {}

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Inventory Stats Card */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 space-y-3">
                        <h3 className="font-semibold text-slate-900 border-b border-blue-200 pb-2 mb-2">Inventory Overview</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-slate-500 text-xs">Total Units</p>
                            <p className="font-bold text-2xl text-slate-900">{viewingProject.total_units || 0}</p>
                          </div>
                          <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-slate-500 text-xs">Available</p>
                            <p className="font-bold text-2xl text-green-600">{viewingProject.available_units || 0}</p>
                          </div>
                          <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-slate-500 text-xs">Sold</p>
                            <p className="font-bold text-2xl text-red-600">{viewingProject.sold_units || 0}</p>
                          </div>
                          <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-slate-500 text-xs">Reserved</p>
                            <p className="font-bold text-2xl text-yellow-600">{viewingProject.reserved_units || 0}</p>
                          </div>
                        </div>
                        {viewingProject.total_units > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                              <span>Occupancy</span>
                              <span>{Math.round(((viewingProject.sold_units + viewingProject.reserved_units) / viewingProject.total_units) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div className="h-full flex">
                                <div
                                  className="bg-red-500"
                                  style={{ width: `${(viewingProject.sold_units / viewingProject.total_units) * 100}%` }}
                                />
                                <div
                                  className="bg-yellow-500"
                                  style={{ width: `${(viewingProject.reserved_units / viewingProject.total_units) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Property Highlights */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                        <h3 className="font-semibold text-slate-900 border-b pb-2 mb-2">Property Highlights</h3>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Transaction</p>
                            <p className="font-medium text-slate-900 capitalize">{re.transaction || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Category</p>
                            <p className="font-medium text-slate-900 capitalize">
                              {[prop.category, prop.use_case].filter(Boolean).join(' - ') || 'N/A'}
                            </p>
                          </div>
                          {re.rera_number && (
                            <div className="col-span-2">
                              <p className="text-slate-500">RERA Number</p>
                              <p className="font-medium text-slate-900">{re.rera_number}</p>
                            </div>
                          )}
                          {(viewingProject.min_price || priceRange?.min) ? (
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between col-span-2">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-emerald-200 shadow-sm">
                                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest leading-none mb-1">Investment Range</p>
                                  <p className="text-xl font-black text-slate-900 leading-tight">
                                    {`₹ ${formatPrice(viewingProject.min_price || priceRange.min)}`}
                                    {(viewingProject.max_price || priceRange.max) && (viewingProject.max_price || priceRange.max) !== (viewingProject.min_price || priceRange.min) ? (
                                      <>
                                        <span className="text-slate-400 mx-2 text-sm font-normal">to</span>
                                        {`₹ ${formatPrice(viewingProject.max_price || priceRange.max)}`}
                                      </>
                                    ) : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {/* Dates */}
                          {(['planning', 'under_construction'].includes(viewingProject.project_status) || viewingProject.is_draft || viewingProject.project_status === 'draft') && (viewingProject.possession_date || re.possession_date) && (
                            <div className="col-span-2">
                              <p className="text-slate-500">Expected Possession</p>
                              <p className="font-medium text-slate-900">{new Date(viewingProject.possession_date || re.possession_date).toLocaleDateString()}</p>
                            </div>
                          )}
                          {['ready_to_move', 'completed'].includes(viewingProject.project_status) && (viewingProject.completion_date || re.completion_date) && (
                            <div className="col-span-2">
                              <p className="text-slate-500">Completion Date</p>
                              <p className="font-medium text-slate-900">{new Date(viewingProject.completion_date || re.completion_date).toLocaleDateString()}</p>
                            </div>
                          )}

                          {/* Unit Highlights */}
                          {res.carpet_area > 0 && (
                            <div>
                              <p className="text-slate-500">Main Area</p>
                              <p className="font-medium text-slate-900">{res.carpet_area} sq.ft</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location Card */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                        <h3 className="font-semibold text-slate-900 border-b pb-2 mb-2">Location Details</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">City:</span>
                            <span className="font-medium text-slate-900">{loc.city || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Locality:</span>
                            <span className="font-medium text-slate-900">{loc.locality || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Landmark:</span>
                            <span className="font-medium text-slate-900">{loc.landmark || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Unit Types Breakdown */}
                      {viewingProject.unit_types && viewingProject.unit_types.length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                          <h3 className="font-semibold text-slate-900 border-b pb-2 mb-2">Unit Configuration</h3>
                          <div className="space-y-2">
                            {viewingProject.unit_types.map((unit, idx) => (
                              <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white rounded-md text-sm border border-slate-100">
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900">{unit.configuration || unit.property_type}</p>
                                  {unit.carpet_area && (
                                    <p className="text-xs text-slate-500">{unit.carpet_area} sq.ft</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-slate-900">{unit.count} units</p>
                                  {unit.price && (
                                    <p className="text-xs text-green-600 font-medium">{formatCurrency(unit.price)}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Specifications section removed */}

                      {/* Amenities */}
                      {amenities && amenities.length > 0 && (
                        <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                          <h3 className="font-semibold text-slate-900 border-b pb-2 mb-2">Amenities</h3>
                          <div className="flex flex-wrap gap-2">
                            {amenities.map((amenity, idx) => (
                              <Badge key={idx} variant="outline" className="bg-white">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Universal Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, open: false }));
              }}
              className={confirmDialog.variant === 'destructive' ? 'bg-orange-600 hover:bg-orange-700 text-white border-0' : ''}
            >
              {confirmDialog.variant === 'destructive' ? 'Archive' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
