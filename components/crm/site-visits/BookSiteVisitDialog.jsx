'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, User, MapPin, FileText } from 'lucide-react'
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
import { toast } from 'react-hot-toast'

const EMPTY = {
    date:              '',
    time:              '10:00',
    assigned_agent_id: '',
    visit_notes:       '',
    project_id:        '',
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
    }
}

export default function BookSiteVisitDialog({ open, onOpenChange, leadId, visit = null, agents = [], projects = [], onSuccess, defaultAgentId }) {
    const isEdit = !!visit
    const [form, setForm] = useState(EMPTY)
    const [calOpen, setCalOpen] = useState(false)
    const createMutation = useCreateSiteVisit(leadId)
    const updateMutation = useUpdateSiteVisit(leadId)
    const loading = createMutation.isPending || updateMutation.isPending

    useEffect(() => {
        if (open) {
            const base = toFormData(visit)
            if (!visit && defaultAgentId) base.assigned_agent_id = defaultAgentId
            setForm(base)
        }
    }, [open, visit, defaultAgentId])

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

    const selectedDate = form.date ? new Date(form.date) : undefined

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
                    {/* Date */}
                    <div className="space-y-1.5">
                        <Label>Visit Date <span className="text-red-500">*</span></Label>
                        <Popover open={calOpen} onOpenChange={setCalOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn('w-full justify-start text-left font-normal', !form.date && 'text-muted-foreground')}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {form.date ? format(new Date(form.date), 'PPP') : 'Pick a date'}
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
                            required
                        />
                    </div>

                    {/* Agent */}
                    {agents.length > 0 && (
                        <div className="space-y-1.5">
                            <Label>Assigned Agent</Label>
                            <Select value={form.assigned_agent_id} onValueChange={v => set('assigned_agent_id', v)}>
                                <SelectTrigger>
                                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Select agent (optional)" />
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

                    {/* Project */}
                    {projects.length > 0 && (
                        <div className="space-y-1.5">
                            <Label>Project</Label>
                            <Select value={form.project_id} onValueChange={v => set('project_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

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
                                className="pl-9 resize-none"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (isEdit ? 'Saving...' : 'Booking...') : (isEdit ? 'Save Changes' : 'Book Visit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
