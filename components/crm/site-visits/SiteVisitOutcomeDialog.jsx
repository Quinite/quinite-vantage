'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdateSiteVisit } from '@/hooks/useSiteVisits'
import { OUTCOME_LABELS } from '@/lib/site-visit-stages'
import { toast } from 'react-hot-toast'

export default function SiteVisitOutcomeDialog({ open, onOpenChange, leadId, visit, onSuccess }) {
    const [outcome, setOutcome] = useState('')
    const [notes, setNotes] = useState('')
    const updateMutation = useUpdateSiteVisit(leadId)

    useEffect(() => {
        if (open && visit) {
            setOutcome(visit.outcome ?? '')
            setNotes(visit.visit_notes ?? '')
        }
    }, [open, visit])

    const handleSubmit = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!outcome) { toast.error('Please select an outcome'); return }
        try {
            await updateMutation.mutateAsync({
                visitId:     visit.id,
                status:      'completed',
                outcome,
                visit_notes: notes || null,
            })
            toast.success('Visit marked as completed')
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            toast.error(err.message || 'Failed to update')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Record Visit Outcome
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    <div className="space-y-1.5">
                        <Label>Outcome <span className="text-red-500">*</span></Label>
                        <Select value={outcome} onValueChange={setOutcome} required>
                            <SelectTrigger>
                                <SelectValue placeholder="How did the visit go?" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(OUTCOME_LABELS).map(([val, label]) => (
                                    <SelectItem key={val} value={val}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Visit summary, follow-up items..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Saving...' : 'Save Outcome'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
