'use client'

import { useState, useMemo } from 'react'
import { Plus, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSiteVisits, useUpdateSiteVisit, useDeleteSiteVisit } from '@/hooks/useSiteVisits'
import { useUsers, usePipelines } from '@/hooks/usePipelines'
import { isSiteVisitDoneStage } from '@/lib/site-visit-stages'
import SiteVisitCard from './SiteVisitCard'
import BookSiteVisitDialog from './BookSiteVisitDialog'
import SiteVisitOutcomeDialog from './SiteVisitOutcomeDialog'
import { toast } from 'react-hot-toast'

export default function SiteVisitsTab({ leadId, lead }) {
    const { data: visits = [], isLoading } = useSiteVisits(leadId)
    const { data: users = [] } = useUsers()
    const { data: pipelines = [] } = usePipelines()
    const updateMutation = useUpdateSiteVisit(leadId)
    const deleteMutation = useDeleteSiteVisit(leadId)

    const [bookOpen, setBookOpen] = useState(false)
    const [editingVisit, setEditingVisit] = useState(null)
    const [outcomeVisit, setOutcomeVisit] = useState(null)

    const siteVisitDoneStage = useMemo(() => {
        const stages = pipelines[0]?.stages || []
        return stages.find(s => isSiteVisitDoneStage(s.name)) ?? null
    }, [pipelines])

    const handleDelete = async (visit) => {
        if (!confirm('Delete this site visit?')) return
        try {
            await deleteMutation.mutateAsync(visit.id)
            toast.success('Site visit deleted')
        } catch {
            toast.error('Failed to delete')
        }
    }

    const handleMarkNoShow = async (visit) => {
        try {
            await updateMutation.mutateAsync({ visitId: visit.id, status: 'no_show' })
            toast.success('Marked as no show')
        } catch {
            toast.error('Failed to update')
        }
    }

    const handleOutcomeSuccess = async () => {
        if (!siteVisitDoneStage || !lead) return
        if (lead.stage_id === siteVisitDoneStage.id) return
        try {
            await fetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageId: siteVisitDoneStage.id }),
            })
            toast.success('Stage moved to Site Visit Done')
        } catch {
            // non-critical — visit was already saved
        }
    }

    const upcoming = visits
        .filter(v => v.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    const past = visits
        .filter(v => v.status !== 'scheduled')
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Site Visits</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{visits.length} total</p>
                </div>
                <Button size="sm" onClick={() => { setEditingVisit(null); setBookOpen(true) }} className="gap-1.5 h-8 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Book Visit
                </Button>
            </div>

            {isLoading && (
                <div className="space-y-3">
                    {[1,2].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
                </div>
            )}

            {!isLoading && visits.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No site visits yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Book a site visit to schedule a meeting at the property</p>
                    <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setBookOpen(true)}>
                        <Plus className="w-3.5 h-3.5" />
                        Book First Visit
                    </Button>
                </div>
            )}

            {upcoming.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming</p>
                    {upcoming.map(v => (
                        <SiteVisitCard
                            key={v.id}
                            visit={v}
                            onEdit={(visit) => { setEditingVisit(visit); setBookOpen(true) }}
                            onDelete={handleDelete}
                            onMarkComplete={(visit) => setOutcomeVisit(visit)}
                            onMarkNoShow={handleMarkNoShow}
                        />
                    ))}
                </div>
            )}

            {past.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Past</p>
                    {past.map(v => (
                        <SiteVisitCard
                            key={v.id}
                            visit={v}
                            onEdit={(visit) => { setEditingVisit(visit); setBookOpen(true) }}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            <BookSiteVisitDialog
                open={bookOpen}
                onOpenChange={setBookOpen}
                leadId={leadId}
                visit={editingVisit}
                agents={users}
                defaultAgentId={lead?.assigned_to}
            />

            <SiteVisitOutcomeDialog
                open={!!outcomeVisit}
                onOpenChange={(o) => !o && setOutcomeVisit(null)}
                leadId={leadId}
                visit={outcomeVisit}
                onSuccess={handleOutcomeSuccess}
            />
        </div>
    )
}
