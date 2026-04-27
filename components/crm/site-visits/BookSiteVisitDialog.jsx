'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, User, MapPin, FileText, Building, Home, ChevronsUpDown, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { useCreateSiteVisit, useUpdateSiteVisit } from '@/hooks/useSiteVisits'
import { useProjects } from '@/hooks/useProjects'
import { useUnits } from '@/hooks/useUnits'
import { useLeads } from '@/hooks/useLeads'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'react-hot-toast'

const EMPTY = {
    date:              '',
    time:              '10:00',
    assigned_agent_id: '',
    visit_notes:       '',
    project_id:        '',
    unit_id:           '',
}

function toFormData(visit) {
    if (!visit) return EMPTY
    const d = new Date(visit.scheduled_at)
    return {
        date:              format(d, 'yyyy-MM-dd'),
        time:              format(d, 'HH:mm'),
        assigned_agent_id: visit.assigned_agent_id ?? '',
        visit_notes:       visit.visit_notes ?? '',
        project_id:        visit.project_id ?? '',
        unit_id:           visit.unit_id ?? '',
    }
}

export default function BookSiteVisitDialog({ open, onOpenChange, leadId, lead, visit = null, agents = [], onSuccess, defaultAgentId, defaultDate }) {
    const isEdit = !!visit
    const [form, setForm] = useState(EMPTY)
    const [calOpen, setCalOpen] = useState(false)
    const [leadPickerOpen, setLeadPickerOpen] = useState(false)
    const [unitPickerOpen, setUnitPickerOpen] = useState(false)
    const [unitSearch, setUnitSearch] = useState('')
    const [leadSearch, setLeadSearch] = useState('')
    const [selectedLeadId, setSelectedLeadId] = useState('')
    const effectiveLeadId = leadId || selectedLeadId
    const createMutation = useCreateSiteVisit(effectiveLeadId)
    const updateMutation = useUpdateSiteVisit(effectiveLeadId)
    const loading = createMutation.isPending || updateMutation.isPending

    // Only fetch leads when no leadId provided (calendar slot click mode)
    const { data: leadsData } = useLeads(
        !leadId ? { search: leadSearch, limit: 20 } : {}
    )
    const leadOptions = leadsData?.leads ?? []

    // Fetch projects
    const { data: projects = [] } = useProjects()
    
    // Fetch units if project selected
    const { data: rawUnits = [] } = useUnits(form.project_id && form.project_id !== '__none__' ? { projectId: form.project_id } : {})
    const units = rawUnits?.filter(u => u.status !== 'sold') || []

    useEffect(() => {
        if (open) {
            const base = toFormData(visit)
            if (!visit) {
                if (defaultAgentId) base.assigned_agent_id = defaultAgentId
                if (lead?.project_id) base.project_id = lead.project_id
                else if (lead?.project?.id) base.project_id = lead.project.id
                if (defaultDate) base.date = format(new Date(defaultDate), 'yyyy-MM-dd')
            }
            setForm(base)
            setSelectedLeadId('')
            setLeadSearch('')
        }
    }, [open, visit, defaultAgentId, lead, defaultDate])

    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.date || !form.time) {
            toast.error('Please pick a date and time')
            return
        }
        const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString()
        const payload = {
            scheduled_at,
            assigned_agent_id: (form.assigned_agent_id && form.assigned_agent_id !== '__none__') ? form.assigned_agent_id : null,
            visit_notes:       form.visit_notes        || null,
            project_id:        (form.project_id && form.project_id !== '__none__') ? form.project_id : null,
            unit_id:           (form.unit_id && form.unit_id !== '__none__') ? form.unit_id : null,
        }
        try {
            if (isEdit) {
                await updateMutation.mutateAsync({ visitId: visit.id, ...payload })
                toast.success('Site visit updated')
            } else {
                await createMutation.mutateAsync(payload)
                toast.success('Site visit booked')
            }
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            toast.error(err.message || 'Something went wrong')
        }
    }

    const selectedDate = form.date
        ? (() => { const [y, m, d] = form.date.split('-'); return new Date(+y, +m - 1, +d) })()
        : undefined

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {isEdit ? 'Edit Site Visit' : 'Book Site Visit'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    {/* Lead combobox — only shown when opened from calendar (no leadId prop) */}
                    {!leadId && (
                        <div className="space-y-1.5">
                            <Label>Lead <span className="text-red-500">*</span></Label>
                            <Popover open={leadPickerOpen} onOpenChange={setLeadPickerOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className={cn(
                                            'w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-white text-sm transition-colors',
                                            'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                                            !selectedLeadId && 'text-muted-foreground'
                                        )}
                                    >
                                        <span className="flex items-center gap-2 truncate">
                                            <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                            {selectedLeadId
                                                ? leadOptions.find(l => l.id === selectedLeadId)?.name ?? 'Selected'
                                                : 'Search and select lead…'
                                            }
                                        </span>
                                        <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                                    <div className="flex flex-col rounded-md bg-popover text-popover-foreground">
                                        <div className="flex items-center border-b px-3">
                                            <User className="mr-2 h-4 w-4 shrink-0 opacity-40" />
                                            <input
                                                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                placeholder="Search by name or phone…"
                                                value={leadSearch}
                                                onChange={e => setLeadSearch(e.target.value)}
                                            />
                                        </div>
                                        <div
                                            style={{ maxHeight: 220, overflowY: 'auto' }}
                                            onWheel={e => e.stopPropagation()}
                                        >
                                            {leadOptions.length === 0 ? (
                                                <div className="py-4 text-center text-sm text-muted-foreground">
                                                    {leadSearch ? 'No leads found' : 'Start typing to search'}
                                                </div>
                                            ) : (
                                                <div className="p-1">
                                                    {leadOptions.map(l => (
                                                        <div
                                                            key={l.id}
                                                            onClick={() => { setSelectedLeadId(l.id); setLeadPickerOpen(false) }}
                                                            className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                                        >
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-medium truncate">{l.name}</span>
                                                                {l.phone && <span className="text-xs text-muted-foreground">{l.phone}</span>}
                                                            </div>
                                                            {selectedLeadId === l.id && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    {/* Date and Time Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Date */}
                        <div className="space-y-1.5">
                            <Label>Visit Date <span className="text-red-500">*</span></Label>
                            <Popover open={calOpen} onOpenChange={setCalOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn('w-full justify-start text-left font-normal bg-white', !form.date && 'text-muted-foreground')}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                        <span className="truncate">{form.date ? format(new Date(form.date), 'PPP') : 'Pick date'}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(d) => {
                                            if (d) { set('date', format(d, 'yyyy-MM-dd')); setCalOpen(false) }
                                        }}
                                        initialFocus
                                        disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Time */}
                        <div className="space-y-1.5">
                            <Label htmlFor="sv-time">Visit Time <span className="text-red-500">*</span></Label>
                            <Input
                                id="sv-time"
                                type="time"
                                value={form.time}
                                onChange={e => set('time', e.target.value)}
                                className="bg-white"
                                required
                            />
                        </div>
                    </div>

                    {/* Project & Unit Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Project */}
                        <div className="space-y-1.5">
                            <Label>Project</Label>
                            <Select 
                                value={form.project_id} 
                                onValueChange={v => {
                                    set('project_id', v)
                                    set('unit_id', '')
                                    setUnitSearch('')
                                }}
                            >
                                <SelectTrigger className="bg-white">
                                    <Building className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Unit of Interest — combobox */}
                        <div className="space-y-1.5">
                            <Label>Unit of Interest</Label>
                            <Popover open={unitPickerOpen} onOpenChange={setUnitPickerOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        disabled={!form.project_id || form.project_id === '__none__'}
                                        className={cn(
                                            'w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-white text-sm transition-colors',
                                            'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                                            'disabled:opacity-50 disabled:cursor-not-allowed',
                                            !form.unit_id && 'text-muted-foreground'
                                        )}
                                    >
                                        <span className="flex items-center gap-2 truncate">
                                            <Home className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                            {form.unit_id && form.unit_id !== '__none__'
                                                ? (() => {
                                                    const u = units.find(u => u.id === form.unit_id)
                                                    return u ? `Unit ${u.unit_number}${u.tower?.name ? ` (${u.tower.name})` : ''}` : 'Selected'
                                                })()
                                                : (!form.project_id || form.project_id === '__none__')
                                                    ? 'Select project first'
                                                    : units.length === 0 ? 'No units available' : 'Select unit'
                                            }
                                        </span>
                                        <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                                    <div className="flex flex-col rounded-md bg-popover text-popover-foreground">
                                        <div className="flex items-center border-b px-3">
                                            <Home className="mr-2 h-4 w-4 shrink-0 opacity-40" />
                                            <input
                                                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                placeholder="Search unit…"
                                                value={unitSearch}
                                                onChange={e => setUnitSearch(e.target.value)}
                                            />
                                        </div>
                                        <div
                                            style={{ maxHeight: 220, overflowY: 'auto' }}
                                            onWheel={e => e.stopPropagation()}
                                        >
                                            {(() => {
                                                const filtered = units.filter(u => {
                                                    if (!unitSearch) return true
                                                    const q = unitSearch.toLowerCase()
                                                    return (
                                                        String(u.unit_number).includes(q) ||
                                                        u.tower?.name?.toLowerCase().includes(q) ||
                                                        (u.bedrooms && `${u.bedrooms}bhk`.includes(q))
                                                    )
                                                })
                                                if (filtered.length === 0) return (
                                                    <div className="py-4 text-center text-sm text-muted-foreground">No units found</div>
                                                )
                                                return (
                                                    <div className="p-1">
                                                        <div
                                                            onClick={() => { set('unit_id', ''); setUnitPickerOpen(false) }}
                                                            className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                        >
                                                            None
                                                            {!form.unit_id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                                        </div>
                                                        {filtered.map(u => {
                                                            const details = [
                                                                u.bedrooms ? `${u.bedrooms}BHK` : null,
                                                                u.carpet_area ? `${u.carpet_area} sqft` : null,
                                                                u.base_price ? formatCurrency(u.base_price) : null,
                                                            ].filter(Boolean).join(' · ')
                                                            return (
                                                                <div
                                                                    key={u.id}
                                                                    onClick={() => { set('unit_id', u.id); setUnitPickerOpen(false) }}
                                                                    className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                                                >
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="font-medium truncate">
                                                                            Unit {u.unit_number}{u.tower?.name ? ` (${u.tower.name})` : ''}
                                                                        </span>
                                                                        {details && <span className="text-xs text-muted-foreground">{details}</span>}
                                                                    </div>
                                                                    {form.unit_id === u.id && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600" />}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Agent Field (Half Width) */}
                    <div className="grid grid-cols-2 gap-4">
                        {agents.length > 0 && (
                            <div className="space-y-1.5">
                                <Label>Assigned Agent</Label>
                                <Select value={form.assigned_agent_id} onValueChange={v => set('assigned_agent_id', v)}>
                                    <SelectTrigger className="bg-white">
                                        <User className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="Select agent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Unassigned</SelectItem>
                                        {agents.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div></div> {/* Empty div to occupy the right half */}
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label htmlFor="sv-notes">Notes</Label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Textarea
                                id="sv-notes"
                                value={form.visit_notes}
                                onChange={e => set('visit_notes', e.target.value)}
                                placeholder="Any prep notes or directions..."
                                className="pl-9 resize-none bg-white"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !form.date || !form.time || (!leadId && !selectedLeadId)}>
                            {loading ? (isEdit ? 'Saving...' : 'Booking...') : (isEdit ? 'Save Changes' : 'Book Visit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
