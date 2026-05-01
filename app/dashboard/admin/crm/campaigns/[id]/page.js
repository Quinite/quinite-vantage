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
function StatCard({ label, value, sub, icon: Icon, accent = 'text-foreground', trend }) {
    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                        <p className={`text-2xl font-bold ${accent}`}>{value ?? '—'}</p>
                        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                    </div>
                    {Icon && (
                        <div className="p-2 rounded-lg bg-muted/60">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                    )}
                </div>
                {trend != null && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5">
                        {trend > 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : trend < 0 ? <TrendingDown className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-xs text-muted-foreground">{trend > 0 ? `+${trend}` : trend}% vs avg</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ campaign, progress }) {
    const creditPct = campaign.credit_cap && campaign.credit_spent != null
        ? Math.min(100, Math.round(((campaign.credit_spent || 0) / campaign.credit_cap) * 100))
        : null

    const answerRate = campaign.total_calls > 0
        ? Math.round((campaign.answered_calls / campaign.total_calls) * 100)
        : null

    const transferRate = campaign.answered_calls > 0
        ? Math.round((campaign.transferred_calls / campaign.answered_calls) * 100)
        : null

    const sentiment = campaign.avg_sentiment_score != null ? Number(campaign.avg_sentiment_score) : null
    const sentimentLabel = sentiment == null ? null : sentiment > 0.3 ? 'Positive' : sentiment < -0.1 ? 'Negative' : 'Neutral'
    const sentimentColor = sentiment == null ? 'text-foreground' : sentiment > 0.3 ? 'text-emerald-600' : sentiment < -0.1 ? 'text-red-500' : 'text-amber-500'

    const projectNames = (campaign.projects?.length > 0 ? campaign.projects : (campaign.project ? [campaign.project] : [])).map(p => p.name)

    return (
        <div className="space-y-6">

            {/* Campaign Progress Card */}
            {progress && (
                <Card className="border-border/60">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Campaign Progress</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{progress.processed} of {progress.total} leads processed</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-foreground">{progress.percentage ?? 0}%</span>
                            </div>
                        </div>

                        {/* Multi-segment progress bar */}
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex gap-px">
                            {progress.total > 0 && (
                                <>
                                    <div className="bg-emerald-500 h-full rounded-l-full transition-all duration-700" style={{ width: `${((progress.called || 0) / progress.total) * 100}%` }} />
                                    <div className="bg-amber-400 h-full transition-all duration-700" style={{ width: `${((progress.calling || 0) / progress.total) * 100}%` }} />
                                    <div className="bg-blue-400 h-full transition-all duration-700" style={{ width: `${((progress.queued || 0) / progress.total) * 100}%` }} />
                                    <div className="bg-red-400 h-full rounded-r-full transition-all duration-700" style={{ width: `${((progress.failed || 0) / progress.total) * 100}%` }} />
                                </>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="grid grid-cols-4 gap-3 mt-4">
                            {[
                                { label: 'Called', value: progress.called ?? 0, dot: 'bg-emerald-500' },
                                { label: 'Calling', value: progress.calling ?? 0, dot: 'bg-amber-400' },
                                { label: 'Queued', value: progress.queued ?? 0, dot: 'bg-blue-400' },
                                { label: 'Failed', value: progress.failed ?? 0, dot: 'bg-red-400' },
                            ].map(s => (
                                <div key={s.label} className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                                    <div>
                                        <div className="text-sm font-semibold text-foreground">{s.value}</div>
                                        <div className="text-[10px] text-muted-foreground">{s.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Calls"
                    value={campaign.total_calls || 0}
                    icon={Phone}
                    sub={campaign.total_enrolled > 0 ? `of ${campaign.total_enrolled} enrolled` : undefined}
                />
                <StatCard
                    label="Answer Rate"
                    value={answerRate != null ? `${answerRate}%` : `${campaign.answered_calls || 0}`}
                    icon={CheckCircle2}
                    accent={answerRate >= 60 ? 'text-emerald-600' : answerRate >= 30 ? 'text-amber-500' : 'text-foreground'}
                    sub={answerRate != null ? `${campaign.answered_calls || 0} answered` : 'answered'}
                />
                <StatCard
                    label="Transfer Rate"
                    value={transferRate != null ? `${transferRate}%` : `${campaign.transferred_calls || 0}`}
                    icon={Zap}
                    accent={transferRate >= 20 ? 'text-emerald-600' : 'text-foreground'}
                    sub={`${campaign.transferred_calls || 0} escalated`}
                />
                <StatCard
                    label="Avg Sentiment"
                    value={sentiment != null ? sentiment.toFixed(2) : '—'}
                    icon={BarChart3}
                    accent={sentimentColor}
                    sub={sentimentLabel}
                />
            </div>

            {/* Credit Budget */}
            {campaign.credit_cap != null && (
                <Card className="border-border/60">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Credit Budget</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    ₹{Number(campaign.credit_spent || 0).toFixed(2)} spent of ₹{Number(campaign.credit_cap).toFixed(2)} cap
                                </p>
                            </div>
                            <span className={`text-sm font-bold tabular-nums ${creditPct >= 90 ? 'text-red-500' : creditPct >= 70 ? 'text-amber-500' : 'text-foreground'}`}>
                                {creditPct ?? 0}%
                            </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${creditPct >= 90 ? 'bg-red-500' : creditPct >= 70 ? 'bg-amber-400' : 'bg-primary'}`}
                                style={{ width: `${creditPct ?? 0}%` }}
                            />
                        </div>
                        {creditPct >= 80 && (
                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> ₹{(Number(campaign.credit_cap) - Number(campaign.credit_spent || 0)).toFixed(2)} remaining
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Campaign Details */}
            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid sm:grid-cols-2 gap-px bg-border/40 rounded-lg overflow-hidden border border-border/40">
                        {[
                            { label: 'Projects', value: projectNames.length > 0 ? projectNames.join(', ') : '—', icon: Building2 },
                            { label: 'Schedule', value: campaign.start_date && campaign.end_date ? `${campaign.start_date} – ${campaign.end_date}` : '—', icon: Calendar },
                            { label: 'Daily Window', value: campaign.time_start && campaign.time_end ? `${campaign.time_start.slice(0,5)} – ${campaign.time_end.slice(0,5)} IST` : '—', icon: Clock },
                            { label: 'Language', value: campaign.call_settings?.language ? campaign.call_settings.language.charAt(0).toUpperCase() + campaign.call_settings.language.slice(1) : '—', icon: Zap },
                            { label: 'AI Voice', value: campaign.call_settings?.voice_id ? campaign.call_settings.voice_id.charAt(0).toUpperCase() + campaign.call_settings.voice_id.slice(1) : '—', icon: Radio },
                            { label: 'DND Compliance', value: campaign.dnd_compliance !== false ? '✓ Enabled (9am–9pm IST)' : 'Disabled', icon: AlertTriangle },
                        ].map(row => (
                            <div key={row.label} className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/30 transition-colors">
                                <row.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground w-28 shrink-0">{row.label}</span>
                                <span className="text-sm font-medium text-foreground truncate">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Lead Status config ────────────────────────────────────────────────────────
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

const LEAD_STATUS_STYLE = {
    enrolled: 'bg-blue-500/10 text-blue-600 border-blue-200',
    queued:   'bg-sky-500/10 text-sky-600 border-sky-200',
    calling:  'bg-amber-500/10 text-amber-600 border-amber-200',
    called:   'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    failed:   'bg-red-500/10 text-red-600 border-red-200',
    opted_out:'bg-orange-500/10 text-orange-600 border-orange-200',
    skipped:  'bg-zinc-400/10 text-zinc-500 border-zinc-200',
    archived: 'bg-gray-300/10 text-gray-400 border-gray-200',
}

function LeadStatusBadge({ status, skipReason }) {
    return (
        <Badge variant="outline" className={`${LEAD_STATUS_STYLE[status] || LEAD_STATUS_STYLE.skipped} border text-[10px] px-2 py-0.5 capitalize`} title={skipReason || undefined}>
            {status?.replace('_', ' ')}
        </Badge>
    )
}

// ─── Retry countdown ───────────────────────────────────────────────────────────
function useRetryCountdown(nextRetryAt) {
    const [label, setLabel] = useState('')

    useEffect(() => {
        function compute() {
            if (!nextRetryAt) return ''
            const diff = new Date(nextRetryAt) - Date.now()
            if (diff <= 0) return 'Retrying soon'
            const totalMins = Math.ceil(diff / 60000)
            if (totalMins < 60) return `Retry in ${totalMins}m`
            const h = Math.floor(totalMins / 60)
            const m = totalMins % 60
            return m > 0 ? `Retry in ${h}h ${m}m` : `Retry in ${h}h`
        }
        setLabel(compute())
        const t = setInterval(() => setLabel(compute()), 60000)
        return () => clearInterval(t)
    }, [nextRetryAt])

    return label
}

// ─── Lead Card ─────────────────────────────────────────────────────────────────
function LeadCard({ row, selected, onSelect, onRemove, onOptOut, canModify, removeIsPending }) {
    const MAX_ATTEMPTS = 4
    const queueItem = Array.isArray(row.queue_item) ? row.queue_item[0] : row.queue_item
    const attemptCount = queueItem?.attempt_count ?? null
    const nextRetryAt = queueItem?.next_retry_at ?? null
    const isFailed = row.status === 'failed'
    const maxReached = isFailed && attemptCount != null && attemptCount >= MAX_ATTEMPTS
    const retryLabel = useRetryCountdown(maxReached ? null : nextRetryAt)

    const failureReason = row.call_log?.call_status
    const sentiment = row.call_log?.sentiment_score != null ? Number(row.call_log.sentiment_score) : null
    const sentimentLabel = sentiment == null ? null : sentiment >= 0.3 ? 'Positive' : sentiment < -0.1 ? 'Negative' : 'Neutral'

    const canAction = canModify && ['enrolled', 'queued', 'calling', 'called', 'failed'].includes(row.status)

    return (
        <div className={`relative rounded-xl border bg-card flex flex-col overflow-hidden transition-shadow hover:shadow-sm ${isFailed ? 'border-red-200 dark:border-red-900/50' : 'border-border'}`}>
            <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Top row: checkbox + name + status */}
                <div className="flex items-start gap-3">
                    {canModify && (
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={onSelect}
                            className="mt-0.5 rounded shrink-0"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">{row.lead?.name || '—'}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{row.lead?.phone || '—'}</div>
                    </div>
                    <LeadStatusBadge status={row.status} skipReason={row.skip_reason} />
                </div>

                {/* Pills row */}
                <div className="flex flex-wrap gap-1.5">
                    {row.lead?.interest_level && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/10 text-violet-600 border border-violet-200 capitalize">
                            {row.lead.interest_level}
                        </span>
                    )}
                    {row.lead?.score != null && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                            Score {row.lead.score}
                        </span>
                    )}
                    {sentiment != null && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            sentiment >= 0.3 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                            sentiment < -0.1 ? 'bg-red-500/10 text-red-600 border-red-200' :
                            'bg-amber-500/10 text-amber-600 border-amber-200'
                        }`}>
                            <SentimentIcon score={sentiment} />
                            {sentimentLabel}
                        </span>
                    )}
                </div>

                {/* Bottom row: last called + actions */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {row.last_call_attempt_at
                            ? `Last called ${new Date(row.last_call_attempt_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                            : 'Not yet called'}
                    </span>
                    {canAction && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => onRemove(row.lead_id)}
                                disabled={removeIsPending}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Remove from campaign"
                            >
                                <UserMinus className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => onOptOut(row.lead_id)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600"
                                title="Opt out"
                            >
                                <Ban className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Failed banner */}
            {isFailed && (
                <div className={`flex items-center justify-between px-4 py-2 border-t text-xs ${
                    maxReached
                        ? 'bg-muted/60 border-border text-muted-foreground'
                        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                }`}>
                    <div className="flex items-center gap-2">
                        {failureReason && (
                            <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] uppercase tracking-wide ${
                                maxReached ? 'bg-muted text-muted-foreground' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                            }`}>
                                {failureReason.replace(/[-_]/g, ' ')}
                            </span>
                        )}
                        {attemptCount != null && (
                            <span className={maxReached ? 'text-muted-foreground' : 'text-red-700 dark:text-red-400'}>
                                Attempt {Math.min(attemptCount, MAX_ATTEMPTS)} of {MAX_ATTEMPTS}
                            </span>
                        )}
                    </div>
                    <span className={`font-medium ${maxReached ? 'text-muted-foreground' : 'text-red-700 dark:text-red-400'}`}>
                        {maxReached ? 'Max attempts reached' : (retryLabel || 'Pending retry')}
                    </span>
                </div>
            )}
        </div>
    )
}

// ─── Enrolled Leads Tab ────────────────────────────────────────────────────────
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

    function emptyMessage() {
        if (statusFilter === 'failed') return 'No failed leads — all calls connected successfully'
        if (statusFilter === 'enrolled') return 'No leads enrolled yet'
        if (search) return 'No leads match your search'
        return 'No leads found'
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                {canModify && (
                    <input
                        type="checkbox"
                        checked={leads.length > 0 && selected.size === leads.length}
                        onChange={toggleAll}
                        className="rounded shrink-0"
                        title="Select all on this page"
                    />
                )}
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

            {/* Bulk action strip */}
            {selected.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                    <span className="text-sm font-medium text-primary">{selected.size} selected</span>
                    <Button variant="outline" size="sm" onClick={handleBulkRemove} disabled={removeLead.isPending} className="h-7 text-xs">
                        <UserMinus className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="h-7 text-xs ml-auto">
                        Clear
                    </Button>
                </div>
            )}

            {/* Pill filter bar */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {LEAD_STATUS_TABS.map(tab => {
                    const count = tab.key === 'all' ? data?.total : counts[tab.key]
                    return (
                        <button
                            key={tab.key}
                            onClick={() => { setStatusFilter(tab.key); setPage(1); setSelected(new Set()) }}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                statusFilter === tab.key
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                                    statusFilter === tab.key ? 'bg-white/20' : 'bg-muted'
                                }`}>{count}</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Cards */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : leads.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{emptyMessage()}</p>
                    {canModify && statusFilter === 'all' && !search && (
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowEnrollPanel(true)}>Add Leads</Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {leads.map(row => (
                        <LeadCard
                            key={row.lead_id}
                            row={row}
                            selected={selected.has(row.lead_id)}
                            onSelect={() => toggleSelect(row.lead_id)}
                            onRemove={id => removeLead.mutate(id)}
                            onOptOut={id => setOptOutTarget(id)}
                            canModify={canModify}
                            removeIsPending={removeLead.isPending}
                        />
                    ))}
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
const CALL_STATUS_STYLE = {
    completed:   'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    transferred: 'bg-blue-500/10 text-blue-700 border-blue-200',
    in_progress: 'bg-amber-500/10 text-amber-700 border-amber-200',
    failed:      'bg-red-500/10 text-red-700 border-red-200',
    unknown:     'bg-zinc-400/10 text-zinc-500 border-zinc-200',
}

function CallResultsTab({ campaignId }) {
    const [page, setPage] = useState(1)
    const [logs, setLogs] = useState([])
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)

    useEffect(() => {
        async function fetchLogs() {
            setLoading(true)
            try {
                const res = await fetch(`/api/campaigns/${campaignId}/logs?page=${page}&limit=50`)
                if (res.ok) {
                    const data = await res.json()
                    setLogs(data.logs || [])
                    setSummary(data.summary || null)
                    setHasMore(data.hasMore || false)
                }
            } finally {
                setLoading(false)
            }
        }
        if (campaignId) fetchLogs()
    }, [campaignId, page])

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
    )

    if (!logs.length) return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Phone className="w-5 h-5 opacity-40" />
            </div>
            <p className="text-sm font-medium">No call logs yet</p>
            <p className="text-xs">Logs will appear here once calls start</p>
        </div>
    )

    return (
        <div className="space-y-4">
            {/* Summary strip */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Calls', value: summary.totalCalls },
                        { label: 'Answered', value: summary.answeredCalls },
                        { label: 'Transferred', value: summary.transferred },
                        { label: 'Avg Sentiment', value: summary.avgSentiment != null ? Number(summary.avgSentiment).toFixed(2) : '—' },
                    ].map(s => (
                        <div key={s.label} className="bg-muted/40 rounded-xl px-4 py-3 border border-border/40">
                            <div className="text-lg font-bold text-foreground">{s.value ?? '—'}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Log list */}
            <div className="space-y-2">
                {logs.map(log => {
                    const statusKey = log.call_status || 'unknown'
                    const statusStyle = CALL_STATUS_STYLE[statusKey] || CALL_STATUS_STYLE.unknown
                    const mins = log.duration ? Math.floor(log.duration / 60) : 0
                    const secs = log.duration ? log.duration % 60 : 0
                    const durationStr = log.duration ? `${mins}m ${secs}s` : null
                    const score = log.sentiment_score != null ? Number(log.sentiment_score) : null

                    return (
                        <div key={log.id} className="group flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-sm transition-all duration-150">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                                {(log.lead?.name || '?').charAt(0).toUpperCase()}
                            </div>

                            {/* Main content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-foreground">{log.lead?.name || log.lead?.phone || '—'}</span>
                                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium border ${statusStyle}`}>
                                        {statusKey.replace('_', ' ')}
                                    </Badge>
                                    {log.transferred && (
                                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 border bg-blue-500/10 text-blue-700 border-blue-200">
                                            transferred
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                    {log.created_at && (
                                        <span>{new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                    {durationStr && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {durationStr}
                                        </span>
                                    )}
                                    {log.disconnect_reason && (
                                        <span className="capitalize">{log.disconnect_reason.replace('_', ' ')}</span>
                                    )}
                                </div>
                                {log.summary && (
                                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{log.summary}</p>
                                )}
                            </div>

                            {/* Sentiment */}
                            <div className="shrink-0 flex flex-col items-end gap-1">
                                {score != null && (
                                    <div className={`flex items-center gap-1 text-xs font-medium ${score > 0.3 ? 'text-emerald-600' : score < -0.1 ? 'text-red-500' : 'text-amber-500'}`}>
                                        {score > 0.3 ? <TrendingUp className="w-3.5 h-3.5" /> : score < -0.1 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                        <span>{score.toFixed(2)}</span>
                                    </div>
                                )}
                                {log.interest_level && (
                                    <span className="text-[10px] text-muted-foreground capitalize">{log.interest_level}</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Pagination */}
            {(page > 1 || hasMore) && (
                <div className="flex items-center justify-center gap-3 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums">Page {page}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
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
        if (action === 'start') {
            await start.mutateAsync(id)
            router.push('/dashboard/admin/crm/calls/live')
            return
        }
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
                            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden flex gap-px">
                                <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${((progress.called || 0) / Math.max(progress.total, 1)) * 100}%` }} />
                                <div className="bg-amber-400 h-full transition-all duration-700" style={{ width: `${((progress.calling || 0) / Math.max(progress.total, 1)) * 100}%` }} />
                                <div className="bg-blue-400 h-full transition-all duration-700" style={{ width: `${((progress.queued || 0) / Math.max(progress.total, 1)) * 100}%` }} />
                            </div>
                            <span className="tabular-nums font-medium">{progress.percentage}%</span>
                            <span className="text-muted-foreground/60">{progress.processed}/{progress.total}</span>
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
