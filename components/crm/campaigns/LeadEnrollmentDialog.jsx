'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Users, CheckCircle2, Loader2, Search, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getDefaultAvatar } from '@/lib/avatar-utils'
import { EnrollmentFilterPanel } from './EnrollmentFilterPanel'

const INTEREST_BADGE = {
  high:   { label: 'High',   className: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
  medium: { label: 'Medium', className: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800' },
  low:    { label: 'Low',    className: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
  none:   { label: 'None',   className: 'bg-muted text-muted-foreground border-border' },
}

function ScoreBadge({ score }) {
  if (score == null) return null
  const color = score >= 70 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800'
    : score >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-500 dark:border-yellow-800'
    : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${color}`}>
      {score}
    </span>
  )
}

function LeadRow({ lead }) {
  const ineligible = !!lead.ineligible_reason
  const interest = lead.interest_level ? INTEREST_BADGE[lead.interest_level.toLowerCase()] : null

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors group border-b border-border/40 last:border-0 ${ineligible ? 'opacity-45 bg-muted/20' : 'hover:bg-muted/30'}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden border border-border group-hover:scale-105 transition-transform">
        <img
          src={lead.avatar_url || getDefaultAvatar(lead.name)}
          alt={lead.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-foreground truncate">{lead.name}</span>

          {ineligible ? (
            <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold uppercase border border-destructive/20 shrink-0">
              {lead.ineligible_reason}
            </span>
          ) : (
            <>
              {interest && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${interest.className}`}>
                  {interest.label}
                </span>
              )}
              <ScoreBadge score={lead.score} />
              {lead.source && (
                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/50 uppercase tracking-tighter shrink-0">
                  {lead.source}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground font-medium">{lead.phone || '—'}</span>
          {lead.assigned_to_user?.full_name && (
            <>
              <span className="text-[10px] text-muted-foreground/40">·</span>
              <span className="text-[10px] text-muted-foreground truncate">{lead.assigned_to_user.full_name}</span>
            </>
          )}
        </div>
      </div>

      {lead.stage && (
        <Badge
          variant="outline"
          className="text-[9px] px-2 py-0 h-5 shrink-0 font-bold border-2"
          style={{ borderColor: (lead.stage.color || '#888') + '50', color: lead.stage.color || '#888', backgroundColor: (lead.stage.color || '#888') + '10' }}
        >
          {lead.stage.name}
        </Badge>
      )}
    </div>
  )
}

export function LeadEnrollmentDialog({
  open,
  onOpenChange,
  projectIds,
  stages,
  users,
  sources,
  // Filter state — lifted to parent so it persists when dialog closes
  inclusionFilters,
  setInclusionFilters,
  inclusionLogic,
  setInclusionLogic,
  exclusionFilters,
  setExclusionFilters,
  exclusionLogic,
  setExclusionLogic,
  onConfirm, // (previewCount, previewBreakdown) => void — called when user clicks "Confirm"
}) {
  const [previewCount, setPreviewCount] = useState(null)
  const [previewBreakdown, setPreviewBreakdown] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewLeads, setPreviewLeads] = useState([])
  const [leadSearch, setLeadSearch] = useState('')
  const debounceRef = useRef(null)

  function buildFilterSpec(rows) {
    const spec = {}
    rows.forEach(row => {
      if (row.dimension === 'stage' && row.stage_ids?.length) spec.stage_ids = [...(spec.stage_ids || []), ...row.stage_ids]
      if (row.dimension === 'interest_level' && row.interest_levels?.length) spec.interest_levels = [...(spec.interest_levels || []), ...row.interest_levels]
      if (row.dimension === 'score') { spec.score_min = row.score_min; spec.score_max = row.score_max }
      if (row.dimension === 'assigned_to' && row.assigned_to_ids?.length) spec.assigned_to_ids = [...(spec.assigned_to_ids || []), ...row.assigned_to_ids]
      if (row.dimension === 'source' && row.sources?.length) spec.sources = [...(spec.sources || []), ...row.sources]
      if (row.dimension === 'previously_called') spec.exclude_previously_called = true
    })
    return spec
  }

  useEffect(() => {
    if (!open || !projectIds?.length) { setPreviewCount(null); setPreviewBreakdown(null); setPreviewLeads([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setPreviewLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/campaigns/preview-enrollment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_ids: projectIds,
            inclusion: { filters: buildFilterSpec(inclusionFilters), logic: inclusionLogic },
            exclusion: { filters: buildFilterSpec(exclusionFilters), logic: exclusionLogic },
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setPreviewCount(data.net)
          setPreviewBreakdown({ included: data.included, excluded: data.excluded })
          setPreviewLeads(data.leads || [])
        }
      } catch (_) {} finally { setPreviewLoading(false) }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [open, projectIds, inclusionFilters, exclusionFilters, inclusionLogic, exclusionLogic])

  const filteredLeads = leadSearch.trim()
    ? previewLeads.filter(l =>
        l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
        l.phone?.includes(leadSearch)
      )
    : previewLeads

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-xl">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Lead Enrollment</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Set inclusion and exclusion rules — preview updates live
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-full">
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Body — two columns */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Left — filters */}
          <div className="flex flex-col overflow-y-auto p-5 space-y-4">
            <EnrollmentFilterPanel
              projectIds={projectIds}
              stages={stages}
              users={users}
              sources={sources}
              inclusionFilters={inclusionFilters}
              setInclusionFilters={setInclusionFilters}
              inclusionLogic={inclusionLogic}
              setInclusionLogic={setInclusionLogic}
              exclusionFilters={exclusionFilters}
              setExclusionFilters={setExclusionFilters}
              exclusionLogic={exclusionLogic}
              setExclusionLogic={setExclusionLogic}
              previewCount={previewCount}
              previewBreakdown={previewBreakdown}
              previewLoading={previewLoading}
              noProjectSelected={!projectIds?.length}
            />
          </div>

          {/* Right — lead list */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* List header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-bold text-foreground">
                  {previewLoading
                    ? 'Updating…'
                    : previewCount != null
                      ? `${previewCount} eligible · ${previewLeads.length} total`
                      : 'Lead preview'}
                </span>
                {previewLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              </div>
              {previewBreakdown && !previewLoading && (inclusionFilters.length > 0 || exclusionFilters.length > 0) && (
                <span className="text-[10px] text-muted-foreground">
                  {inclusionFilters.length > 0 && (
                    <span className="text-green-600 font-semibold">+{previewBreakdown.included} incl</span>
                  )}
                  {inclusionFilters.length > 0 && exclusionFilters.length > 0 && <span className="mx-1 text-muted-foreground/40">·</span>}
                  {exclusionFilters.length > 0 && (
                    <span className="text-red-500 font-semibold">−{previewBreakdown.excluded} excl</span>
                  )}
                </span>
              )}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 shrink-0">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone…"
                className="h-6 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
              />
            </div>

            {/* Lead rows */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {previewLoading && previewLeads.length === 0 ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 opacity-60">
                  <Users className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">
                    {previewCount === 0 ? 'No leads match the current filters' : 'No leads to show'}
                  </p>
                </div>
              ) : (
                filteredLeads.map(lead => <LeadRow key={lead.id} lead={lead} />)
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0">
          <div className="text-xs text-muted-foreground">
            {previewCount != null && !previewLoading && (
              <span><span className="font-bold text-foreground">{previewCount}</span> leads will be enrolled when campaign starts</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={previewLoading}
              onClick={() => { onConfirm(previewCount, previewBreakdown); onOpenChange(false) }}
              className="gap-1.5"
            >
              Confirm Enrollment
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
