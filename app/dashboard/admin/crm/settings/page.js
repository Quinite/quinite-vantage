'use client'

import { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'react-hot-toast'
import { GripVertical, Trash2, Plus, Save, Loader2, Settings2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { PermissionGate } from '@/components/permissions/PermissionGate'

const MANDATORY_STAGE_NAMES = ['New Lead', 'Won', 'Lost']
const DEFAULT_STAGE_COLORS = {
    'New Lead': '#3b82f6',
    'Won': '#16a34a',
    'Lost': '#ef4444'
}
const STAGE_COLOR_PRESETS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#16a34a', '#eab308', '#f97316', '#ef4444', '#64748b']

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

function SortableStage({ id, stage, onChange, onDelete, canDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
    const mandatory = isMandatoryStage(stage)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div ref={setNodeRef} style={style} className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="mt-1 rounded-md p-1 text-slate-400 outline-none transition-colors hover:bg-slate-100 hover:text-blue-600 cursor-grab"
                    aria-label={`Reorder ${stage.name}`}
                >
                    <GripVertical className="h-5 w-5" />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color || '#94a3b8' }} />
                        {mandatory ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                Default Stage
                            </span>
                        ) : (
                            <span className="text-xs text-slate-500">Custom Stage</span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                        <div className="lg:col-span-6">
                            <label className="text-xs text-slate-500 mb-1 block">Stage title</label>
                            <Input
                                value={stage.name}
                                onChange={(e) => onChange(id, 'name', e.target.value)}
                                placeholder="Stage name"
                                className="h-10 rounded-xl"
                            />
                        </div>

                        <div className="lg:col-span-6">
                            <label className="text-xs text-slate-500 mb-1 block">Color</label>
                            <div className="flex items-center gap-2">
                                <label className="h-10 w-12 shrink-0 rounded-xl border border-slate-300 bg-white flex items-center justify-center cursor-pointer">
                                    <input
                                        type="color"
                                        value={stage.color || '#94a3b8'}
                                        onChange={(e) => onChange(id, 'color', e.target.value)}
                                        className="h-7 w-7 border-0 bg-transparent p-0 cursor-pointer"
                                        aria-label={`Pick color for ${stage.name}`}
                                    />
                                </label>
                                <Input
                                    value={stage.color || ''}
                                    onChange={(e) => onChange(id, 'color', e.target.value)}
                                    placeholder="#RRGGBB"
                                    className="h-10 rounded-xl font-mono"
                                />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {STAGE_COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={`${id}-${preset}`}
                                        type="button"
                                        onClick={() => onChange(id, 'color', preset)}
                                        className={`h-6 w-6 rounded-md border transition ${stage.color === preset ? 'border-slate-900 ring-1 ring-slate-300' : 'border-slate-200 hover:border-slate-400'}`}
                                        style={{ backgroundColor: preset }}
                                        aria-label={`Set stage color ${preset}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(id)}
                    disabled={!canDelete || mandatory}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl"
                    title={mandatory ? 'Default stage cannot be deleted' : (!canDelete ? "Minimum 3 stages required" : "Delete stage")}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

export default function CrmSettingsPage() {
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
            toast.error('This stage is mandatory and cannot be deleted.')
            return
        }

        // Prevent deletion if fewer than 3 stages would remain
        if (stages.length <= 3) {
            toast.error('Cannot delete stage. Minimum 3 stages required for pipeline.')
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
                toast.error('Stage name cannot be empty.')
                return
            }

            const newStages = stagesWithDefaults.filter(s => String(s.id).startsWith('temp-'))
            const existingStages = stagesWithDefaults.filter(s => !String(s.id).startsWith('temp-'))

            // Create new stages
            for (const stage of newStages) {
                await fetch('/api/pipeline/stages', {
                    method: 'POST',
                    body: JSON.stringify({
                        pipeline_id: selectedPipelineId,
                        name: stage.name,
                        color: stage.color || '#94a3b8',
                        order_index: stagesWithDefaults.findIndex((s) => s.id === stage.id)
                    })
                })
            }

            // Update existing stages
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
            fetchPipelines()
        } catch (error) {
            console.error(error)
            toast.error('Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <SettingsSkeleton />
    }

    return (
        <PermissionGate
            feature="edit_settings"
            fallbackMessage="You do not have permission to manage CRM settings."
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Settings2 className="h-6 w-6 text-blue-600" />
                            Pipeline Stages
                        </h1>
                        <p className="text-gray-500 mt-1">Customize your sales pipeline by adding, removing, and reordering stages.</p>
                    </div>

                </div>

                {/* Pipeline Stages Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Manage Stages</CardTitle>
                        <CardDescription>
                            Drag and drop to reorder stages. Mandatory defaults: New Lead, Won, Lost (editable but non-deletable).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex items-start gap-2">
                            <ShieldCheck className="h-4 w-4 mt-0.5" />
                            <span>Use the color picker to quickly style each stage and create a clearer pipeline flow.</span>
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
                                        canDelete={stages.length > 3}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        <Button
                            variant="outline"
                            className="w-full mt-4 border-dashed hover:border-blue-400 hover:text-blue-600 transition-colors"
                            onClick={handleAddStage}
                        >
                            <Plus className="h-4 w-4 mr-2" /> Add New Stage
                        </Button>
                    </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto sm:min-w-[140px]">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {!saving && <Save className="h-4 w-4 mr-2" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
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
        </PermissionGate>
    )
}

function SettingsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-full md:w-[250px]" />
            </div>

            <div className="space-y-6">
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                                <Skeleton className="h-5 w-5" />
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Skeleton className="h-9 w-full" />
                                    <Skeleton className="h-9 w-32" />
                                </div>
                                <Skeleton className="h-8 w-8" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
