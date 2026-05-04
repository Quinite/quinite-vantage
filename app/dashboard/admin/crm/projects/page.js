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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Building2, Plus, Sparkles, Loader2, Briefcase, LayoutGrid, List, X, Lock, RefreshCw, ChevronDown, ChevronUp, Archive, History, Megaphone, Users, PhoneCall, AlertCircle, Store, IndianRupee, MapPin, Calendar, CheckCircle2, Layout, Layers, Info, Star, PropertyCategoryIcon, Home, LandPlot, ArrowUpRight, ConciergeBell, ShoppingBag, Factory, Zap, FileText, Download, Copy } from 'lucide-react'

function WhatsAppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import dynamic from 'next/dynamic'
import ProjectCard from '@/components/projects/ProjectCard'
import ProjectList from '@/components/projects/ProjectList'
import { usePermission } from '@/contexts/PermissionContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'
import { useProjects } from '@/hooks/useProjects'
import { formatCurrency } from '@/lib/utils/currency'
import { PROJECT_AMENITY_MAP } from '@/lib/amenities-constants'
import { DynamicIcon } from '@/components/amenities/DynamicIcon'
import { cn } from '@/lib/utils'
import { useDynamicTitle } from '@/hooks/useDynamicTitle'

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

const getIcon = (type) => {
  const icons = {
    'Apartment': Building2,
    'Villa': Home,
    'Villa Bungalow': Home,
    'Penthouse': ConciergeBell,
    'Office': Briefcase,
    'Retail': ShoppingBag,
    'Showroom': Store,
    'Industrial': Factory,
    'Plot': Home,
    'Land': Building2
  }
  return icons[type] || Building2
}

export default function ProjectsPage() {
  useDynamicTitle('CRM Projects')
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
  const { isExpired: subExpired } = useSubscription()

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
      const payload = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        image_url: formData.imageUrl,
        image_path: formData.imagePath,
        rera_number: formData.reraNumber || null,
        // Location (flat)
        city:     formData.locCity     || null,
        state:    formData.locState    || null,
        country:  formData.locCountry  || 'India',
        pincode:  formData.locPincode  || null,
        locality: formData.locLocality || null,
        landmark: formData.locLandmark || null,
        // Inventory
        total_units:       safeParseFloat(formData.totalUnits),
        available_units:   safeParseFloat(formData.availableUnits),
        sold_units:        safeParseFloat(formData.soldUnits),
        reserved_units:    safeParseFloat(formData.reservedUnits),
        unit_types:        formData.unitTypes,
        project_status:    formData.projectStatus || 'planning',
        is_draft:          formData.isDraft || false,
        show_in_inventory: formData.showInInventory !== false,
        possession_date:   formData.possessionDate || null,
        completion_date:   formData.completionDate || null,
        amenities:         Array.isArray(formData.amenities) ? formData.amenities : [],
        brochure_url:      formData.brochureUrl || null,
        brochure_path:     formData.brochurePath || null,
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
      const payload = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        image_url: formData.imageUrl,
        image_path: formData.imagePath,
        rera_number: formData.reraNumber || null,
        // Location (flat)
        city:     formData.locCity     || null,
        state:    formData.locState    || null,
        country:  formData.locCountry  || 'India',
        pincode:  formData.locPincode  || null,
        locality: formData.locLocality || null,
        landmark: formData.locLandmark || null,
        // Inventory
        total_units:       safeParseFloat(formData.totalUnits),
        available_units:   safeParseFloat(formData.availableUnits),
        sold_units:        safeParseFloat(formData.soldUnits),
        reserved_units:    safeParseFloat(formData.reservedUnits),
        unit_types:        formData.unitTypes,
        project_status:    formData.projectStatus || 'planning',
        is_draft:          formData.isDraft || false,
        show_in_inventory: formData.showInInventory !== false,
        possession_date:   formData.possessionDate || null,
        completion_date:   formData.completionDate || null,
        amenities:         Array.isArray(formData.amenities) ? formData.amenities : [],
        brochure_url:      formData.brochureUrl || null,
        brochure_path:     formData.brochurePath || null,
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
      <div className="px-6 py-5 border-b border-border bg-background">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
            {!loading && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Search projects…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
                className="h-10 bg-muted/40 border-border/60 focus:bg-background w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* View toggle */}
              <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg border border-border/50 shrink-0">
                {[['grid', LayoutGrid], ['list', List]].map(([mode, Icon]) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`h-9 w-9 flex items-center justify-center rounded-md transition-all ${
                      viewMode === mode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>

              <PermissionTooltip
                hasPermission={canCreate && !subExpired}
                message={subExpired ? 'Subscription expired. Renew to create projects.' : "You need 'Create Projects' permission to add new projects. Contact your administrator."}
              >
                <Button
                  onClick={() => setCreateOpen(true)}
                  disabled={!canCreate || subExpired}
                  className="h-10 flex-1 sm:flex-initial gap-2 px-4"
                >
                  {(!canCreate || subExpired) ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span className="whitespace-nowrap">New Project</span>
                </Button>
              </PermissionTooltip>
            </div>
          </div>
        </div>
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
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
                <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                  <Building2 className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-foreground">No projects found</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {searchTerm ? `No results for "${searchTerm}"` : 'Create your first project to get started'}
                </p>
                {!searchTerm && canCreate && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> New Project
                  </Button>
                )}
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
                        {viewingProject.rera_number && (
                          <Badge variant="outline" className="bg-white/20 text-white border-white/40 uppercase">
                            RERA: {viewingProject.rera_number}
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
                  return (
                    <div className="space-y-6">
                      {/* Top Summary Bar */}
                      {viewingProject.rera_number && (
                        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 flex flex-col justify-center">
                          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1">RERA Number</p>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-amber-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                            </div>
                            <p className="text-base font-bold text-slate-900 uppercase">
                              {viewingProject.rera_number}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Elegant Inventory Card */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                              <Layout className="w-4 h-4 text-blue-500" />
                                Inventory Status
                            </h3>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] font-bold uppercase tracking-wider gap-1 pt-0 pb-0 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100/50"
                                onClick={() => router.push(`/dashboard/admin/inventory/projects/${viewingProject.id}`)}
                              >
                                Manage <ArrowUpRight className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Available</span>
                              <span className="text-xl font-black text-emerald-700">{viewingProject.available_units || 0}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Sold Out</span>
                              <span className="text-xl font-black text-red-700">{viewingProject.sold_units || 0}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Reserved</span>
                              <span className="text-xl font-black text-amber-700">{viewingProject.reserved_units || 0}</span>
                            </div>
                          </div>

                          {viewingProject.total_units > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-[11px] font-bold mb-1.5">
                                <span className="text-slate-500">Sales Progress</span>
                                <span className="text-blue-600">{Math.round(((viewingProject.sold_units + viewingProject.reserved_units) / viewingProject.total_units) * 100)}% Occupied</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                                <div className="h-full flex rounded-full overflow-hidden">
                                  <div
                                    className="bg-red-500 shadow-inner"
                                    style={{ width: `${(viewingProject.sold_units / viewingProject.total_units) * 100}%` }}
                                  />
                                  <div
                                    className="bg-amber-400 shadow-inner"
                                    style={{ width: `${(viewingProject.reserved_units / viewingProject.total_units) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Financial Card */}
                        <div className="space-y-4">
                          {viewingProject.min_price ? (
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-200 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                                <IndianRupee className="w-24 h-24" />
                              </div>
                              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-[0.2em] mb-3 relative z-10">Starting Investment</p>
                              <div className="relative z-10 flex flex-col">
                                <p className="text-3xl font-black text-white tracking-tight leading-none mb-1">
                                  ₹ {formatPrice(viewingProject.min_price)}
                                </p>
                                {viewingProject.max_price && viewingProject.max_price !== viewingProject.min_price && (
                                  <p className="text-emerald-100 text-sm font-medium mt-1">
                                    Up to ₹ {formatPrice(viewingProject.max_price)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                              <p className="text-slate-500 font-medium italic">Pricing not defined</p>
                            </div>
                          )}

                          {/* Date Badges */}
                          <div className="flex gap-3">
                            {viewingProject.possession_date && (
                              <div className="flex-1 bg-white border border-slate-200 p-3 rounded-2xl flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-xl">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase">Possession</p>
                                  <p className="text-xs font-bold text-slate-900">{new Date(viewingProject.possession_date).toLocaleDateString()}</p>
                                </div>
                              </div>
                            )}
                            {viewingProject.completion_date && (
                              <div className="flex-1 bg-white border border-slate-200 p-3 rounded-2xl flex items-center gap-3">
                                <div className="p-2 bg-slate-50 rounded-xl">
                                  <CheckCircle2 className="w-4 h-4 text-slate-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase">Completion</p>
                                  <p className="text-xs font-bold text-slate-900">{new Date(viewingProject.completion_date).toLocaleDateString()}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Full Width Location Details */}
                        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-red-500" />
                              Location
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="space-y-1">
                               <p className="text-[10px] text-slate-500 font-bold uppercase">City / Region</p>
                               <p className="text-sm font-bold text-slate-900">{viewingProject.city || 'N/A'}</p>
                             </div>
                             <div className="space-y-1">
                               <p className="text-[10px] text-slate-500 font-bold uppercase">Locality / Sector</p>
                               <p className="text-sm font-bold text-slate-900">{viewingProject.locality || 'N/A'}</p>
                             </div>
                             <div className="space-y-1">
                               <p className="text-[10px] text-slate-500 font-bold uppercase">Landmark</p>
                               <p className="text-sm font-bold text-slate-900 italic text-slate-600">
                                 {viewingProject.landmark ? `Near ${viewingProject.landmark}` : 'No landmark added'}
                               </p>
                             </div>
                          </div>
                          {viewingProject.address && (
                            <div className="pt-3 border-t border-slate-200/50 mt-2">
                               <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Full Address</p>
                               <p className="text-xs text-slate-600 leading-relaxed">{viewingProject.address}</p>
                            </div>
                          )}
                        </div>

                        {/* Unit Breakdown Improved */}
                        {viewingProject.unit_configs?.length > 0 && (
                          <div className="md:col-span-2 space-y-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 pl-1">
                              <Layers className="w-4 h-4 text-blue-500" />
                              Unit Configurations
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {viewingProject.unit_configs.map((config, idx) => {
                                const Icon = getIcon(config.property_type || config.type)
                                return (
                                  <div key={idx} className="border border-slate-200 rounded-2xl p-3.5 bg-white hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                                    <div className="mb-4 flex gap-3">
                                      <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                        <Icon className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                            {config.config_name || config.property_type || config.type || 'Standard'}
                                          </h4>
                                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div className="flex items-center bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5 cursor-default transition-colors hover:bg-indigo-100">
                                                    <span className="text-[10px] font-bold text-indigo-700">{config.count || 0} Units</span>
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="text-xs">Project Units</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                            <Badge variant="outline" className="text-[8px] bg-slate-50 uppercase tracking-widest font-bold px-1.5 py-0">
                                              {config.transaction_type || 'Sell'}
                                            </Badge>
                                          </div>
                                        </div>
                                        <p className="text-[10px] font-semibold text-slate-400 capitalize tracking-wide truncate">
                                          {(config.category || 'Residential')} • {(config.property_type || config.type || 'Apartment')}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      {config.carpet_area > 0 && (
                                        <div className="flex justify-between items-center px-0.5">
                                          <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Carpet</span>
                                          <span className="font-bold text-[10px] text-slate-700">{config.carpet_area} sqft</span>
                                        </div>
                                      )}
                                      {(config.built_up_area > 0 || config.builtup_area > 0) && (
                                        <div className="flex justify-between items-center px-0.5">
                                          <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Built-up</span>
                                          <span className="font-bold text-[10px] text-slate-700">{config.built_up_area || config.builtup_area} sqft</span>
                                        </div>
                                      )}
                                      {config.plot_area > 0 && (
                                        <div className="flex justify-between items-center px-0.5">
                                          <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Plot Area</span>
                                          <span className="font-bold text-[10px] text-slate-700">{config.plot_area} sqft</span>
                                        </div>
                                      )}

                                      {(config.base_price > 0 || config.price > 0) && (
                                        <div className="pt-2 mt-2 border-t border-slate-200">
                                          <div className="flex justify-between items-center">
                                            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-widest">Base Price</span>
                                            <span className="font-black text-blue-600 text-[10px]">₹ {formatPrice(config.base_price || config.price)}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Amenities */}
                        {viewingProject.amenities && viewingProject.amenities.length > 0 && (
                          <div className="md:col-span-2 bg-slate-900 p-6 rounded-3xl text-white space-y-4 shadow-xl shadow-slate-200">
                             <div className="flex items-center gap-2 mb-2">
                               <div className="p-2 bg-slate-800 rounded-xl">
                                 <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                               </div>
                               <h3 className="font-bold text-base">Society Amenities</h3>
                               <span className="ml-auto text-xs text-slate-400">{viewingProject.amenities.length} amenities</span>
                             </div>
                             <div className="flex flex-wrap gap-2.5">
                               {viewingProject.amenities.map((id, idx) => {
                                 const amenity = PROJECT_AMENITY_MAP[id]
                                 if (!amenity) return null
                                 return (
                                   <div key={idx} className="bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 hover:bg-slate-700 transition-colors">
                                     <DynamicIcon name={amenity.icon} className="w-3.5 h-3.5 text-amber-400" />
                                     {amenity.label}
                                   </div>
                                 )
                               })}
                             </div>
                          </div>
                        )}

                        {/* Brochure */}
                        {viewingProject.brochure_url && (
                          <div className="md:col-span-2">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-6 space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                  <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-900">Project Brochure</h3>
                                  <p className="text-xs text-slate-500">Share with leads to boost engagement</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2.5">
                                <a
                                  href={viewingProject.brochure_url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
                                >
                                  <Download className="w-4 h-4 text-blue-500" />
                                  Download
                                </a>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(viewingProject.brochure_url)
                                    toast.success('Brochure link copied!')
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
                                >
                                  <Copy className="w-4 h-4 text-slate-500" />
                                  Copy Link
                                </button>
                                <button
                                  onClick={() => {
                                    const msg = encodeURIComponent(`Hi! Please find the brochure for *${viewingProject.name}*:\n${viewingProject.brochure_url}`)
                                    window.open(`https://wa.me/?text=${msg}`, '_blank')
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                                >
                                  <WhatsAppIcon className="w-4 h-4" />
                                  Share on WhatsApp
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
