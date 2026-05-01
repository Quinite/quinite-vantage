'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    ArrowLeft, Loader2, Radio, Play, Pause, XCircle, CheckCircle2,
    Archive, RotateCcw, Settings, Users, Phone, BarChart3,
    AlertTriangle, TrendingUp, TrendingDown, Minus, Clock,
    Building2, Calendar, Zap, Search, UserMinus, Ban,
    ChevronLeft, ChevronRight, RefreshCw, Plus, Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet'
import { usePermission } from '@/contexts/PermissionContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import {
    useCampaign, useCampaignLeads, useCampaignProgress,
    useStartCampaign, usePauseCampaign, useResumeCampaign,
    useCancelCampaign, useCompleteCampaign, useArchiveCampaign,
    useRestoreCampaign, useRestartCampaign, useUpdateCampaign, useEnrollLeads,
    useRemoveLeadFromCampaign, useOptOutLead
} from '@/hooks/useCampaigns'
import { useQueryClient } from '@tanstack/react-query'

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    draft:     { color: 'bg-zinc-500/10 text-zinc-600 border-zinc-200',      label: 'Draft',     dot: 'bg-zinc-400' },
    scheduled: { color: 'bg-blue-500/10 text-blue-600 border-blue-200',      label: 'Scheduled', dot: 'bg-blue-500' },
    running:   { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', label: 'Running', dot: 'bg-emerald-500 animate-pulse' },
    paused:    { color: 'bg-amber-500/10 text-amber-600 border-amber-200',   label: 'Paused',    dot: 'bg-amber-500' },
    completed: { color: 'bg-purple-500/10 text-purple-600 border-purple-200', label: 'Completed', dot: 'bg-purple-500' },
    cancelled: { color: 'bg-red-500/10 text-red-600 border-red-200',        label: 'Cancelled', dot: 'bg-red-500' },
    archived:  { color: 'bg-gray-400/10 text-gray-500 border-gray-200',     label: 'Archived',  dot: 'bg-gray-400' },
    failed:    { color: 'bg-rose-500/10 text-rose-600 border-rose-200',     label: 'Failed',    dot: 'bg-rose-500' },
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    return (
        <Badge variant="outline" className={`${cfg.color} border flex items-center gap-1.5 px-2.5 py-1 font-medium text-xs`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </Badge>
    )
}

// ─── Sentiment helper ──────────────────────────────────────────────────────────
function SentimentIcon({ score }) {
    if (score == null) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />
    if (score >= 0.3) return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
    if (score < -0.1) return <TrendingDown className="w-3.5 h-3.5 text-red-500" />
    return <Minus className="w-3.5 h-3.5 text-amber-500" />
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, className = '' }) {
    return (
        <Card className={`${className}`}>
            <CardContent className="p-4">
                <div className="text-2xl font-bold text-foreground">{value ?? '—'}</div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">{label}</div>
                {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
            </CardContent>
        </Card>
    )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ campaign, progress }) {
    const creditPct = campaign.credit_cap && campaign.credit_spent != null
        ? Math.min(100, Math.round(((campaign.credit_spent || 0) / campaign.credit_cap) * 100))
        : null

    return (
        <div className="space-y-6">
            {/* Progress bar */}
            {progress && (
                <Card>
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">Campaign Progress</span>
                            <span className="text-muted-foreground">{progress.processed} / {progress.total} leads processed</span>
                        </div>
                        <Progress value={progress.percentage} className="h-2" />
                        <div className="grid grid-cols-4 gap-3 pt-1">
                            {[
                                { label: 'Queued', value: progress.queued, color: 'text-blue-600' },
                                { label: 'Calling', value: progress.calling, color: 'text-amber-600' },
                                { label: 'Called', value: progress.called, color: 'text-emerald-600' },
                                { label: 'Failed', value: progress.failed, color: 'text-red-500' },
                            ].map(s => (
                                <div key={s.label} className="text-center">
                                    <div className={`text-lg font-bold ${s.color}`}>{s.value ?? 0}</div>
                                    <div className="text-xs text-muted-foreground">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Calls" value={campaign.total_calls || 0} />
                <StatCard label="Answered" value={campaign.answered_calls || 0} />
                <StatCard label="Transferred" value={campaign.transferred_calls || 0} />
                <StatCard label="Avg Sentiment" value={campaign.avg_sentiment_score != null ? Number(campaign.avg_sentiment_score).toFixed(2) : '—'} />
            </div>

            {/* Credit cap */}
            {campaign.credit_cap != null && (
                <Card>
                    <CardContent className="p-5 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">Credit Budget</span>
                            <span className="text-muted-foreground">₹{Number(campaign.credit_spent || 0).toFixed(2)} / ₹{Number(campaign.credit_cap).toFixed(2)}</span>
                        </div>
                        <Progress value={creditPct} className={`h-2 ${creditPct >= 90 ? '[&>div]:bg-red-500' : creditPct >= 70 ? '[&>div]:bg-amber-500' : ''}`} />
                        {progress?.credit_remaining != null && (
                            <div className="text-xs text-muted-foreground">₹{Number(progress.credit_remaining).toFixed(2)} remaining</div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Details */}
            <Card>
                <CardHeader><CardTitle className="text-sm">Campaign Details</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0 grid gap-3 text-sm">
                    {[
                        { label: 'Projects', value: (campaign.projects?.length > 0 ? campaign.projects : (campaign.project ? [campaign.project] : [])).map(p => p.name).join(', ') || '—' },
                        { label: 'Schedule', value: campaign.start_date && campaign.end_date ? `${campaign.start_date} – ${campaign.end_date}` : '—' },
                        { label: 'Daily Window', value: campaign.time_start && campaign.time_end ? `${campaign.time_start} – ${campaign.time_end} IST` : '—' },
                        { label: 'DND Compliance', value: campaign.dnd_compliance !== false ? 'Enabled (9am–9pm IST)' : 'Disabled' },
                        { label: 'Auto Complete', value: campaign.auto_complete !== false ? 'Yes' : 'No' },
                        { label: 'Language', value: campaign.call_settings?.language || '—' },
                        { label: 'AI Voice', value: campaign.call_settings?.voice_id || '—' },
                    ].map(row => (
                        <div key={row.label} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-medium text-foreground">{row.value}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Lead Status Tabs ──────────────────────────────────────────────────────────
const LEAD_STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'enrolled', label: 'Enrolled' },
    { key: 'queued', label: 'Queued' },
    { key: 'calling', label: 'Calling' },
    { key: 'called', label: 'Called' },
    { key: 'failed', label: 'Failed' },
    { key: 'opted_out', label: 'Opted Out' },
    { key: 'skipped', label: 'Skipped' },
]

function EnrolledLeadsTab({ campaignId, campaignStatus, projectId }) {
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [selected, setSelected] = useState(new Set())
    const [showEnrollPanel, setShowEnrollPanel] = useState(false)
    const [optOutTarget, setOptOutTarget] = useState(null)
    const [optOutReason, setOptOutReason] = useState('')
    const [optOutGlobal, setOptOutGlobal] = useState(false)

    const { data, isLoading, refetch } = useCampaignLeads(campaignId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        page, limit: 50, search
    })
    const removeLead = useRemoveLeadFromCampaign(campaignId)
    const optOut = useOptOutLead(campaignId)

    const leads = data?.leads || []
    const counts = data?.status_counts || {}
    const hasMore = data?.hasMore || false

    function toggleSelect(id) {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function toggleAll() {
        if (selected.size === leads.length) setSelected(new Set())
        else setSelected(new Set(leads.map(l => l.lead_id)))
    }

    async function handleBulkRemove() {
        for (const leadId of selected) {
            await removeLead.mutateAsync(leadId)
        }
        setSelected(new Set())
    }

    async function handleOptOut() {
        if (!optOutTarget || !optOutReason.trim()) return
        await optOut.mutateAsync({ leadId: optOutTarget, reason: optOutReason, globalDnc: optOutGlobal })
        setOptOutTarget(null)
        setOptOutReason('')
        setOptOutGlobal(false)
    }

    const canModify = !['completed', 'cancelled', 'archived'].includes(campaignStatus)

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search leads..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        className="pl-9 h-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    {canModify && (
                        <Button size="sm" onClick={() => setShowEnrollPanel(true)} className="h-9">
                            <Plus className="w-4 h-4 mr-1.5" /> Add Leads
                        </Button>
                    )}
                </div>
            </div>

            {/* Status tab bar */}
            <div className="flex gap-1 flex-wrap">
                {LEAD_STATUS_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setStatusFilter(tab.key); setPage(1); setSelected(new Set()) }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${statusFilter === tab.key
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    >
                        {tab.label}
                        {tab.key !== 'all' && counts[tab.key] > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-background/30 text-[10px]">{counts[tab.key]}</span>
                        )}
                        {tab.key === 'all' && data?.total > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-background/30 text-[10px]">{data.total}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Bulk actions */}
            {selected.size > 0 && (
                <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                    <span className="text-sm font-medium text-primary">{selected.size} selected</span>
                    <Button variant="outline" size="sm" onClick={handleBulkRemove} disabled={removeLead.isPending} className="h-7 text-xs">
                        <UserMinus className="w-3.5 h-3.5 mr-1" /> Remove Selected
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="h-7 text-xs ml-auto">
                        Clear
                    </Button>
                </div>
            )}

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : leads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No leads found</p>
                    {canModify && <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowEnrollPanel(true)}>Add Leads</Button>}
                </div>
            ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                {canModify && (
                                    <th className="p-3 w-8">
                                        <input type="checkbox" checked={selected.size === leads.length && leads.length > 0} onChange={toggleAll} className="rounded" />
                                    </th>
                                )}
                                <th className="p-3 text-left font-medium text-muted-foreground">Lead</th>
                                <th className="p-3 text-left font-medium text-muted-foreground hidden md:table-cell">Status</th>
                                <th className="p-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Last Called</th>
                                <th className="p-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Sentiment</th>
                                {canModify && <th className="p-3 w-20" />}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {leads.map(row => (
                                <tr key={row.lead_id} className="hover:bg-muted/30 transition-colors">
                                    {canModify && (
                                        <td className="p-3">
                                            <input type="checkbox" checked={selected.has(row.lead_id)} onChange={() => toggleSelect(row.lead_id)} className="rounded" />
                                        </td>
                                    )}
                                    <td className="p-3">
                                        <div className="font-medium text-foreground truncate max-w-[180px]">{row.lead?.name || '—'}</div>
                                        <div className="text-xs text-muted-foreground">{row.lead?.phone || '—'}</div>
                                    </td>
                                    <td className="p-3 hidden md:table-cell">
                                        <LeadStatusBadge status={row.status} skipReason={row.skip_reason} />
                                    </td>
                                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">
                                        {row.last_call_attempt_at
                                            ? new Date(row.last_call_attempt_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                            : '—'}
                                    </td>
                                    <td className="p-3 hidden lg:table-cell">
                                        <div className="flex items-center gap-1">
                                            <SentimentIcon score={row.call_log?.sentiment_score} />
                                            <span className="text-xs text-muted-foreground">
                                                {row.call_log?.sentiment_score != null ? Number(row.call_log.sentiment_score).toFixed(2) : '—'}
                                            </span>
                                        </div>
                                    </td>
                                    {canModify && (
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                {['enrolled', 'queued', 'calling', 'called', 'failed'].includes(row.status) && (
                                                    <>
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            onClick={() => removeLead.mutate(row.lead_id)}
                                                            disabled={removeLead.isPending}
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                            title="Remove from campaign"
                                                        >
                                                            <UserMinus className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            onClick={() => setOptOutTarget(row.lead_id)}
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600"
                                                            title="Opt out"
                                                        >
                                                            <Ban className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {(page > 1 || hasMore) && (
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {page}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Enroll Panel */}
            <LeadEnrollmentPanel
                open={showEnrollPanel}
                onClose={() => setShowEnrollPanel(false)}
                campaignId={campaignId}
                projectId={projectId}
            />

            {/* Opt-out Dialog */}
            <Dialog open={!!optOutTarget} onOpenChange={(v) => { if (!v) setOptOutTarget(null) }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Ban className="w-4 h-4 text-amber-500" /> Opt Out Lead</DialogTitle>
                        <DialogDescription>This will prevent the lead from receiving further calls in this campaign.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Reason</Label>
                            <Input placeholder="e.g. Requested by lead" value={optOutReason} onChange={e => setOptOutReason(e.target.value)} />
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={optOutGlobal} onChange={e => setOptOutGlobal(e.target.checked)} className="rounded" />
                            <span>Also mark as Do Not Call (all campaigns)</span>
                        </label>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOptOutTarget(null)}>Cancel</Button>
                        <Button onClick={handleOptOut} disabled={!optOutReason.trim() || optOut.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
                            {optOut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Opt Out'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function LeadStatusBadge({ status, skipReason }) {
    const cfg = {
        enrolled: 'bg-blue-500/10 text-blue-600 border-blue-200',
        queued:   'bg-sky-500/10 text-sky-600 border-sky-200',
        calling:  'bg-amber-500/10 text-amber-600 border-amber-200',
        called:   'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        failed:   'bg-red-500/10 text-red-600 border-red-200',
        opted_out:'bg-orange-500/10 text-orange-600 border-orange-200',
        skipped:  'bg-zinc-400/10 text-zinc-500 border-zinc-200',
        archived: 'bg-gray-300/10 text-gray-400 border-gray-200',
    }
    return (
        <Badge variant="outline" className={`${cfg[status] || cfg.skipped} border text-[10px] px-2 py-0.5`} title={skipReason || undefined}>
            {status?.replace('_', ' ')}
        </Badge>
    )
}

// ─── Lead Enrollment Panel ─────────────────────────────────────────────────────
function LeadEnrollmentPanel({ open, onClose, campaignId, projectId }) {
    const [search, setSearch] = useState('')
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(new Set())
    const enrollLeads = useEnrollLeads(campaignId)

    useEffect(() => {
        if (open && projectId) {
            searchLeads()
        } else if (!open) {
            setSearch('')
            setLeads([])
            setSelected(new Set())
        }
    }, [open, projectId])

    async function searchLeads(optionalSearch = search) {
        setLoading(true)
        try {
            const query = new URLSearchParams()
            if (projectId) query.append('project_id', projectId)
            if (optionalSearch) query.append('search', optionalSearch)
            query.append('limit', '100')
            
            const res = await fetch(`/api/leads?${query.toString()}`)
            const data = await res.json()
            setLeads(data.leads || [])
        } finally {
            setLoading(false)
        }
    }

    function toggleLead(id) {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function toggleAll() {
        if (selected.size === leads.length && leads.length > 0) {
            setSelected(new Set())
        } else {
            setSelected(new Set(leads.map(l => l.id)))
        }
    }

    async function handleEnroll() {
        if (selected.size === 0) return
        await enrollLeads.mutateAsync({ lead_ids: [...selected] })
        setSelected(new Set())
        setLeads([])
        setSearch('')
        onClose()
    }

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <SheetContent className="w-full sm:max-w-lg flex flex-col">
                <SheetHeader>
                    <SheetTitle>Add Leads to Campaign</SheetTitle>
                    <SheetDescription>Search and select leads to enroll in this campaign.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search by name or phone..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); searchLeads(e.target.value) }}
                            onKeyDown={e => e.key === 'Enter' && searchLeads()}
                            className="flex-1 h-9 bg-background"
                        />
                        <Button type="button" size="sm" variant="outline" className="h-9 px-3" onClick={toggleAll}>
                            {selected.size === leads.length && leads.length > 0 ? 'Deselect All' : 'Select All'}
                        </Button>
                    </div>

                    {leads.length > 0 && (
                        <div className="space-y-1 border border-border rounded-lg overflow-hidden">
                            {leads.map(lead => (
                                <label key={lead.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(lead.id)}
                                        onChange={() => toggleLead(lead.id)}
                                        className="rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{lead.name}</div>
                                        <div className="text-xs text-muted-foreground">{lead.phone}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    {leads.length === 0 && search && !loading && (
                        <div className="text-center py-8 text-muted-foreground text-sm">No leads found</div>
                    )}
                </div>

                <div className="border-t border-border pt-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{selected.size} lead{selected.size !== 1 ? 's' : ''} selected</span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleEnroll} disabled={selected.size === 0 || enrollLeads.isPending}>
                            {enrollLeads.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                            Enroll {selected.size > 0 ? selected.size : ''} Leads
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

// ─── Call Results Tab ──────────────────────────────────────────────────────────
function CallResultsTab({ campaignId }) {
    const [page, setPage] = useState(1)
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)

    useState(() => {
        async function fetchLogs() {
            setLoading(true)
            try {
                const res = await fetch(`/api/campaigns/${campaignId}/logs?page=${page}&limit=50`)
                if (res.ok) {
                    const data = await res.json()
                    setLogs(data.logs || [])
                    setHasMore(data.hasMore || false)
                }
            } finally {
                setLoading(false)
            }
        }
        if (campaignId) fetchLogs()
    }, [campaignId, page])

    if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    if (!logs.length) return (
        <div className="text-center py-12 text-muted-foreground">
            <Phone className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No call logs yet</p>
        </div>
    )

    return (
        <div className="space-y-3">
            {logs.map(log => (
                <Card key={log.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground text-sm truncate">{log.lead?.name || log.callee_number}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—'} · {log.duration ? `${Math.round(log.duration / 60)}m ${log.duration % 60}s` : '—'}
                            </div>
                            {log.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{log.summary}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <SentimentIcon score={log.sentiment_score} />
                            <Badge variant="outline" className="text-[10px] px-2">{log.call_status || 'unknown'}</Badge>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ campaign }) {
    const [form, setForm] = useState({
        name: campaign.name || '',
        description: campaign.description || '',
        time_start: campaign.time_start || '',
        time_end: campaign.time_end || '',
        credit_cap: campaign.credit_cap ?? '',
        ai_script: campaign.ai_script || '',
        call_settings: campaign.call_settings || { language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 },
        dnd_compliance: campaign.dnd_compliance !== false,
    })

    const updateCampaign = useUpdateCampaign(campaign.id)
    const isLocked = ['completed', 'cancelled', 'archived'].includes(campaign.status)
    const isRunning = ['running', 'paused'].includes(campaign.status)

    async function handleSave() {
        const body = {
            name: form.name,
            description: form.description,
            time_start: form.time_start,
            time_end: form.time_end,
            credit_cap: form.credit_cap !== '' ? Number(form.credit_cap) : null,
            ai_script: form.ai_script || null,
            call_settings: form.call_settings,
            dnd_compliance: form.dnd_compliance,
        }
        await updateCampaign.mutateAsync(body)
    }

    function field(key) {
        return { value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {isLocked && (
                <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4" /> This campaign is {campaign.status} and cannot be edited.
                </div>
            )}
            {isRunning && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-200 rounded-lg text-sm text-amber-700">
                    <AlertTriangle className="w-4 h-4" /> Campaign is {campaign.status}. Structural fields (project, dates) are locked. AI script changes take effect on the next call.
                </div>
            )}

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label>Campaign Name</Label>
                    <Input {...field('name')} disabled={isLocked} />
                </div>
                <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea {...field('description')} disabled={isLocked} rows={2} />
                </div>

                {/* Read-only when running */}
                {isRunning && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-muted-foreground">Project (locked)</Label>
                            <div className="px-3 py-2 rounded-md border border-border/50 bg-muted/30 text-sm text-muted-foreground">
                              {(campaign.projects?.length > 0 ? campaign.projects : (campaign.project ? [campaign.project] : [])).map(p => p.name).join(', ') || '—'}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-muted-foreground">Date Range (locked)</Label>
                            <div className="px-3 py-2 rounded-md border border-border/50 bg-muted/30 text-sm text-muted-foreground">{campaign.start_date} – {campaign.end_date}</div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Daily Start Time</Label>
                        <Input type="time" {...field('time_start')} disabled={isLocked} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Daily End Time</Label>
                        <Input type="time" {...field('time_end')} disabled={isLocked} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label>Credit Cap (₹) <span className="text-muted-foreground text-xs font-normal">— leave blank for unlimited</span></Label>
                    <Input type="number" min={0} step={0.5} {...field('credit_cap')} disabled={isLocked} placeholder="e.g. 100" />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.dnd_compliance}
                        onChange={e => setForm(f => ({ ...f, dnd_compliance: e.target.checked }))}
                        disabled={isLocked}
                        className="rounded"
                    />
                    <span className="text-sm">DND Compliance — restrict calls to 9am–9pm IST (TRAI)</span>
                </label>

                <div className="pt-2 border-t border-border/50 space-y-4">
                    <Label className="text-sm font-semibold">AI Call Settings</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Language</Label>
                            <select
                                value={form.call_settings.language || 'hinglish'}
                                onChange={e => setForm(f => ({ ...f, call_settings: { ...f.call_settings, language: e.target.value } }))}
                                disabled={isLocked}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                            >
                                <option value="hinglish">Hinglish</option>
                                <option value="hindi">Hindi</option>
                                <option value="english">English</option>
                                <option value="gujarati">Gujarati</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">AI Voice</Label>
                            <select
                                value={form.call_settings.voice_id || 'shimmer'}
                                onChange={e => setForm(f => ({ ...f, call_settings: { ...f.call_settings, voice_id: e.target.value } }))}
                                disabled={isLocked}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                            >
                                <option value="shimmer">Shimmer (Female)</option>
                                <option value="alloy">Alloy (Neutral)</option>
                                <option value="echo">Echo (Male)</option>
                                <option value="nova">Nova (Female)</option>
                                <option value="onyx">Onyx (Male)</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                            AI Script {isRunning && <span className="text-amber-600">(takes effect on next call)</span>}
                        </Label>
                        <Textarea
                            value={form.ai_script}
                            onChange={e => setForm(f => ({ ...f, ai_script: e.target.value }))}
                            rows={5}
                            disabled={isLocked}
                            placeholder="Custom instructions for the AI agent..."
                        />
                    </div>
                </div>
            </div>

            {!isLocked && (
                <Button onClick={handleSave} disabled={updateCampaign.isPending}>
                    {updateCampaign.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
                </Button>
            )}
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CampaignDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const qc = useQueryClient()

    const canRun = usePermission('run_campaigns')
    const canEdit = usePermission('edit_campaigns')
    const { isExpired: subExpired } = useSubscription()

    const { data, isLoading, error } = useCampaign(id)
    const campaign = data?.campaign

    const isRunning = campaign?.status === 'running'
    const { data: progress } = useCampaignProgress(id, isRunning)

    const start = useStartCampaign()
    const pause = usePauseCampaign()
    const resume = useResumeCampaign()
    const cancel = useCancelCampaign()
    const complete = useCompleteCampaign()
    const archive = useArchiveCampaign()
    const restore = useRestoreCampaign()
    const restart = useRestartCampaign()

    const [confirmAction, setConfirmAction] = useState(null)

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
    )

    if (error || !campaign) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <AlertTriangle className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Campaign not found</p>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
        </div>
    )

    const s = campaign.status

    async function doAction(action) {
        setConfirmAction(null)
        if (action === 'start') await start.mutateAsync(id)
        else if (action === 'pause') await pause.mutateAsync(id)
        else if (action === 'resume') await resume.mutateAsync(id)
        else if (action === 'cancel') await cancel.mutateAsync(id)
        else if (action === 'complete') await complete.mutateAsync({ id })
        else if (action === 'archive') await archive.mutateAsync(id)
        else if (action === 'restore') await restore.mutateAsync(id)
        else if (action === 'restart') await restart.mutateAsync(id)
    }

    const anyPending = [start, pause, resume, cancel, complete, archive, restore, restart].some(m => m.isPending)

    return (
        <div className="min-h-screen bg-muted/5">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border">
                <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin/crm/campaigns')} className="h-8 w-8 p-0">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold text-foreground">{campaign.name}</h1>
                                <StatusBadge status={s} />
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3" /> {(campaign.projects?.length > 0 ? campaign.projects : (campaign.project ? [campaign.project] : [])).map(p => p.name).join(', ') || '—'}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {canRun && (
                            <>
                                {['draft', 'scheduled'].includes(s) && (
                                    <Button
                                        size="sm"
                                        onClick={() => setConfirmAction('start')}
                                        disabled={anyPending || subExpired}
                                        title={subExpired ? 'Subscription expired — renew to start campaigns' : undefined}
                                    >
                                        <Play className="w-3.5 h-3.5 mr-1.5" /> Start
                                    </Button>
                                )}
                                {s === 'running' && (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => setConfirmAction('pause')} disabled={anyPending} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                                            <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setConfirmAction('complete')} disabled={anyPending}>
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Complete
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setConfirmAction('cancel')} disabled={anyPending} className="border-red-300 text-red-600 hover:bg-red-50">
                                            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
                                        </Button>
                                    </>
                                )}
                                {s === 'paused' && (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={() => setConfirmAction('resume')}
                                            disabled={anyPending || subExpired}
                                            title={subExpired ? 'Subscription expired — renew to resume campaigns' : undefined}
                                        >
                                            <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setConfirmAction('cancel')} disabled={anyPending} className="border-red-300 text-red-600 hover:bg-red-50">
                                            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
                                        </Button>
                                    </>
                                )}
                                {['completed', 'cancelled'].includes(s) && (
                                    <Button variant="outline" size="sm" onClick={() => setConfirmAction('archive')} disabled={anyPending}>
                                        <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive
                                    </Button>
                                )}
                                {s === 'archived' && (
                                    <Button variant="outline" size="sm" onClick={() => setConfirmAction('restore')} disabled={anyPending}>
                                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restore
                                    </Button>
                                )}
                                {['running', 'paused', 'completed', 'cancelled', 'failed'].includes(s) && (
                                    <Button variant="outline" size="sm" onClick={() => setConfirmAction('restart')} disabled={anyPending} className="border-orange-300 text-orange-600 hover:bg-orange-50">
                                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restart
                                    </Button>
                                )}
                            </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['campaign', id] })} disabled={anyPending} className="h-8 w-8 p-0">
                            <RefreshCw className={`w-4 h-4 ${anyPending ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Live progress strip for running campaigns */}
                {isRunning && progress && (
                    <div className="px-6 pb-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Progress value={progress.percentage} className="h-1.5 flex-1" />
                            <span>{progress.percentage}% · {progress.processed}/{progress.total}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="p-6">
                <Tabs defaultValue="overview">
                    <TabsList className="mb-6">
                        <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1.5" /> Overview</TabsTrigger>
                        <TabsTrigger value="leads"><Users className="w-4 h-4 mr-1.5" /> Enrolled Leads</TabsTrigger>
                        <TabsTrigger value="calls"><Phone className="w-4 h-4 mr-1.5" /> Call Results</TabsTrigger>
                        <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1.5" /> Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <OverviewTab campaign={campaign} progress={progress} />
                    </TabsContent>
                    <TabsContent value="leads">
                        <EnrolledLeadsTab campaignId={id} campaignStatus={s} projectId={campaign?.project_id} />
                    </TabsContent>
                    <TabsContent value="calls">
                        <CallResultsTab campaignId={id} />
                    </TabsContent>
                    <TabsContent value="settings">
                        <SettingsTab campaign={campaign} />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Confirm Dialog */}
            <Dialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="capitalize">{confirmAction} Campaign?</DialogTitle>
                        <DialogDescription>
                            {confirmAction === 'cancel' && 'This will cancel the campaign and clean up all queued calls. Active calls will complete naturally.'}
                            {confirmAction === 'complete' && 'This will mark the campaign as completed. Any pending leads will be left in their current state.'}
                            {confirmAction === 'archive' && 'This will archive the campaign data. You can restore it later.'}
                            {confirmAction === 'restore' && 'This will restore the campaign to draft status.'}
                            {['start', 'pause', 'resume'].includes(confirmAction) && `Confirm ${confirmAction} this campaign?`}
                            {confirmAction === 'restart' && 'This will delete all call logs, clear the call queue, reset all enrolled leads back to "enrolled" status, and set the campaign back to "scheduled". This cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
                        <Button
                            onClick={() => doAction(confirmAction)}
                            className={['cancel', 'restart'].includes(confirmAction) ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
