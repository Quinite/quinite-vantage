'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, User, MapPin, SkipForward } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

// onConfirm(payload | null) — null means user chose to skip booking
export default function SiteVisitStageGateDialog({ open, onOpenChange, lead, agents = [], onConfirm, defaultAgentId }) {
    const [form, setForm] = useState({ date: '', time: '10:00', assigned_agent_id: '', visit_notes: '' })
    const [calOpen, setCalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

    useEffect(() => {
        if (open) setForm({ date: '', time: '10:00', assigned_agent_id: defaultAgentId ?? '', visit_notes: '' })
    }, [open, defaultAgentId])

    const handleBook = async () => {
        if (!form.date || !form.time) { toast.error('Please pick a date and time'); return }
        setLoading(true)
        try {
            const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString()
            await onConfirm({
                scheduled_at,
                assigned_agent_id: (form.assigned_agent_id && form.assigned_agent_id !== '__none__') ? form.assigned_agent_id : null,
                visit_notes:       form.visit_notes       || null,
                booked_via:        'manual',
                status:            'scheduled',
            })
            onOpenChange(false)
        } finally {
            setLoading(false)
        }
    }

    const handleSkip = async () => {
        await onConfirm(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Book a Site Visit
                    </DialogTitle>
                    <DialogDescription>
                        Moving <span className="font-medium text-foreground">{lead?.name}</span> to &quot;Site Visit Scheduled&quot;.
                        Book the visit now or skip and add it later.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-1">
                    {/* Date */}
                    <div className="space-y-1.5">
                        <Label>Visit Date <span className="text-red-500">*</span></Label>
                        <Popover open={calOpen} onOpenChange={setCalOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !form.date && 'text-muted-foreground')}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {form.date ? format(new Date(form.date), 'PPP') : 'Pick a date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={form.date ? new Date(form.date) : undefined}
                                    onSelect={(d) => { if (d) { set('date', format(d, 'yyyy-MM-dd')); setCalOpen(false) } }}
                                    initialFocus
                                    disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Time */}
                    <div className="space-y-1.5">
                        <Label>Visit Time <span className="text-red-500">*</span></Label>
                        <Input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
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
                                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label>Notes</Label>
                        <Textarea value={form.visit_notes} onChange={e => set('visit_notes', e.target.value)} placeholder="Directions, prep notes..." className="resize-none" rows={2} />
                    </div>
                </div>

                <Separator />

                <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                    <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleSkip} disabled={loading}>
                        <SkipForward className="w-3.5 h-3.5" />
                        Skip for now
                    </Button>
                    <div className="flex gap-2 sm:ml-auto">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel move</Button>
                        <Button type="button" onClick={handleBook} disabled={loading}>
                            {loading ? 'Booking...' : 'Book & Move'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
