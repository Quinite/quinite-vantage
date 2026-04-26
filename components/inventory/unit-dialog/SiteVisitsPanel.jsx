'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUnitSiteVisits } from '@/hooks/useSiteVisits'
import SiteVisitCard from '@/components/crm/site-visits/SiteVisitCard'
import BookSiteVisitDialog from '@/components/crm/site-visits/BookSiteVisitDialog'
import SiteVisitOutcomeDialog from '@/components/crm/site-visits/SiteVisitOutcomeDialog'
import { Button } from '@/components/ui/button'
import { CalendarPlus, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function SiteVisitsPanel({ unit, project }) {
  const qc = useQueryClient()
  const { data: visits = [], isLoading } = useUnitSiteVisits(unit?.id)

  const [bookOpen, setBookOpen] = useState(false)
  const [editVisit, setEditVisit] = useState(null)
  const [outcomeVisit, setOutcomeVisit] = useState(null)

  const deleteMutation = useMutation({
    mutationFn: async (visit) => {
      const res = await fetch(`/api/leads/${visit.lead_id}/site-visits/${visit.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-visits-unit', unit?.id] })
      toast.success('Visit deleted')
    },
    onError: () => toast.error('Failed to delete visit'),
  })

  const noShowMutation = useMutation({
    mutationFn: async (visit) => {
      const res = await fetch(`/api/leads/${visit.lead_id}/site-visits/${visit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'no_show' }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-visits-unit', unit?.id] })
      toast.success('Marked as no-show')
    },
    onError: () => toast.error('Failed to update visit'),
  })

  const upcoming = visits.filter(v => v.status === 'scheduled').sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  const past = visits.filter(v => v.status !== 'scheduled').sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))

  const handleBook = () => { setEditVisit(null); setBookOpen(true) }
  const handleEdit = (v) => { setEditVisit(v); setBookOpen(true) }
  const handleDelete = (v) => deleteMutation.mutate(v)
  const handleMarkComplete = (v) => setOutcomeVisit(v)
  const handleMarkNoShow = (v) => noShowMutation.mutate(v)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['site-visits-unit', unit?.id] })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Loading visits…
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Site Visits</p>
          <p className="text-[11px] text-slate-400">
            {visits.length} visit{visits.length !== 1 ? 's' : ''} · {upcoming.length} upcoming · Unit {unit?.unit_number}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleBook}
          className="h-8 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Book Visit
        </Button>
      </div>

      {visits.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">No site visits yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Book a site visit to schedule a property viewing</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBook}
            className="rounded-lg text-xs font-bold"
          >
            Book First Visit
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Upcoming</p>
              {upcoming.map(v => (
                <SiteVisitCard
                  key={v.id}
                  visit={v}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkComplete={handleMarkComplete}
                  onMarkNoShow={handleMarkNoShow}
                />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Past</p>
              {past.map(v => (
                <SiteVisitCard key={v.id} visit={v} />
              ))}
            </div>
          )}
        </div>
      )}

      {bookOpen && (
        <BookSiteVisitDialog
          open={bookOpen}
          onOpenChange={(o) => { setBookOpen(o); if (!o) setEditVisit(null) }}
          leadId={editVisit?.lead_id || unit?.lead_id}
          visit={editVisit}
          projects={project ? [project] : []}
          onSuccess={invalidate}
        />
      )}

      {outcomeVisit && (
        <SiteVisitOutcomeDialog
          open={!!outcomeVisit}
          onOpenChange={(o) => { if (!o) setOutcomeVisit(null) }}
          leadId={outcomeVisit.lead_id}
          visit={outcomeVisit}
          onSuccess={() => { setOutcomeVisit(null); invalidate() }}
        />
      )}
    </div>
  )
}
