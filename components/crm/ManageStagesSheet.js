'use client'

import { useState, useEffect } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Save, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

function SortableStageItem({ stage, onRename, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: stage.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                flex items-center gap-3 p-3 bg-card border border-border rounded-lg mb-2 group
                ${isDragging ? 'shadow-lg border-primary/50' : ''}
            `}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 transition-colors">
                <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <Input
                    value={stage.name}
                    onChange={(e) => onRename(stage.id, e.target.value)}
                    disabled={stage.is_default}
                    className="h-9 w-full bg-background disabled:bg-muted/30 disabled:text-muted-foreground font-medium"
                    placeholder="Stage Name"
                />
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <div className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">
                    {stage.lead_count || 0} Leads
                </div>
                {!stage.is_default && (
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(stage.id)}
                                        disabled={stage.lead_count >= 1}
                                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] py-1 px-2 border-destructive/20">
                                {stage.lead_count >= 1 
                                    ? `Cannot delete stage: Move ${stage.lead_count} lead${stage.lead_count > 1 ? 's' : ''} first` 
                                    : "Delete stage"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    )
}

export default function ManageStagesSheet({ open, onClose, pipeline, onRefresh }) {
    const [stages, setStages] = useState([])
    const [saving, setSaving] = useState(false)
    const [newStageName, setNewStageName] = useState('')
    const [addingStage, setAddingStage] = useState(false)

    useEffect(() => {
        if (pipeline?.stages) {
            const sortedStages = [...pipeline.stages].sort((a, b) => a.order_index - b.order_index)
            setStages(sortedStages)
        }
        if (!open) {
            setNewStageName('')
            setAddingStage(false)
        }
    }, [pipeline, open])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event) => {
        const { active, over } = event

        if (active.id !== over.id) {
            setStages((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id)
                const newIndex = items.findIndex((item) => item.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const handleRename = (id, newName) => {
        setStages(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s))
    }

    const handleAddStage = () => {
        const name = newStageName.trim()
        if (!name) return
        // Temp id prefixed so we can identify new stages on save
        const tempId = `__new__${Date.now()}`
        const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order_index ?? 0)) : -1
        setStages(prev => [...prev, { id: tempId, name, order_index: maxOrder + 1, lead_count: 0, is_default: false, _isNew: true }])
        setNewStageName('')
        setAddingStage(false)
    }

    const handleDelete = async (id) => {
        if (stages.length <= 1) {
            toast.error('Pipeline must have at least one stage')
            return
        }
        if (!confirm('Are you sure? This will affect leads in this stage.')) return
        
        setStages(prev => prev.filter(s => s.id !== id))
    }

    const handleSave = async () => {
        if (!pipeline?.id) return
        setSaving(true)
        try {
            // 1. POST any new stages first to get real ids
            let resolvedStages = [...stages]
            const newStages = resolvedStages.filter(s => s._isNew)
            for (const ns of newStages) {
                const res = await fetch('/api/pipeline/stages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pipeline_id: pipeline.id, name: ns.name, order_index: 999 }),
                })
                if (!res.ok) throw new Error(`Failed to create stage "${ns.name}"`)
                const { stage } = await res.json()
                // Replace temp entry with real stage
                resolvedStages = resolvedStages.map(s => s.id === ns.id ? { ...stage, _isNew: false } : s)
            }

            // 2. PUT full list with final order_index values
            const updatedStages = resolvedStages.map((s, idx) => ({
                id: s.id,
                name: s.name,
                order_index: idx,
            }))

            const res = await fetch('/api/pipeline/stages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stages: updatedStages, fullSync: true }),
            })
            if (!res.ok) throw new Error('Save failed')

            toast.success('Pipeline stages updated')
            onRefresh?.()
            onClose()
        } catch (error) {
            toast.error(error.message || 'Failed to save changes')
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle>Manage Pipeline Stages</SheetTitle>
                    <SheetDescription className='!mt-0'>
                        Reorder, rename, or remove stages from your CRM pipeline.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={stages.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {stages.map((stage) => (
                                    <SortableStageItem
                                        key={stage.id}
                                        stage={stage}
                                        onRename={handleRename}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Add Stage */}
                <div className="px-6 pb-0">
                    {addingStage ? (
                        <div className="flex items-center gap-2">
                            <Input
                                autoFocus
                                value={newStageName}
                                onChange={e => setNewStageName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddStage()
                                    if (e.key === 'Escape') { setAddingStage(false); setNewStageName('') }
                                }}
                                placeholder="Stage name…"
                                className="h-9 flex-1"
                            />
                            <Button size="sm" onClick={handleAddStage} disabled={!newStageName.trim()} className="h-9">Add</Button>
                            <Button size="sm" variant="ghost" className="h-9" onClick={() => { setAddingStage(false); setNewStageName('') }}>Cancel</Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary gap-2"
                            onClick={() => setAddingStage(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Add Stage
                        </Button>
                    )}
                </div>

                <div className="p-6 border-t bg-muted/20 flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
