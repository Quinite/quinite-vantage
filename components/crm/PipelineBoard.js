'use client'

import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { PipelineColumn } from './PipelineColumn'
import { LeadCard } from './LeadCard'
import { StageSettingsSheet } from './StageSettingsSheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import LeadForm from './LeadForm'
import BookSiteVisitDialog from './site-visits/BookSiteVisitDialog'
import { usePermission } from '@/contexts/PermissionContext'
import { useLeads } from '@/hooks/useLeads'
import { usePipelines, useUsers } from '@/hooks/usePipelines'
import { useProjects } from '@/hooks/useProjects'
import { toast } from 'sonner'
import { Plus, Filter, X } from 'lucide-react'
import { useAllSiteVisits } from '@/hooks/useSiteVisits'

const PipelineBoard = forwardRef(({ projectId, campaignId, externalFilters = {}, showFilters = true }, ref) => {
    const { data: pipelines = [], isLoading: pipesLoading, refetch: refetchPipelines } = usePipelines()
    const { data: leadsResponse, isLoading: leadsLoading, refetch: refetchLeads } = useLeads({
        projectId,
        campaign_id: campaignId,
        ...externalFilters,
    })
    const { data: projectsData } = useProjects({ status: 'active' })
    const { data: users = [] } = useUsers()

    const leads = leadsResponse?.leads || []
    const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.projects || [])
    const loading = pipesLoading || leadsLoading
    const activePipeline = pipelines[0] ?? null

    // Optimistic stage overrides: Map<leadId, stageId>
    const [optimisticMoves, setOptimisticMoves] = useState(new Map())
    const rollbackRef = useRef(null)

    // Local UI state
    const [activeDragItem, setActiveDragItem] = useState(null)
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [targetStageId, setTargetStageId] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [settingsStage, setSettingsStage] = useState(null)
    const [postMoveDialog, setPostMoveDialog] = useState(null) // { type: 'book'|'outcome', lead, visit? }

    // Filters
    const [filterAgent, setFilterAgent] = useState('__all__')
    const [filterProject, setFilterProject] = useState('__all__')
    const [filterStaleOnly, setFilterStaleOnly] = useState(false)

    const boardRef = useRef(null)
    const dragScroll = useRef({ isDown: false, startX: 0, scrollLeft: 0 })

    const onMouseDown = useCallback((e) => {
        // Don't hijack clicks on interactive elements or when a dnd drag is active
        if (e.target.closest('button, a, input, [data-radix-collection-item]')) return
        const el = boardRef.current
        if (!el) return
        dragScroll.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
        el.style.cursor = 'grabbing'
        el.style.userSelect = 'none'
    }, [])

    const onMouseLeaveOrUp = useCallback(() => {
        if (!dragScroll.current.isDown) return
        dragScroll.current.isDown = false
        const el = boardRef.current
        if (el) { el.style.cursor = ''; el.style.userSelect = '' }
    }, [])

    const onMouseMove = useCallback((e) => {
        if (!dragScroll.current.isDown) return
        e.preventDefault()
        const el = boardRef.current
        if (!el) return
        const x = e.pageX - el.offsetLeft
        const walk = (x - dragScroll.current.startX) * 1.5
        el.scrollLeft = dragScroll.current.scrollLeft - walk
    }, [])

    const canManageDeals = usePermission('manage_deals')
    const canManageSettings = usePermission('manage_crm_settings')
    const router = useRouter()

    useImperativeHandle(ref, () => ({ refresh: refetchLeads }))

    const { data: orgVisits = [] } = useAllSiteVisits({
        from: new Date().toISOString(),
        to:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const visitByLead = useMemo(() => {
        const map = new Map()
        orgVisits.forEach(v => {
            if (v.status === 'scheduled' && !map.has(v.lead_id)) map.set(v.lead_id, v)
        })
        return map
    }, [orgVisits])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // Merge optimistic overrides into leads
    const displayLeads = useMemo(() => {
        if (!optimisticMoves.size) return leads
        return leads.map(l => {
            const override = optimisticMoves.get(l.id)
            return override !== undefined ? { ...l, stage_id: override } : l
        })
    }, [leads, optimisticMoves])

    // Apply local filters
    const filteredLeads = useMemo(() => {
        let result = displayLeads
        if (filterAgent && filterAgent !== '__all__') result = result.filter(l => l.assigned_to === filterAgent)
        if (filterProject && filterProject !== '__all__') result = result.filter(l => l.project_id === filterProject)
        if (filterStaleOnly) result = result.filter(l => {
            if (!l.stage?.stale_days) return false
            return l.days_in_current_stage >= l.stage.stale_days
        })
        return result
    }, [displayLeads, filterAgent, filterProject, filterStaleOnly])

    const hasFilters = (filterAgent && filterAgent !== '__all__') || (filterProject && filterProject !== '__all__') || filterStaleOnly

    const handleDragStart = ({ active }) => {
        if (!canManageDeals) return
        const lead = leads.find(l => l.id === active.id)
        if (lead) setActiveDragItem(lead)
    }

    const handleDragEnd = ({ active, over }) => {
        setActiveDragItem(null)
        if (!over || !canManageDeals) return

        const stages = activePipeline?.stages || []
        let newStageId = null

        if (stages.find(s => s.id === over.id)) {
            newStageId = over.id
        } else {
            const overLead = leads.find(l => l.id === over.id)
            if (overLead) newStageId = overLead.stage_id
        }

        if (!newStageId) return

        moveLead(active.id, newStageId)
    }

    const moveLead = useCallback(async (leadId, newStageId) => {
        const lead = leads.find(l => l.id === leadId)
        if (!lead || lead.stage_id === newStageId) return

        const previousStageId = lead.stage_id

        // Optimistic update — instant visual feedback
        setOptimisticMoves(prev => new Map(prev).set(leadId, newStageId))
        rollbackRef.current = () => setOptimisticMoves(prev => {
            const next = new Map(prev)
            next.set(leadId, previousStageId)
            return next
        })

        try {
            // Fire all three requests in parallel — PUT, automations, and site-visits
            const [res, automationsData, visitsData] = await Promise.all([
                fetch(`/api/leads/${leadId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stageId: newStageId }),
                }),
                activePipeline?.id
                    ? fetch(`/api/pipeline/automations?pipeline_id=${activePipeline.id}`)
                        .then(r => r.ok ? r.json() : { automations: [] })
                        .catch(() => ({ automations: [] }))
                    : Promise.resolve({ automations: [] }),
                fetch(`/api/leads/${leadId}/site-visits`)
                    .then(r => r.ok ? r.json() : { visits: [] })
                    .catch(() => ({ visits: [] })),
            ])

            if (!res.ok) throw new Error('Update failed')
            // Await refetch before clearing optimistic override to avoid flicker
            await Promise.all([refetchLeads(), refetchPipelines()])
            setOptimisticMoves(prev => { const next = new Map(prev); next.delete(leadId); return next })

            // Check for post-move automation prompts
            const { automations = [] } = automationsData
            const stageEnterRules = automations.filter(a =>
                a.is_active &&
                a.trigger_type === 'stage_enter' &&
                (a.trigger_config?.stage_id === newStageId || !a.trigger_config?.stage_id)
            )
            const hasBookForm = stageEnterRules.some(a => a.action_type === 'show_site_visit_form')

            if (hasBookForm) {
                const { visits = [] } = visitsData
                const scheduledVisit = visits.find(v => v.status === 'scheduled')
                if (!scheduledVisit) {
                    setPostMoveDialog({ type: 'book', lead, previousStageId })
                }
            }
        } catch {
            rollbackRef.current?.()
            toast.error('Failed to move lead')
        }
    }, [leads, refetchLeads, activePipeline])

    const handleStageUpdate = useCallback(async (stageId, updates) => {
        try {
            const res = await fetch('/api/pipeline/stages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stages: [{ id: stageId, ...updates }] }),
            })
            if (!res.ok) throw new Error('Stage update failed')
            refetchPipelines()
        } catch {
            toast.error('Failed to update stage')
        }
    }, [refetchPipelines])

    const handleAddStage = async () => {
        if (!activePipeline) return
        const name = prompt('Stage name:')
        if (!name?.trim()) return
        try {
            const maxOrder = Math.max(...(activePipeline.stages.map(s => s.order_index) || [0]))
            await fetch('/api/pipeline/stages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pipeline_id: activePipeline.id, name: name.trim(), order_index: maxOrder + 1 }),
            })
            refetchPipelines()
        } catch {
            toast.error('Failed to add stage')
        }
    }

    const handleAddLead = (stageId) => {
        setTargetStageId(stageId)
        setAddDialogOpen(true)
    }

    const handleCreateLead = async (formData) => {
        setSubmitting(true)
        try {
            if (!formData.projectId && projectId) formData.projectId = projectId
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Failed to create lead')
            toast.success('Lead created')
            await Promise.all([refetchLeads(), refetchPipelines()])
            setAddDialogOpen(false)
        } catch (error) {
            toast.error(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    // Loading skeleton
    if (loading && !leads.length) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-2 min-h-[calc(100vh-320px)]">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex-shrink-0 w-[300px] space-y-3">
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-36 w-full rounded-xl" />
                        <Skeleton className="h-28 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        )
    }

    if (!activePipeline) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl bg-muted/20">
                <p className="text-base font-medium text-foreground">No pipeline configured</p>
                <p className="text-sm text-muted-foreground mt-1">Set up a pipeline in org settings to get started.</p>
            </div>
        )
    }

    return (
        <>
            {/* Filter bar */}
            {showFilters && <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Select value={filterAgent} onValueChange={setFilterAgent}>
                    <SelectTrigger className="h-8 w-40 text-xs bg-card">
                        <SelectValue placeholder="All agents" />
                    </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="__all__">All agents</SelectItem>
                        {Array.isArray(users) && users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {!projectId && (
                    <Select value={filterProject} onValueChange={setFilterProject}>
                        <SelectTrigger className="h-8 w-40 text-xs bg-card">
                            <SelectValue placeholder="All projects" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">All projects</SelectItem>
                            {Array.isArray(projects) && projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <Button
                    variant={filterStaleOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStaleOnly(v => !v)}
                    className="h-8 text-xs gap-1.5"
                >
                    <Filter className="w-3 h-3" />
                    Stale only
                    {filterStaleOnly && (
                        <Badge className="h-4 text-[9px] px-1 bg-primary-foreground text-primary border-0 rounded ml-0.5">
                            ON
                        </Badge>
                    )}
                </Button>

                {hasFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground gap-1"
                        onClick={() => { setFilterAgent('__all__'); setFilterProject('__all__'); setFilterStaleOnly(false) }}
                    >
                        <X className="w-3 h-3" /> Clear
                    </Button>
                )}

                <div className="ml-auto text-xs text-muted-foreground">
                    {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
                </div>
            </div>}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                            >
                <div
                    ref={boardRef}
                    className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-380px)] cursor-grab"
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseLeaveOrUp}
                    onMouseLeave={onMouseLeaveOrUp}
                >
                    {Array.isArray(activePipeline?.stages) && activePipeline.stages.map(stage => {
                        const stageLeads = filteredLeads
                            .filter(l => l.stage_id === stage.id || (!l.stage_id && stage.order_index === 0))
                            .map(l => ({
                                ...l,
                                onClick: (lead) => router.push(`/dashboard/admin/crm/leads/${lead.id}`),
                                upcomingVisit: visitByLead.get(l.id) ?? null,
                            }))
                        return (
                            <PipelineColumn
                                key={stage.id}
                                stage={stage}
                                leads={stageLeads}
                                onAddLead={handleAddLead}
                                onStageUpdate={handleStageUpdate}
                                onOpenSettings={setSettingsStage}
                                canManageSettings={canManageSettings}
                            />
                        )
                    })}

                    {/* Add Stage button */}
                    {canManageSettings && (
                        <div className="flex-shrink-0 w-[300px] flex items-start pt-0.5">
                            <Button
                                variant="outline"
                                onClick={handleAddStage}
                                className="h-10 w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary text-sm gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Stage
                            </Button>
                        </div>
                    )}
                </div>

                <DragOverlay dropAnimation={{ duration: 150 }}>
                    {activeDragItem ? (
                        <div className="rotate-2 scale-105 shadow-2xl opacity-95">
                            <LeadCard lead={activeDragItem} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Add Lead Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Lead</DialogTitle>
                    </DialogHeader>
                    {targetStageId && (
                        <LeadForm
                            projects={projects}
                            users={users}
                            stages={activePipeline?.stages || []}
                            initialStageId={targetStageId}
                            onSubmit={handleCreateLead}
                            onCancel={() => setAddDialogOpen(false)}
                            isSubmitting={submitting}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Stage Settings Sheet */}
            {settingsStage && (
                <StageSettingsSheet
                    stage={settingsStage}
                    pipeline={activePipeline}
                    open={!!settingsStage}
                    onClose={() => setSettingsStage(null)}
                    onStageUpdate={handleStageUpdate}
                    onPipelineRefresh={refetchPipelines}
                />
            )}

            {/* Post-move site visit prompts */}
            {postMoveDialog?.type === 'book' && (
                <BookSiteVisitDialog
                    open={true}
                    onOpenChange={open => {
                        if (!open) {
                            // User dismissed without booking — snap back visually, then persist rollback
                            const { lead, previousStageId } = postMoveDialog
                            setPostMoveDialog(null)
                            if (previousStageId) {
                                // Optimistic override to previousStageId so board shows correct stage instantly
                                setOptimisticMoves(prev => new Map(prev).set(lead.id, previousStageId))
                                fetch(`/api/leads/${lead.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ stageId: previousStageId }),
                                })
                                    .then(() => refetchLeads())
                                    .then(() => setOptimisticMoves(prev => { const next = new Map(prev); next.delete(lead.id); return next }))
                                    .catch(() => setOptimisticMoves(prev => { const next = new Map(prev); next.delete(lead.id); return next }))
                            }
                        }
                    }}
                    leadId={postMoveDialog.lead.id}
                    lead={postMoveDialog.lead}
                    agents={users}
                    onSuccess={() => { setPostMoveDialog(null); refetchLeads() }}
                />
            )}

        </>
    )
})

PipelineBoard.displayName = 'PipelineBoard'
export default PipelineBoard
