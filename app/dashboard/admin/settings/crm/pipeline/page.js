'use client'

import { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { GripVertical, Trash2, Plus, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'

const MANDATORY_STAGE_NAMES = ['New Lead', 'Won', 'Lost']
const DEFAULT_STAGE_COLORS = {
    'New Lead': '#3b82f6',
    'Won': '#16a34a',
    'Lost': '#ef4444'
}

const normalizeStageName = (name) => (name || '').trim().toLowerCase()
const isMandatoryStage = (stage) => MANDATORY_STAGE_NAMES.some(
    (mandatoryName) => normalizeStageName(mandatoryName) === normalizeStageName(stage?.name)
)

const ensureMandatoryStages = (stageList = [], pipelineId) => {
    const normalizedMap = new Map(stageList.map((s) => [normalizeStageName(s.name), s]))
    const next = [...stageList]

    for (const mandatoryName of MANDATORY_STAGE_NAMES) {
        if (!normalizedMap.has(normalizeStageName(mandatoryName))) {
            next.push({
                id: `temp-default-${mandatoryName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
                name: mandatoryName,
                color: DEFAULT_STAGE_COLORS[mandatoryName],
                order_index: next.length,
                pipeline_id: pipelineId || null,
            })
        }
    }

    return next.map((stage) => {
        if (!isMandatoryStage(stage)) return stage
        const canonicalName = MANDATORY_STAGE_NAMES.find(
            (mandatoryName) => normalizeStageName(mandatoryName) === normalizeStageName(stage.name)
        ) || stage.name
        return {
            ...stage,
            name: canonicalName,
            color: stage.color || DEFAULT_STAGE_COLORS[canonicalName] || '#94a3b8',
        }
    })
}

function SortableStage({ id, stage, onChange, onDelete, canEdit }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled: !canEdit })
    const mandatory = isMandatoryStage(stage)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: canEdit ? 1 : 0.7
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl mb-3 shadow-sm group hover:shadow-md transition-shadow"
        >
            <div {...attributes} {...listeners} className={`outline-none ${canEdit ? 'cursor-grab hover:text-blue-600' : 'cursor-not-allowed text-gray-300'}`}>
                <GripVertical className="h-5 w-5" />
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-7">
                    <Input
                        value={stage.name}
                        onChange={(e) => onChange(id, 'name', e.target.value)}
                        placeholder="Stage Name"
                        className="h-10"
                        disabled={!canEdit}
                    />
                </div>
                <div className="md:col-span-5 flex gap-2">
                    <label className="h-10 w-12 rounded-md border border-slate-300 bg-white flex items-center justify-center cursor-pointer">
                        <input
                            type="color"
                            value={stage.color || '#94a3b8'}
                            onChange={(e) => onChange(id, 'color', e.target.value)}
                            disabled={!canEdit}
                            className="h-7 w-7 border-0 bg-transparent p-0 cursor-pointer"
                            aria-label={`Pick color for ${stage.name}`}
                        />
                    </label>
                    <div className="relative flex-1">
                        <div className="absolute left-2 top-2.5 h-4 w-4 rounded-full border border-gray-200" style={{ backgroundColor: stage.color || '#94a3b8' }}></div>
                        <Input
                            value={stage.color || ''}
                            onChange={(e) => onChange(id, 'color', e.target.value)}
                            placeholder="#RRGGBB"
                            className="h-9 pl-8 font-mono"
                            disabled={!canEdit}
                        />
                    </div>
                </div>
            </div>

            <PermissionTooltip
                hasPermission={canEdit && !mandatory}
                message={mandatory
                    ? 'Default stages are mandatory and cannot be deleted.'
                    : "You need 'Manage CRM Settings' permission to delete stages."}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        if (!canEdit || mandatory) return
                        onDelete(id)
                    }}
                    disabled={!canEdit || mandatory}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 relative"
                >
                    {!canEdit ? <Lock className="w-3 h-3 absolute" /> : <Trash2 className="h-4 w-4" />}
                </Button>
            </PermissionTooltip>
        </div>
    )
}

export default function PipelineSettingsPage() {
    const canEdit = usePermission('manage_crm_settings')
    const [pipelines, setPipelines] = useState([])
    const [selectedPipelineId, setSelectedPipelineId] = useState(null)
    const [stages, setStages] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [stageToDelete, setStageToDelete] = useState(null)

    // Sensors for Drag and Drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        fetchPipelines()
    }, [])

    useEffect(() => {
        if (selectedPipelineId && pipelines.length > 0) {
            const pipeline = pipelines.find(p => p.id === selectedPipelineId)
            if (pipeline) {
                setStages(ensureMandatoryStages(pipeline.stages || [], selectedPipelineId))
            }
        }
    }, [selectedPipelineId, pipelines])

    const fetchPipelines = async () => {
        try {
            const res = await fetch('/api/crm/pipelines')
            const data = await res.json()
            if (data.pipelines) {
                setPipelines(data.pipelines)
                if (data.pipelines.length > 0 && !selectedPipelineId) {
                    setSelectedPipelineId(data.pipelines[0].id)
                }
            }
        } catch (error) {
            console.error('Failed to fetch pipelines:', error)
            toast.error('Failed to load pipelines')
        } finally {
            setLoading(false)
        }
    }

    const handleDragEnd = (event) => {
        const { active, over } = event

        if (!over || active.id === over.id) return

        if (active.id !== over.id) {
            setStages((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id)
                const newIndex = items.findIndex(i => i.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const handleStageChange = (id, field, value) => {
        setStages(prev => prev.map(stage =>
            stage.id === id ? { ...stage, [field]: value } : stage
        ))
    }

    const handleDeleteStage = async (id) => {
        const target = stages.find((s) => s.id === id)
        if (!target || isMandatoryStage(target)) {
            toast.error('This stage is mandatory and cannot be deleted')
            return
        }

        if (String(id).startsWith('temp-')) {
            setStages(prev => prev.filter(s => s.id !== id))
            return
        }

        try {
            const res = await fetch(`/api/pipeline/stages/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (res.ok) {
                setStages(prev => prev.filter(s => s.id !== id))
                toast.success('Stage deleted')
            } else {
                toast.error(data.error || 'Failed to delete stage')
            }
        } catch (error) {
            toast.error('Error deleting stage')
        }
    }

    const handleAddStage = () => {
        const newStage = {
            id: `temp-${Date.now()}`,
            name: 'New Stage',
            color: '#cbd5e1',
            order_index: stages.length,
            pipeline_id: selectedPipelineId
        }
        setStages([...stages, newStage])
    }

    const handleSave = async () => {
        if (!selectedPipelineId) return
        setSaving(true)

        try {
            const stagesWithDefaults = ensureMandatoryStages(stages, selectedPipelineId)
            const hasEmptyName = stagesWithDefaults.some((stage) => !stage.name?.trim())
            if (hasEmptyName) {
                toast.error('Stage name cannot be empty')
                return
            }

            // Prepare payload
            // For new stages (temp-id), we need to POST them first or let PUT handle them if we modify API?
            // Existing API: 
            // PUT expects list of updates. 
            // POST creates one.

            // Strategy: 
            // 1. Filter new stages (temp-) -> Create them via POST
            // 2. Filter existing stages -> Update them via PUT (batch)

            const newStages = stagesWithDefaults.filter(s => String(s.id).startsWith('temp-'))
            const existingStages = stagesWithDefaults.filter(s => !String(s.id).startsWith('temp-'))

            // Create new stages
            const createdStages = []
            for (const stage of newStages) {
                const res = await fetch('/api/pipeline/stages', {
                    method: 'POST',
                    body: JSON.stringify({
                        pipeline_id: selectedPipelineId,
                        name: stage.name,
                        color: stage.color || '#94a3b8',
                        order_index: stagesWithDefaults.findIndex((s) => s.id === stage.id)
                    })
                })
                const data = await res.json()
                if (data.stage) {
                    createdStages.push(data.stage)
                }
            }

            // Update existing stages order and data
            const updates = existingStages.map((stage, index) => ({
                id: stage.id,
                name: stage.name,
                color: stage.color,
                order_index: stages.indexOf(stage) // Update order based on current list position taking new ones into account?
                // Wait, if I insert new ones, the indices list is mixed.
                // Actually easier: Upload everything.
            }))

            // Correct approach:
            // 1. Create new items. Get their real IDs.
            // 2. Re-construct the full list with real IDs.
            // 3. Send PUT with full list to update orders.

            // Let's refine:
            // The `createdStages` are now in DB.
            // We need to update `existingStages` too.

            // But I can't easily map the `temp` ones to the `created` ones to know their order unless I do it sequentially or careful mapping.
            // Simple: just update order_index for existing ones relative to their position in `stages` excluding or including temp ones?

            // Better: 
            // 1. Create new ones.
            // 2. Refresh list from server ? No, that loses pending edits to existing ones.

            // Re-map:
            // We know the index of each stage in `stages`.
            // For `existingStages`, updates are easy.
            // For `newStages`, they are created with the correct `order_index`.

            // So: 
            // 1. POST new stages with correct `order_index`.
            // 2. PUT existing stages with correct `order_index` (and name/color).

            // Note: `stages.indexOf(stage)` gives the correct index in the UI list.

            await fetch('/api/pipeline/stages', {
                method: 'PUT',
                body: JSON.stringify({
                    stages: existingStages.map(s => ({
                        ...s,
                        color: s.color || '#94a3b8',
                        order_index: stagesWithDefaults.findIndex(st => st.id === s.id)
                    }))
                })
            })

            toast.success('Pipeline saved successfully')
            fetchPipelines() // Refresh to get real IDs for new items
        } catch (error) {
            console.error(error)
            toast.error('Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pipeline Settings</h1>
                    <p className="text-gray-500 mt-1">Manage stages with drag-and-drop, color coding, and mandatory defaults.</p>
                </div>
                <div className="flex gap-4">
                    <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Select Pipeline" />
                        </SelectTrigger>
                        <SelectContent>
                            {pipelines.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Stages</CardTitle>
                    <CardDescription>Default mandatory stages: New Lead, Won, Lost. You can edit names/colors but cannot delete them.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 mt-0.5" />
                        <span>Use the color picker for quick stage color selection. Drag rows to reorder the pipeline flow.</span>
                    </div>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={stages.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {stages.map((stage) => (
                                <SortableStage
                                    key={stage.id}
                                    id={stage.id}
                                    stage={stage}
                                    onChange={handleStageChange}
                                    onDelete={(id) => {
                                        const stage = stages.find((s) => s.id === id)
                                        if (!stage) return
                                        setStageToDelete(stage)
                                    }}
                                    canEdit={canEdit}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    <PermissionTooltip
                        hasPermission={canEdit}
                        message="You need 'Manage CRM Settings' permission to add new stages."
                    >
                        <Button
                            variant="outline"
                            className="w-full mt-4 border-dashed"
                            onClick={() => {
                                if (!canEdit) return
                                handleAddStage()
                            }}
                            disabled={!canEdit}
                        >
                            {!canEdit ? <Lock className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Add Stage
                        </Button>
                    </PermissionTooltip>
                </CardContent>
            </Card>

            <div className="flex justify-end mt-6">
                <PermissionTooltip
                    hasPermission={canEdit}
                    message="You need 'Manage CRM Settings' permission to save changes."
                >
                    <Button
                        onClick={() => {
                            if (!canEdit) return
                            handleSave()
                        }}
                        disabled={saving || !canEdit}
                    >
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            !canEdit && <Lock className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                    </Button>
                </PermissionTooltip>
            </div>

            <AlertDialog open={!!stageToDelete} onOpenChange={(open) => !open && setStageToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Stage?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently remove the stage{stageToDelete?.name ? ` "${stageToDelete.name}"` : ''}. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (!stageToDelete) return
                                handleDeleteStage(stageToDelete.id)
                                setStageToDelete(null)
                            }}
                        >
                            Delete Stage
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
