'use client'

import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { Calendar as CalendarIcon, Clock, User, Building2, Lock, ChevronsUpDown, Check, Home, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { formatIndianDate } from '@/lib/formatDate'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function taskToFormData(task) {
    const d = task?.due_date ? parseISO(task.due_date) : null
    return {
        title:       task?.title       || '',
        description: task?.description || '',
        due_date:    d ? format(d, 'yyyy-MM-dd') : '',
        due_time:    task?.due_time
                        || (d && (d.getHours() !== 0 || d.getMinutes() !== 0)
                            ? format(d, 'HH:mm')
                            : ''),
        priority:    task?.priority    || 'medium',
        assigned_to: task?.assigned_to || 'none',
        lead_id:     task?.lead_id     || null,
        project_id:  task?.project_id  || null,
        unit_id:     task?.unit_id     || null,
    }
}

export function formDataToPayload(formData) {
    const combinedDate = formData.due_date
        ? (formData.due_time
            ? `${formData.due_date}T${formData.due_time}`
            : formData.due_date)
        : null
    return {
        title:       formData.title,
        description: formData.description || null,
        due_date:    combinedDate,
        due_time:    formData.due_time || null,
        priority:    formData.priority,
        assigned_to: formData.assigned_to === 'none' ? null : formData.assigned_to,
        lead_id:     formData.lead_id     || null,
        project_id:  formData.project_id  || null,
        unit_id:     formData.unit_id     || null,
    }
}

export const EMPTY_FORM = {
    title: '', description: '', due_date: '', due_time: '',
    priority: 'medium', assigned_to: 'none', lead_id: null, project_id: null, unit_id: null,
}

// ─── Lead search dropdown ─────────────────────────────────────────────────────

function LeadSelector({ value, valueLabel, onChange, disabled }) {
    const [query, setQuery]     = useState('')
    const [results, setResults] = useState([])
    const [open, setOpen]       = useState(false)
    const [loading, setLoading] = useState(false)
    const timer = useRef(null)

    useEffect(() => {
        if (!open && !query.trim()) { setResults([]); return }
        
        clearTimeout(timer.current)
        timer.current = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/leads?search=${encodeURIComponent(query)}&limit=10`)
                const json = await res.json()
                setResults(json.leads || json.data || [])
            } catch { setResults([]) }
            finally { setLoading(false) }
        }, 300)
        return () => clearTimeout(timer.current)
    }, [query, open])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-white text-sm transition-colors',
                        'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        !value && 'text-muted-foreground'
                    )}
                >
                    <span className="flex items-center gap-2 truncate">
                        <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        {value && valueLabel ? valueLabel : 'Link to a lead... (optional)'}
                    </span>
                    <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <div className="flex flex-col rounded-md bg-popover text-popover-foreground shadow-xl border">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-40" />
                        <input
                            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Search lead name or email..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div 
                        className="max-h-[220px] overflow-y-auto scrollbar-thin"
                        onWheel={e => e.stopPropagation()}
                    >
                        {loading ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">Searching leads...</div>
                        ) : (
                            <div className="p-1">
                                <button
                                    type="button"
                                    onClick={() => { onChange(null, null); setOpen(false); setQuery('') }}
                                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer text-muted-foreground hover:bg-slate-100"
                                >
                                    <span>None</span>
                                    {!value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                </button>
                                {results.length === 0 && query.trim() && (
                                    <div className="py-4 text-center text-xs text-muted-foreground">No leads found</div>
                                )}
                                {results.map(lead => (
                                    <button
                                        key={lead.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(lead.id, lead.name)
                                            setOpen(false)
                                            setQuery('')
                                        }}
                                        className={cn(
                                            "w-full flex flex-col items-start gap-0 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-indigo-50 transition-colors text-left",
                                            value === lead.id && "bg-indigo-50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-medium truncate text-slate-900">
                                                    {lead.name}
                                                </span>
                                                {lead.stage && (
                                                    <span 
                                                        className="px-2 py-[0px] rounded-full text-[7px] font-black uppercase tracking-wider border"
                                                        style={{ 
                                                            backgroundColor: `${lead.stage.color}15`, 
                                                            color: lead.stage.color,
                                                            borderColor: `${lead.stage.color}30`
                                                        }}
                                                    >
                                                        {lead.stage.name}
                                                    </span>
                                                )}
                                            </div>
                                            {value === lead.id && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600" />}
                                        </div>
                                        {(lead.phone || lead.mobile || lead.email) && (
                                            <span className="text-[10px] -mt-0.5 text-muted-foreground truncate">
                                                {lead.phone || lead.mobile || lead.email}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

// ─── Project search dropdown ──────────────────────────────────────────────────

function ProjectSelector({ value, valueLabel, onChange, disabled }) {
    const [query, setQuery]     = useState('')
    const [results, setResults] = useState([])
    const [open, setOpen]       = useState(false)
    const [loading, setLoading] = useState(false)
    const timer = useRef(null)

    useEffect(() => {
        if (!open && !query.trim()) { setResults([]); return }
        
        clearTimeout(timer.current)
        timer.current = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/projects?search=${encodeURIComponent(query)}&limit=10`)
                const json = await res.json()
                setResults(json.projects || json.data || [])
            } catch { setResults([]) }
            finally { setLoading(false) }
        }, 300)
        return () => clearTimeout(timer.current)
    }, [query, open])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-white text-sm transition-colors',
                        'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        !value && 'text-muted-foreground'
                    )}
                >
                    <span className="flex items-center gap-2 truncate">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        {value && valueLabel ? valueLabel : 'Select project... (optional)'}
                    </span>
                    <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <div className="flex flex-col rounded-md bg-popover text-popover-foreground shadow-xl border">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-40" />
                        <input
                            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Search project name..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div 
                        className="max-h-[220px] overflow-y-auto scrollbar-thin"
                        onWheel={e => e.stopPropagation()}
                    >
                        {loading ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">Searching projects...</div>
                        ) : (
                            <div className="p-1">
                                <button
                                    type="button"
                                    onClick={() => { onChange(null, null); setOpen(false); setQuery('') }}
                                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer text-muted-foreground hover:bg-slate-100"
                                >
                                    <span>None</span>
                                    {!value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                </button>
                                {results.length === 0 && query.trim() && (
                                    <div className="py-4 text-center text-xs text-muted-foreground">No projects found</div>
                                )}
                                {results.map(proj => (
                                    <button
                                        key={proj.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(proj.id, proj.name)
                                            setOpen(false)
                                            setQuery('')
                                        }}
                                        className={cn(
                                            "w-full flex flex-col items-start gap-0 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-indigo-50 transition-colors text-left",
                                            value === proj.id && "bg-indigo-50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full min-w-0">
                                            <span className="font-medium truncate text-slate-900">
                                                {proj.name}
                                            </span>
                                            {value === proj.id && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600" />}
                                        </div>
                                        {(proj.city || proj.address) && (
                                            <span className="text-[10px] text-muted-foreground -mt-1 truncate">{proj.city || proj.address}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

function UnitSelector({ value, valueLabel, onChange, disabled, projectId }) {
    const [query, setQuery]     = useState('')
    const [results, setResults] = useState([])
    const [open, setOpen]       = useState(false)
    const [loading, setLoading] = useState(false)
    const timer = useRef(null)

    useEffect(() => {
        if (!open && !query.trim()) { setResults([]); return }
        
        clearTimeout(timer.current)
        timer.current = setTimeout(async () => {
            setLoading(true)
            try {
                let url = `/api/inventory/units?search=${encodeURIComponent(query)}&limit=15`
                if (projectId) url += `&project_id=${projectId}`
                const res = await fetch(url)
                const json = await res.json()
                setResults(json.units || [])
            } catch { setResults([]) }
            finally { setLoading(false) }
        }, 300)
        return () => clearTimeout(timer.current)
    }, [query, open, projectId])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-white text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        !value && 'text-muted-foreground'
                    )}
                >
                    <span className="flex items-center gap-2 truncate">
                        <Home className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        {value && valueLabel ? valueLabel : 'Select unit... (optional)'}
                    </span>
                    <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <div className="flex flex-col rounded-md bg-popover text-popover-foreground">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-40" />
                        <input
                            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Search unit number..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                    <div 
                        className="max-h-[220px] overflow-y-auto scrollbar-thin"
                        onWheel={e => e.stopPropagation()}
                    >
                        {loading ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">Searching units...</div>
                        ) : (
                            <div className="p-1">
                                <button
                                    type="button"
                                    onClick={() => { onChange(null); setOpen(false); setQuery('') }}
                                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                >
                                    None
                                    {!value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                </button>
                                {results.map(unit => {
                                    const label = `Unit ${unit.unit_number}${unit.tower?.name ? ` (${unit.tower.name})` : ''}`
                                    const details = [
                                        unit.bedrooms ? `${unit.bedrooms}BHK` : null,
                                        unit.carpet_area ? `${unit.carpet_area} sqft` : null,
                                        unit.total_price ? formatCurrency(unit.total_price) : null,
                                    ].filter(Boolean).join(' · ')

                                    return (
                                        <button
                                            key={unit.id}
                                            type="button"
                                            onClick={() => {
                                                onChange(unit.id, label)
                                                setOpen(false)
                                                setQuery('')
                                            }}
                                            className={cn(
                                                "w-full flex flex-col items-start gap-0 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent transition-colors text-left",
                                                value === unit.id && "bg-accent"
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full min-w-0">
                                                <span className="font-medium truncate text-slate-900">
                                                    {label}
                                                </span>
                                                {value === unit.id && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600" />}
                                            </div>
                                            {details && <span className="text-[10px] -mt-0.5 text-muted-foreground truncate">{details}</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}


// ─── Main Form Fields ─────────────────────────────────────────────────────────

/**
 * Props:
 *   formData        – task form state
 *   onChange        – (field, value) => void
 *   teamMembers     – [{ id, full_name, email }]
 *   canAssignOthers – boolean
 *   compact         – boolean
 *   showLeadProject – boolean (show lead/project selectors, default true)
 *   selectedLeadLabel    – string (display name for selected lead)
 *   selectedProjectLabel – string (display name for selected project)
 *   selectedUnitLabel    – string (display name for selected unit)
 *   onLeadChange    – (leadId, leadName) => void
 *   onProjectChange – (projectId, projectName) => void
 *   onUnitChange    – (unitId, unitLabel) => void
 *   fixedLeadId     – string (if set, lead is pre-set and not changeable)
 *   fixedLeadLabel   – string (display name for fixed lead)
 */
export default function TaskFormFields({
    formData,
    onChange,
    teamMembers = [],
    canAssignOthers = false,
    compact = false,
    showLeadProject = true,
    selectedLeadLabel = null,
    selectedProjectLabel = null,
    selectedUnitLabel = null,
    onLeadChange,
    onProjectChange,
    onUnitChange,
    fixedLeadId = null,
    fixedLeadLabel = null,
}) {
    const sp = compact ? 'space-y-2' : 'space-y-3'
    const lc = compact ? 'text-xs text-muted-foreground' : undefined
    const ih = compact ? 'h-8 text-sm' : undefined

    const selectedDate = formData.due_date ? new Date(formData.due_date + 'T00:00:00') : undefined

    return (
        <div className={sp}>
            {/* Title */}
            <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                <Label className={lc}>
                    Title <span className="text-red-500">*</span>
                </Label>
                <Input
                    value={formData.title}
                    onChange={e => onChange('title', e.target.value)}
                    placeholder="What needs to be done?"
                    className={cn('bg-white', ih)}
                    autoFocus={!compact}
                    required
                />
            </div>

            {/* Description */}
            <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                <Label className={lc}>
                    Description{' '}
                    {!compact && <span className="text-muted-foreground text-xs font-normal">(optional)</span>}
                </Label>
                <Textarea
                    value={formData.description}
                    onChange={e => onChange('description', e.target.value)}
                    placeholder="Add details..."
                    rows={2}
                    className="resize-none text-sm bg-white"
                />
            </div>

            {/* Due Date + Time */}
            <div className="grid grid-cols-2 gap-3">
                <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                    <Label className={lc}>Due Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    'w-full justify-start text-left font-normal bg-white',
                                    compact ? 'h-8 text-xs' : 'h-9 text-sm',
                                    !formData.due_date && 'text-muted-foreground'
                                )}
                            >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                                {formData.due_date
                                    ? formatIndianDate(formData.due_date + 'T00:00:00')
                                    : 'Pick a date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={date =>
                                    onChange('due_date', date ? format(date, 'yyyy-MM-dd') : '')
                                }
                                initialFocus
                            />
                            {formData.due_date && (
                                <div className="border-t p-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full h-7 text-xs text-muted-foreground"
                                        onClick={() => onChange('due_date', '')}
                                    >
                                        Clear date
                                    </Button>
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>
                </div>

                <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                    <Label className={lc}>Time</Label>
                    <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            type="time"
                            value={formData.due_time}
                            onChange={e => onChange('due_time', e.target.value)}
                            onClick={(e) => e.currentTarget.showPicker?.()}
                            className={cn(
                                'pl-9 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden bg-white',
                                compact ? 'h-8 text-xs' : 'h-9 text-sm'
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Priority + Assign To */}
            <div className={cn('grid gap-3', canAssignOthers && teamMembers.length > 0 ? 'grid-cols-2' : 'grid-cols-1')}>
                <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                    <Label className={lc}>Priority</Label>
                    <Select value={formData.priority} onValueChange={v => onChange('priority', v)}>
                        <SelectTrigger className={cn(compact ? 'h-8 text-xs' : 'h-9 text-sm', 'bg-white')}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {canAssignOthers && teamMembers.length > 0 && (
                    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                        <Label className={lc}>Assign To</Label>
                        <Select value={formData.assigned_to} onValueChange={v => onChange('assigned_to', v)}>
                            <SelectTrigger className={cn(compact ? 'h-8 text-xs' : 'h-9 text-sm', 'bg-white')}>
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Unassigned</SelectItem>
                                {teamMembers.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.full_name || m.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Project + Unit Row */}
            {showLeadProject && (
                <div className="grid grid-cols-2 gap-3">
                    {/* Project Selector */}
                    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                        <Label className={lc}>
                            Project{' '}
                            <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                        </Label>
                        <ProjectSelector
                            value={formData.project_id}
                            valueLabel={selectedProjectLabel}
                            onChange={(id, name) => {
                                onChange('project_id', id)
                                onProjectChange?.(id, name)
                            }}
                        />
                    </div>

                    {/* Unit Selector */}
                    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                        <Label className={lc}>
                            Property / Unit{' '}
                            <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                        </Label>
                        {formData.project_id ? (
                            <UnitSelector
                                value={formData.unit_id}
                                valueLabel={selectedUnitLabel}
                                projectId={formData.project_id}
                                onChange={(id, label) => {
                                    onChange('unit_id', id)
                                    onUnitChange?.(id, label)
                                }}
                            />
                        ) : (
                            <div className={cn(
                                "flex items-center gap-2 px-3 border border-dashed rounded-md bg-slate-50/50 text-slate-400 cursor-not-allowed",
                                compact ? 'h-8 text-[11px]' : 'h-9 text-xs'
                            )}>
                                <Building2 className="w-3.5 h-3.5 shrink-0 opacity-40" />
                                <span className="truncate">Select project first</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Lead Selector (Only shown if not fixed) */}
            {showLeadProject && !fixedLeadId && (
                <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                    <Label className={lc}>
                        Link to Lead{' '}
                        <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                    </Label>
                    <LeadSelector
                        value={formData.lead_id}
                        valueLabel={selectedLeadLabel}
                        onChange={(id, name) => {
                            onChange('lead_id', id)
                            onLeadChange?.(id, name)
                        }}
                    />
                </div>
            )}

            {/* Fixed lead display (when inside a lead profile) */}
            {fixedLeadId && fixedLeadLabel && (
                <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                    <Label className={lc}>Linked Lead</Label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50/60 border-blue-200">
                        <Lock className="h-3 w-3 text-blue-400 shrink-0" />
                        <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="text-sm font-medium text-blue-800 flex-1 truncate">{fixedLeadLabel}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
