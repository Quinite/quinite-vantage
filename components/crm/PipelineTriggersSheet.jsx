'use client'

import { useState, useEffect } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePipelines } from '@/hooks/usePipelines'

const TRIGGER_SECTIONS = [
    {
        label: 'SITE VISIT',
        triggers: [
            { key: 'site_visit_booked',                   label: 'Site visit booked',                    desc: 'When any site visit is created for a lead' },
            { key: 'site_visit_completed_interested',      label: 'Visit completed — Interested',         desc: 'Outcome marked as interested' },
            { key: 'site_visit_completed_not_interested',  label: 'Visit completed — Not Interested',     desc: 'Outcome marked as not interested' },
            { key: 'site_visit_completed_follow_up',       label: 'Visit completed — Follow Up Needed',   desc: 'Outcome requires follow up' },
            { key: 'site_visit_no_show',                   label: 'Visit marked No Show',                 desc: 'Lead did not show up' },
        ],
    },
    {
        label: 'CALLS & CAMPAIGNS',
        triggers: [
            { key: 'call_answered',           label: 'AI call answered',         desc: 'Lead picked up for the first time' },
            { key: 'call_transferred',        label: 'AI call transferred',       desc: 'Call handed off to a human agent' },
            { key: 'call_callback_requested', label: 'Callback requested',        desc: 'Lead requested a callback during AI call' },
            { key: 'call_exhausted',          label: 'All retries exhausted',     desc: 'Lead unreachable after all call attempts' },
        ],
    },
    {
        label: 'DEALS',
        triggers: [
            { key: 'deal_created', label: 'Deal created',      desc: 'A deal is linked to the lead' },
            { key: 'deal_won',     label: 'Deal marked Won',   desc: 'Deal status changed to won' },
            { key: 'deal_lost',    label: 'Deal marked Lost',  desc: 'Deal status changed to lost' },
        ],
    },
]

export default function PipelineTriggersSheet({ open, onOpenChange, pipelineId }) {
    const { data: pipelines = [] } = usePipelines()

    const stages = pipelineId
        ? (pipelines.find(p => p.id === pipelineId)?.stages ?? [])
        : (pipelines[0]?.stages ?? [])

    const [configs, setConfigs] = useState({})
    const [isDirty, setIsDirty] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setIsLoading(true)
        fetch('/api/pipeline/triggers')
            .then(r => r.json())
            .then(data => {
                const map = {}
                for (const t of data.triggers || []) {
                    map[t.trigger_key] = { is_enabled: t.is_enabled, target_stage_id: t.target_stage_id ?? '' }
                }
                setConfigs(map)
                setIsDirty(false)
            })
            .catch(() => toast.error('Failed to load trigger config'))
            .finally(() => setIsLoading(false))
    }, [open])

    const getConfig = (key) => configs[key] ?? { is_enabled: false, target_stage_id: '' }

    const update = (key, field, value) => {
        setConfigs(prev => ({
            ...prev,
            [key]: { ...getConfig(key), ...prev[key], [field]: value },
        }))
        setIsDirty(true)
    }

    const allKeys = TRIGGER_SECTIONS.flatMap(s => s.triggers.map(t => t.key))
    const hasValidationErrors = allKeys.some(key => {
        const c = getConfig(key)
        return c.is_enabled && !c.target_stage_id
    })

    const handleSave = async () => {
        if (hasValidationErrors) return
        setIsSaving(true)
        try {
            const triggers = allKeys.map(key => {
                const c = getConfig(key)
                return {
                    trigger_key:     key,
                    is_enabled:      c.is_enabled,
                    target_stage_id: c.target_stage_id || null,
                }
            })
            const res = await fetch('/api/pipeline/triggers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ triggers }),
            })
            if (!res.ok) throw new Error('Save failed')
            toast.success('Pipeline triggers saved')
            setIsDirty(false)
            onOpenChange(false)
        } catch {
            toast.error('Failed to save triggers')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[500px] flex flex-col p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                    <SheetTitle className="text-base font-semibold">Pipeline Triggers</SheetTitle>
                    <p className="text-xs text-muted-foreground !mt-0">
                        Automatically move leads when key events happen, from any stage.
                    </p>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        TRIGGER_SECTIONS.map(section => (
                            <div key={section.label}>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                    {section.label}
                                </p>
                                <div className="space-y-2">
                                    {section.triggers.map(trigger => {
                                        const cfg = getConfig(trigger.key)
                                        const showError = cfg.is_enabled && !cfg.target_stage_id
                                        return (
                                            <div key={trigger.key} className={`rounded-xl border bg-card transition-all ${showError ? 'border-destructive/50' : cfg.is_enabled ? 'border-primary/20 bg-primary/[0.02] shadow-sm' : 'border-border/60'}`}>
                                                {/* Top row: label + toggle */}
                                                <div className="flex items-start justify-between gap-3 px-3 pt-3 pb-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-foreground leading-tight">{trigger.label}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{trigger.desc}</p>
                                                    </div>
                                                    <Switch
                                                        checked={cfg.is_enabled}
                                                        onCheckedChange={v => update(trigger.key, 'is_enabled', v)}
                                                        className="shrink-0 mt-0.5"
                                                    />
                                                </div>
                                                {/* Bottom row: move to label + stage picker */}
                                                <div className="flex items-center gap-2 px-3 pb-3">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                                                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                                        Then move to
                                                    </span>
                                                    <Select
                                                        value={cfg.target_stage_id || ''}
                                                        onValueChange={v => update(trigger.key, 'target_stage_id', v)}
                                                        disabled={!cfg.is_enabled}
                                                    >
                                                        <SelectTrigger className="h-7 flex-1 text-xs bg-white">
                                                            <SelectValue placeholder="Select stage…" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {stages.map(s => (
                                                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                                                    {s.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {showError && (
                                                    <p className="text-xs text-destructive px-3 pb-2 -mt-1">Select a stage to enable this trigger</p>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="px-6 py-4 border-t flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleSave}
                        disabled={!isDirty || hasValidationErrors || isSaving}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Save Changes
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
