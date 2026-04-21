'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LeadCard } from './LeadCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Settings2 } from 'lucide-react'

const PRESET_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#8b5cf6', '#ec4899', '#64748b']

function ColorPicker({ color, onChange }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                onMouseDown={(e) => { e.stopPropagation(); setOpen(v => !v) }}
                className="w-3.5 h-3.5 rounded-full ring-2 ring-background shadow-sm shrink-0 hover:scale-110 transition-transform"
                style={{ backgroundColor: color || '#a1a1aa' }}
                title="Change color"
            />
            {open && (
                <div className="absolute left-0 top-5 z-50 bg-popover border border-border rounded-xl shadow-xl p-2.5 w-[136px]">
                    <div className="grid grid-cols-5 gap-1.5">
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                onMouseDown={(e) => { e.stopPropagation(); onChange(c); setOpen(false) }}
                                className={`w-5 h-5 rounded-full hover:scale-110 transition-transform ring-offset-1 ${color === c ? 'ring-2 ring-primary' : ''}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <input
                        type="text"
                        defaultValue={color}
                        placeholder="#hex"
                        maxLength={7}
                        onKeyDown={(e) => { if (e.key === 'Enter') { onChange(e.target.value); setOpen(false) } }}
                        className="mt-2 w-full text-[10px] bg-muted border border-border rounded px-1.5 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    )
}

function PipelineColumnInner({ stage, leads, onAddLead, onStageUpdate, onOpenSettings, canManageSettings }) {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
        data: { type: 'Stage', stage },
    })

    const [editing, setEditing] = useState(false)
    const [stageName, setStageName] = useState(stage.name)
    const inputRef = useRef(null)

    useEffect(() => { setStageName(stage.name) }, [stage.name])

    const handleNameClick = () => {
        if (!canManageSettings || stage.is_default) return
        setEditing(true)
        setTimeout(() => inputRef.current?.select(), 0)
    }

    const commitName = () => {
        setEditing(false)
        const trimmed = stageName.trim()
        if (trimmed && trimmed !== stage.name) {
            onStageUpdate?.(stage.id, { name: trimmed })
        } else {
            setStageName(stage.name)
        }
    }

    const handleColorChange = (color) => {
        onStageUpdate?.(stage.id, { color })
    }

    const count = leads.length
    const staleCount = leads.filter(l => stage.stale_days && l.days_in_current_stage >= stage.stale_days).length

    return (
        <div className="flex flex-col w-[270px] flex-shrink-0 min-h-[calc(100vh-250px)]">
            {/* Column Header */}
            <div className="group/header flex items-center justify-between px-3 py-2.5 mb-2 bg-card border border-border rounded-xl shadow-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ColorPicker
                        color={stage.color}
                        onChange={canManageSettings && !stage.is_default ? handleColorChange : () => {}}
                    />
                    {editing ? (
                        <input
                            ref={inputRef}
                            value={stageName}
                            onChange={e => setStageName(e.target.value)}
                            onBlur={commitName}
                            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setStageName(stage.name); setEditing(false) } }}
                            className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-b border-primary outline-none text-foreground"
                            autoFocus
                        />
                    ) : (
                        <h3
                            onClick={handleNameClick}
                            className={`font-semibold text-sm text-foreground truncate ${canManageSettings && !stage.is_default ? 'cursor-text hover:text-primary transition-colors' : ''}`}
                            title={stage.name}
                        >
                            {stage.name}
                        </h3>
                    )}
                    <Badge
                        variant="secondary"
                        className="rounded-full px-2 text-[10px] font-bold bg-primary/10 text-primary border-0 h-5 shrink-0"
                    >
                        {count}
                    </Badge>
                    {staleCount > 0 && (
                        <Badge className="rounded-full px-1.5 text-[9px] font-bold bg-amber-100 text-amber-700 border-0 h-4 shrink-0 dark:bg-amber-900/30 dark:text-amber-400">
                            {staleCount} stale
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
                    {canManageSettings && (
                        <Button
                            onClick={() => onOpenSettings?.(stage)}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Stage settings"
                        >
                            <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                    <Button
                        onClick={() => onAddLead(stage.id)}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Add lead"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={`flex-1 rounded-xl border-2 border-dashed p-2.5 overflow-y-auto
                    transition-colors duration-150
                    ${isOver
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border/40 bg-muted/20'
                    }`}
            >
                <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 min-h-[120px]">
                        {leads.map(lead => (
                            <LeadCard key={lead.id} lead={lead} />
                        ))}
                        {leads.length === 0 && (
                            <div className={`h-28 rounded-lg flex flex-col items-center justify-center text-muted-foreground text-xs transition-colors
                                ${isOver ? 'bg-primary/10 border border-primary/30' : 'border-2 border-dashed border-border/20 bg-background/30'}`}>
                                <Plus className="w-4 h-4 mb-1 opacity-30" />
                                <span className="opacity-50">Drop here</span>
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    )
}

export const PipelineColumn = memo(PipelineColumnInner, (prev, next) => {
    return (
        prev.stage.id === next.stage.id &&
        prev.stage.name === next.stage.name &&
        prev.stage.color === next.stage.color &&
        prev.stage.stale_days === next.stage.stale_days &&
        prev.leads === next.leads &&
        prev.canManageSettings === next.canManageSettings
    )
})
PipelineColumn.displayName = 'PipelineColumn'
