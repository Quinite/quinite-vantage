'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Trash2, ChevronRight, Loader2, Pencil } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useUsers } from '@/hooks/usePipelines'

const TRIGGER_LABELS = {
    stage_enter: 'Lead enters this stage',
    stage_exit: 'Lead exits this stage',
    ai_call_outcome: 'AI call outcome',
    interest_level_change: 'Interest level changes',
    score_threshold: 'Score crosses threshold',
    call_logged: 'Call logged (manual)',
}

const ACTION_LABELS = {
    move_stage: 'Move to stage',
    assign_agent: 'Assign to agent',
    create_task: 'Create follow-up task',
}

function AutomationRuleForm({ rule, stages, users, onSave, onCancel }) {
    const [triggerType, setTriggerType] = useState(rule?.trigger_type || 'stage_enter')
    const [triggerConfig, setTriggerConfig] = useState(rule?.trigger_config || {})
    const [actionType, setActionType] = useState(rule?.action_type || 'create_task')
    const [actionConfig, setActionConfig] = useState(rule?.action_config || {})
    const [name, setName] = useState(rule?.name || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!name.trim()) { toast.error('Rule name is required'); return }
        setSaving(true)
        await onSave({ name: name.trim(), trigger_type: triggerType, trigger_config: triggerConfig, action_type: actionType, action_config: actionConfig })
        setSaving(false)
    }

    return (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
            <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Rule name (e.g. Schedule site visit)"
                className="h-8 text-sm"
            />

            {/* Trigger */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">When</p>
                <Select value={triggerType} onValueChange={v => { setTriggerType(v); setTriggerConfig({}) }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {triggerType === 'ai_call_outcome' && (
                    <Select value={triggerConfig.outcome || ''} onValueChange={v => setTriggerConfig({ outcome: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                        <SelectContent>
                            {['interested', 'not_interested', 'callback', 'unreachable', 'transferred'].map(o => (
                                <SelectItem key={o} value={o}>{o.replace(/_/g, ' ')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {triggerType === 'interest_level_change' && (
                    <Select value={triggerConfig.interest_level || ''} onValueChange={v => setTriggerConfig({ interest_level: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Becomes..." /></SelectTrigger>
                        <SelectContent>
                            {['high', 'medium', 'low'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
                {triggerType === 'score_threshold' && (
                    <Input
                        type="number"
                        min={0} max={100}
                        value={triggerConfig.score_above ?? ''}
                        onChange={e => setTriggerConfig({ score_above: parseInt(e.target.value) || 0 })}
                        placeholder="Score above (0-100)"
                        className="h-8 text-sm"
                    />
                )}
            </div>

            {/* Action */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Then</p>
                <Select value={actionType} onValueChange={v => { setActionType(v); setActionConfig({}) }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.entries(ACTION_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {actionType === 'move_stage' && (
                    <Select value={actionConfig.stage_id || ''} onValueChange={v => setActionConfig({ stage_id: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select stage" /></SelectTrigger>
                        <SelectContent>
                            {Array.isArray(stages) && stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
                {actionType === 'assign_agent' && (
                    <Select value={actionConfig.user_id || actionConfig.mode || ''} onValueChange={v => setActionConfig(v === 'round_robin' ? { mode: 'round_robin' } : { user_id: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select agent" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="round_robin">Round-robin (auto)</SelectItem>
                            {Array.isArray(users) && users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
                {actionType === 'create_task' && (
                    <div className="space-y-2">
                        <Input
                            value={actionConfig.title || ''}
                            onChange={e => setActionConfig(c => ({ ...c, title: e.target.value }))}
                            placeholder="Task title"
                            className="h-8 text-sm"
                        />
                        <Input
                            type="number"
                            min={1}
                            value={actionConfig.due_in_hours ?? ''}
                            onChange={e => setActionConfig(c => ({ ...c, due_in_hours: parseInt(e.target.value) || 24 }))}
                            placeholder="Due in hours (e.g. 48)"
                            className="h-8 text-sm"
                        />
                    </div>
                )}
            </div>

            <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Save Rule
                </Button>
            </div>
        </div>
    )
}

export function StageSettingsSheet({ stage, pipeline, open, onClose, onStageUpdate, onPipelineRefresh }) {
    const [automations, setAutomations] = useState([])
    const [loadingAutomations, setLoadingAutomations] = useState(false)
    const [addingRule, setAddingRule] = useState(false)
    const [editingRule, setEditingRule] = useState(null)
    const [staleDays, setStaleDays] = useState(stage.stale_days ?? '')
    const [deleteStageOpen, setDeleteStageOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [savingStale, setSavingStale] = useState(false)
    const [justSavedStale, setJustSavedStale] = useState(false)
    const { data: users = [] } = useUsers()

    const fetchAutomations = useCallback(async () => {
        if (!pipeline?.id) return
        setLoadingAutomations(true)
        try {
            const res = await fetch(`/api/pipeline/automations?pipeline_id=${pipeline.id}`)
            const data = await res.json()
            // Filter to rules relevant to this stage
            setAutomations((data.automations || []).filter(a =>
                a.trigger_config?.stage_id === stage.id ||
                a.action_config?.stage_id === stage.id ||
                !a.trigger_config?.stage_id
            ))
        } catch {
            // ignore
        } finally {
            setLoadingAutomations(false)
        }
    }, [pipeline?.id, stage.id])

    useEffect(() => {
        if (open) fetchAutomations()
    }, [open, fetchAutomations])

    useEffect(() => {
        setStaleDays(stage.stale_days ?? '')
    }, [stage.stale_days])

    const handleStaleDaysBlur = async () => {
        const val = staleDays === '' ? null : parseInt(staleDays)
        if (val === (stage.stale_days ?? null)) return
        
        setSavingStale(true)
        try {
            await onStageUpdate?.(stage.id, { stale_days: val })
            setJustSavedStale(true)
            setTimeout(() => setJustSavedStale(false), 2000)
            toast.success('Stale threshold updated')
        } catch (e) {
            toast.error('Failed to update threshold')
        } finally {
            setSavingStale(false)
        }
    }

    const handleSaveRule = async (ruleData) => {
        try {
            if (editingRule) {
                await fetch(`/api/pipeline/automations/${editingRule.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ruleData),
                })
                toast.success('Rule updated')
            } else {
                await fetch('/api/pipeline/automations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...ruleData, pipeline_id: pipeline.id, trigger_config: { ...ruleData.trigger_config, stage_id: stage.id } }),
                })
                toast.success('Rule created')
            }
            setAddingRule(false)
            setEditingRule(null)
            fetchAutomations()
        } catch {
            toast.error('Failed to save rule')
        }
    }

    const handleToggleRule = async (rule) => {
        await fetch(`/api/pipeline/automations/${rule.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !rule.is_active }),
        })
        fetchAutomations()
    }

    const handleDeleteRule = async (ruleId) => {
        await fetch(`/api/pipeline/automations/${ruleId}`, { method: 'DELETE' })
        toast.success('Rule deleted')
        fetchAutomations()
    }

    const handleDeleteStage = async () => {
        setDeleting(true)
        try {
            const res = await fetch(`/api/pipeline/stages/${stage.id}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Cannot delete stage')
            }
            toast.success('Stage deleted')
            onPipelineRefresh?.()
            onClose()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setDeleting(false)
            setDeleteStageOpen(false)
        }
    }

    const stages = pipeline?.stages || []

    return (
        <>
            <Sheet open={open} onOpenChange={onClose}>
                <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto flex flex-col gap-0 p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                            <SheetTitle className="text-base">{stage.name}</SheetTitle>
                            {stage.is_default && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Default</Badge>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                        {/* Stale threshold */}
                        <section className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stale Threshold</h4>
                            <p className="text-xs text-muted-foreground">Show an amber warning when a lead has been in this stage longer than:</p>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={1}
                                    value={staleDays}
                                    onChange={e => setStaleDays(e.target.value)}
                                    onBlur={handleStaleDaysBlur}
                                    placeholder="e.g. 7"
                                    className="h-8 w-24 text-sm"
                                />
                                <span className="text-sm text-muted-foreground mr-1">days</span>
                                
                                {savingStale && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                                {justSavedStale && <span className="text-[10px] text-emerald-500 font-medium">Saved</span>}

                                {staleDays && !savingStale && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground border-dashed bg-transparent"
                                        onClick={() => { setStaleDays(''); onStageUpdate?.(stage.id, { stale_days: null }) }}>
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </section>

                        {/* Automation rules */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Automation Rules</h4>
                                {!addingRule && !editingRule && (
                                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setAddingRule(true)}>
                                        <Plus className="w-3 h-3" /> Add Rule
                                    </Button>
                                )}
                            </div>

                            {(addingRule) && (
                                <AutomationRuleForm
                                    stages={stages}
                                    users={users}
                                    onSave={handleSaveRule}
                                    onCancel={() => setAddingRule(false)}
                                />
                            )}

                            {loadingAutomations ? (
                                <p className="text-xs text-muted-foreground">Loading rules...</p>
                            ) : automations.length === 0 && !addingRule ? (
                                <div className="text-center py-6 text-muted-foreground text-xs border-2 border-dashed border-border/30 rounded-xl">
                                    No automation rules yet
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {Array.isArray(automations) && automations.map(rule => (
                                        <div key={rule.id}>
                                            {editingRule?.id === rule.id ? (
                                                <AutomationRuleForm
                                                    rule={rule}
                                                    stages={stages}
                                                    users={users}
                                                    onSave={handleSaveRule}
                                                    onCancel={() => setEditingRule(null)}
                                                />
                                            ) : (
                                                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${rule.is_active ? 'bg-card border-border' : 'bg-muted/30 border-border/40'}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-semibold truncate ${rule.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>{rule.name}</p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            {TRIGGER_LABELS[rule.trigger_type]} <ChevronRight className="inline w-2.5 h-2.5" /> {ACTION_LABELS[rule.action_type]}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[10px] text-muted-foreground">{rule.is_active ? 'Active' : 'Off'}</span>
                                                        <Switch
                                                            checked={rule.is_active}
                                                            onCheckedChange={() => handleToggleRule(rule)}
                                                            className="scale-75"
                                                        />
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingRule(rule)}>
                                                            <Pencil className="w-3 h-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteRule(rule.id)}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Delete stage — bottom */}
                    {!stage.is_default && (
                        <div className="px-6 py-4 border-t border-border mt-auto">
                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => setDeleteStageOpen(true)}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                Delete Stage
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <AlertDialog open={deleteStageOpen} onOpenChange={setDeleteStageOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{stage.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the stage. Leads in this stage will need to be moved first.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteStage}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
