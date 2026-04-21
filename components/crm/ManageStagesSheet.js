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
import { GripVertical, Trash2, Save, Loader2 } from 'lucide-react'
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

    useEffect(() => {
        if (pipeline?.stages) {
            // Clone and sort by order_index
            const sortedStages = [...pipeline.stages].sort((a, b) => a.order_index - b.order_index)
            setStages(sortedStages)
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

    const handleDelete = async (id) => {
        if (stages.length <= 1) {
            toast.error('Pipeline must have at least one stage')
            return
        }
        if (!confirm('Are you sure? This will affect leads in this stage.')) return
        
        setStages(prev => prev.filter(s => s.id !== id))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Calculate final order_index for all stages
            const updatedStages = stages.map((s, idx) => ({
                id: s.id,
                name: s.name,
                order_index: idx
            }))

            // We need to handle deletions as well. 
            // In a real app, you might want a separate API for deletion or handle it in the bulk update.
            // For now, we'll assume the API handles partial lists or we can send the full desired state.
            
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
            toast.error('Failed to save changes')
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
                    <SheetDescription>
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
