'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
    ArrowLeft, Loader2, Radio, Play, Pause, XCircle, CheckCircle2,
    Archive, RotateCcw, Settings, Users, Phone, BarChart3,
    AlertTriangle, TrendingUp, TrendingDown, Minus, Clock,
    Building2, Calendar, Zap, Search, UserMinus, Ban,
    ChevronLeft, ChevronRight, RefreshCw, Plus, Trash2, UserPlus,
    Moon, Lock, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
    useDeleteCampaign, useUpdateCampaign, useEnrollLeads,
    useRemoveLeadFromCampaign, useOptOutLead
} from '@/hooks/useCampaigns'
import { useQueryClient } from '@tanstack/react-query'
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { CampaignStatusBadge } from '@/components/crm/campaigns/CampaignStatusBadge'
import { CampaignActionButton } from '@/components/crm/campaigns/CampaignActionButton'
import { CampaignOverviewTab } from '@/components/crm/campaigns/CampaignOverviewTab'
import { CampaignCallLogsTab, CampaignAnalyticsTab } from '@/components/crm/campaigns/CampaignCallResultsTab'
import { isReadyToStart, isRunningButPausedForNight } from '@/lib/campaigns/timeWindow'
import { getDefaultAvatar } from '@/lib/avatar-utils'

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    scheduled: { color: 'bg-blue-500/10 text-blue-600 border-blue-200',      label: 'Scheduled', dot: 'bg-blue-500' },
    running:   { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', label: 'Running', dot: 'bg-emerald-500 animate-pulse' },
    paused:    { color: 'bg-amber-500/10 text-amber-600 border-amber-200',   label: 'Paused',    dot: 'bg-amber-500' },
    completed: { color: 'bg-purple-500/10 text-purple-600 border-purple-200', label: 'Completed', dot: 'bg-purple-500' },
    cancelled: { color: 'bg-red-500/10 text-red-600 border-red-200',        label: 'Cancelled', dot: 'bg-red-500' },
    archived:  { color: 'bg-gray-400/10 text-gray-500 border-gray-200',     label: 'Archived',  dot: 'bg-gray-400' },
    failed:    { color: 'bg-rose-500/10 text-rose-600 border-rose-200',     label: 'Failed',    dot: 'bg-rose-500' },
}

const FAIL_REASON_MESSAGES = {
    insufficient_credits:   'Campaign stopped: insufficient call credits. Top up credits to continue.',
    subscription_lapsed:    'Campaign stopped: subscription is inactive. Reactivate to continue.',
    all_leads_unreachable:  'Campaign stopped: all leads were unreachable after maximum retry attempts.',
    provider_error:         'Campaign stopped: persistent calling provider errors. Contact support.',
    worker_error:           'Campaign stopped due to an internal error. Contact support.',
    credit_exhausted:       'Campaign stopped: call credits were exhausted for 30+ minutes.',
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled
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
                                    <div className="flex">
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
                                    {Number(campaign.credit_spent || 0).toFixed(1)} mins used of {Number(campaign.credit_cap).toFixed(1)} min cap
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
                                <AlertTriangle className="w-3 h-3" /> {(Number(campaign.credit_cap) - Number(campaign.credit_spent || 0)).toFixed(1)} mins remaining
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



function LeadAvatar({ name, url }) {
    const [imgError, setImgError] = useState(false)
    const initials = name?.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'
    const fallback = getDefaultAvatar(name)

    return (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            {(url || fallback) && !imgError ? (
                <img
                    src={url || fallback}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                <span className="text-[10px] font-bold text-slate-500">{initials}</span>
            )}
        </div>
    )
}

// ─── Enrolled Leads Tab ────────────────────────────────────────────────────────
function EnrolledLeadsTab({ campaignId, campaignStatus, projectIds = [] }) {
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
                            <Plus className="w-4 h-4" /> Enroll Leads
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
                                    : 'border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted'
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

            {/* Leads Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Interest</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Score</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Source</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sentiment</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Activity</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="w-8 h-8 rounded-full" />
                                                <div className="space-y-1.5 flex-1">
                                                    <Skeleton className="h-4 w-1/3" />
                                                    <Skeleton className="h-3 w-1/4" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded" /></td>
                                        <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded" /></td>
                                        <td className="px-4 py-3"><Skeleton className="h-5 w-10 mx-auto rounded" /></td>
                                        <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded" /></td>
                                        <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded" /></td>
                                        <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded" /></td>
                                        <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-24 ml-auto rounded-lg" /></td>
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-20 text-slate-400" />
                                        <p className="text-sm text-slate-500">{emptyMessage()}</p>
                                    </td>
                                </tr>
                            ) : (
                                leads.map(row => {
                                    const queueItem = Array.isArray(row.queue_item) ? row.queue_item[0] : row.queue_item;
                                    const isFailed = row.status === 'failed';
                                    const sentiment = row.call_log?.sentiment_score != null ? Number(row.call_log.sentiment_score) : null;
                                    const canAction = canModify && ['enrolled', 'queued', 'calling', 'called', 'failed'].includes(row.status);
                                    
                                    return (
                                        <tr key={row.lead_id} className={cn("hover:bg-slate-50/50 transition-colors group", isFailed && "bg-red-50/30")}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <LeadAvatar name={row.lead?.name} url={row.lead?.avatar_url} />
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-slate-900 text-sm truncate">{row.lead?.name || '—'}</div>
                                                        <div className="text-xs text-slate-500 tabular-nums">{row.lead?.phone || '—'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1.5 w-fit">
                                                    <div className="flex items-center gap-2">
                                                        <LeadStatusBadge status={row.status} skipReason={row.skip_reason} />
                                                        {row.attempt_count > 0 && (
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                                Attempt {row.attempt_count}/4
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isFailed && row.call_log?.call_status && (
                                                        <span className="text-[9px] font-bold text-red-600 uppercase tracking-tight">
                                                            {row.call_log.call_status.replace(/[-_]/g, ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.lead?.interest_level ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-violet-100 text-violet-700 border border-violet-200">
                                                        {row.lead.interest_level}
                                                    </span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {row.lead?.score != null ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                        {row.lead.score}
                                                    </span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.lead?.source ? (
                                                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">{row.lead.source}</span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {sentiment != null ? (
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                                        sentiment >= 0.3 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                                        sentiment < -0.1 ? "bg-red-100 text-red-700 border-red-200" :
                                                        "bg-amber-100 text-amber-700 border-amber-200"
                                                    )}>
                                                        <SentimentIcon score={sentiment} />
                                                        {sentiment >= 0.3 ? 'Positive' : sentiment < -0.1 ? 'Negative' : 'Neutral'}
                                                    </span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-slate-600 font-medium tabular-nums">
                                                    {row.last_call_attempt_at
                                                        ? new Date(row.last_call_attempt_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                        : <span className="text-slate-400 italic">Not called</span>}
                                                </div>
                                                {queueItem?.next_retry_at && (
                                                    <div className="text-[10px] text-amber-600 font-bold uppercase mt-1 flex items-center gap-1">
                                                        <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                                                        Retry: {new Date(queueItem.next_retry_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {canAction && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            onClick={() => removeLead.mutate(row.lead_id)}
                                                            disabled={removeLead.isPending}
                                                            className="h-8 px-2.5 text-[11px] font-bold bg-red-50 text-red-600 hover:bg-red-200 hover:text-red-600 rounded-lg uppercase tracking-wider transition-colors"
                                                        >
                                                            <UserMinus className="w-3.5 h-3.5" /> Remove
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            onClick={() => setOptOutTarget(row.lead_id)}
                                                            className="h-8 px-2.5 text-[11px] font-bold bg-amber-50 text-amber-600 hover:bg-amber-200 hover:text-amber-600 rounded-lg uppercase tracking-wider transition-colors"
                                                        >
                                                            <Ban className="w-3.5 h-3.5" /> Opt Out
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
                projectIds={projectIds}
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
function LeadEnrollmentPanel({ open, onClose, campaignId, projectIds = [] }) {
    const [search, setSearch] = useState('')
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(new Set())
    const enrollLeads = useEnrollLeads(campaignId)

    useEffect(() => {
        if (open && projectIds.length > 0) {
            searchLeads()
        } else if (!open) {
            setSearch('')
            setLeads([])
            setSelected(new Set())
        }
    }, [open, projectIds])

    async function searchLeads(optionalSearch = search) {
        setLoading(true)
        try {
            const query = new URLSearchParams()
            if (projectIds.length > 0) query.append('project_ids', projectIds.join(','))
            if (optionalSearch) query.append('search', optionalSearch)
            query.append('limit', '100')
            query.append('view_mode', 'active')
            // Don't show leads already in this campaign
            query.append('not_in_campaign_id', campaignId)
            
            const res = await fetch(`/api/leads?${query.toString()}`)
            const data = await res.json()
            setLeads(data.leads || [])
        } catch (err) {
            console.error('Failed to fetch leads for enrollment:', err)
        } finally {
            setLoading(false)
        }
    }

    const validatePhone = (phone) => {
        if (!phone) return false
        const cleaned = String(phone).replace(/[\s\-().]/g, '')
        let normalized = cleaned
        if (/^\d{10}$/.test(cleaned)) normalized = `+91${cleaned}`
        else if (/^91\d{10}$/.test(cleaned)) normalized = `+${cleaned}`
        return /^\+91[6-9]\d{9}$/.test(normalized)
    }

    function toggleLead(id, disabled) {
        if (disabled) return
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function toggleAll() {
        const selectableLeads = leads.filter(l => !l.do_not_call && !l.opted_out_at && validatePhone(l.phone))
        if (selected.size === selectableLeads.length && selectableLeads.length > 0) {
            setSelected(new Set())
        } else {
            setSelected(new Set(selectableLeads.map(l => l.id)))
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
            <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0 bg-white">
                <SheetHeader className="px-6 py-5 border-b border-slate-100 bg-white">
                    <SheetTitle className="text-lg font-bold text-slate-900">Enroll Leads</SheetTitle>
                    <SheetDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider !mt-0">
                        Select leads from campaign projects to add
                    </SheetDescription>
                </SheetHeader>

                <div className="px-6 py-4 bg-white border-b border-slate-100">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, phone or email..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); searchLeads(e.target.value) }}
                                onKeyDown={e => e.key === 'Enter' && searchLeads()}
                                className="pl-9 h-10 bg-white border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            className="h-10 px-4 font-bold text-xs uppercase tracking-wider border-slate-200 hover:bg-slate-50" 
                            onClick={toggleAll}
                        >
                            {selected.size > 0 && selected.size === leads.filter(l => !l.do_not_call && !l.opted_out_at && validatePhone(l.phone)).length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching relevant leads...</p>
                        </div>
                    ) : leads.length > 0 ? (
                        <div className="divide-y divide-slate-100 bg-white">
                            <TooltipProvider delayDuration={0}>
                                {leads.map(lead => {
                                    const isInvalidPhone = !validatePhone(lead.phone)
                                    const unreachable = lead.do_not_call || lead.opted_out_at || isInvalidPhone
                                    const reason = lead.do_not_call ? "Marked as Do Not Call" : 
                                                   lead.opted_out_at ? "Lead has opted out" : 
                                                   "Invalid phone number"
                                    
                                    const content = (
                                        <label 
                                            key={lead.id} 
                                            className={cn(
                                                "flex items-center gap-4 px-6 py-4 transition-all group",
                                                unreachable ? "opacity-40 cursor-not-allowed grayscale-[0.5]" : "cursor-pointer hover:bg-slate-50/80",
                                                selected.has(lead.id) && "bg-indigo-50/50 hover:bg-indigo-50/70"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected.has(lead.id)}
                                                onChange={() => toggleLead(lead.id, unreachable)}
                                                disabled={unreachable}
                                                className={cn(
                                                    "w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all shrink-0",
                                                    unreachable && "opacity-50"
                                                )}
                                            />
                                            <div className="flex-1 min-w-0 flex items-center gap-3">
                                                <LeadAvatar name={lead.name} url={lead.avatar_url} />
                                                <div className="min-w-0 flex-1">
                                                    {/* Row 1: Name and Stage */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 text-sm truncate">{lead.name || '—'}</span>
                                                        {lead.stage?.name && (
                                                            <span 
                                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border leading-none"
                                                                style={{ 
                                                                    backgroundColor: `${lead.stage.color || '#64748b'}15`, 
                                                                    color: lead.stage.color || '#64748b',
                                                                    borderColor: `${lead.stage.color || '#64748b'}30` 
                                                                }}
                                                            >
                                                                {lead.stage.name}
                                                            </span>
                                                        )}
                                                        {unreachable && (
                                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-red-500 ml-auto">
                                                                <Ban className="w-2.5 h-2.5" /> Blocked
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Row 2: Number, Interest, Source, Score */}
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className={cn("text-xs tabular-nums font-medium mr-1", isInvalidPhone ? "text-red-400 line-through" : "text-slate-500")}>
                                                            {lead.phone || 'No phone'}
                                                        </span>
                                                        {lead.interest_level && (
                                                            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200 leading-none">
                                                                {lead.interest_level}
                                                            </span>
                                                        )}
                                                        {lead.source && (
                                                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 leading-none">
                                                                {lead.source}
                                                            </span>
                                                        )}
                                                        {lead.score != null && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 leading-none">
                                                                Score: {lead.score}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                    )

                                    if (unreachable) return (
                                        <Tooltip key={lead.id}>
                                            <TooltipTrigger asChild>
                                                {content}
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="bg-slate-900 text-white border-slate-800 text-xs font-bold uppercase tracking-wider p-2">
                                                <p>{reason}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )

                                    return content
                                })}
                            </TooltipProvider>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                            <Users className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-sm font-bold text-slate-900">No matching leads found</p>
                            <p className="text-xs text-slate-500 mt-1">We couldn't find any unenrolled leads in the selected projects that match your search.</p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-5 border-t border-slate-100 bg-white flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{selected.size} selected</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total {leads.length} found</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} className="font-bold text-xs uppercase tracking-wider text-slate-500 hover:text-slate-900">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleEnroll} 
                            disabled={selected.size === 0 || enrollLeads.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-bold text-xs uppercase tracking-wider shadow-sm shadow-indigo-200"
                        >
                            {enrollLeads.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <UserPlus className="w-3.5 h-3.5 mr-2" />}
                            Enroll {selected.size > 0 ? selected.size : ''} Leads
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

// ─── Danger Zone ───────────────────────────────────────────────────────────────
function DangerRow({ icon: Icon, title, description, triggerLabel, confirmTitle, confirmDescription, confirmLabel, onConfirm, disabled, variant = 'destructive' }) {
    return (
        <div className="flex items-center justify-between gap-6 px-6 py-5 hover:bg-red-50/30 transition-colors">
            <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className={cn(
                    "p-2.5 rounded-xl shrink-0 mt-0.5",
                    variant === 'destructive' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                )}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{description}</p>
                </div>
            </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        className={cn(
                            "h-9 px-4 font-bold text-[11px] uppercase tracking-wider shrink-0 transition-all",
                            variant === 'destructive' 
                                ? "border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600" 
                                : "border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white hover:border-amber-600"
                        )}
                    >
                        {triggerLabel}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <Icon className="w-5 h-5" /> {confirmTitle}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-slate-500">
                            {confirmDescription}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 pt-2">
                        <AlertDialogCancel className="font-bold text-xs uppercase tracking-wider">Keep it</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirm}
                            className={cn(
                                "font-bold text-xs uppercase tracking-wider text-white",
                                variant === 'destructive' ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
                            )}
                        >
                            {confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function DangerZone({ campaign, canDelete, canRun, onCancel, onArchive, onDelete, isPending }) {
    const s = campaign.status
    const canCancel  = canRun && ['running', 'paused'].includes(s)
    const canArchive = ['completed', 'cancelled', 'failed'].includes(s)
    const canDelBtn  = (canDelete || canRun) && s === 'scheduled'

    if (!canCancel && !canArchive && !canDelBtn) return (
        <div className="py-20 flex flex-col items-center justify-center text-center opacity-40 grayscale">
            <Lock className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No terminal actions available</p>
        </div>
    )

    return (
        <div className="max-w-2xl space-y-6 mt-2">
            <div className="bg-red-50/50 border border-red-100 rounded-2xl overflow-hidden divide-y divide-red-100 shadow-sm">
                {canCancel && (
                    <DangerRow
                        icon={XCircle}
                        title="Cancel Campaign"
                        description="Stop all queued calls immediately. Active calls will finish naturally. This action is final and cannot be resumed."
                        triggerLabel="Cancel Campaign"
                        confirmTitle="Cancel this campaign?"
                        confirmDescription="All remaining calls will be stopped. You can still view logs, but the campaign cannot be restarted."
                        confirmLabel="Yes, cancel it"
                        onConfirm={onCancel}
                        disabled={isPending}
                        variant="destructive"
                    />
                )}
                {canArchive && (
                    <DangerRow
                        icon={Archive}
                        title="Archive Campaign"
                        description="Move this to your archive. Data is preserved, but the campaign is locked from all future edits or runs."
                        triggerLabel="Archive"
                        confirmTitle="Archive this campaign?"
                        confirmDescription="The campaign will be moved to the archive list. All call records and analytics will remain accessible."
                        confirmLabel="Archive"
                        onConfirm={onArchive}
                        disabled={isPending}
                        variant="warning"
                    />
                )}
                {canDelBtn && (
                    <DangerRow
                        icon={Trash2}
                        title="Delete Permanently"
                        description="Remove this campaign and all its configuration. Since it hasn't run yet, no logs will be lost. This is irreversible."
                        triggerLabel="Delete"
                        confirmTitle="Delete everything?"
                        confirmDescription={`This will permanently delete "${campaign.name}" and all its configuration. This action cannot be undone.`}
                        confirmLabel="Delete permanently"
                        onConfirm={onDelete}
                        disabled={isPending}
                        variant="destructive"
                    />
                )}
            </div>
        </div>
    )
}

// ─── Detail Action Button ──────────────────────────────────────────────────────
function DetailActionBtn({ icon, label, onClick, disabled, tooltip, className = '' }) {
    const btn = (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        >
            {icon}{label}
        </button>
    )
    if (tooltip && disabled) return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild><span>{btn}</span></TooltipTrigger>
                <TooltipContent><p>{tooltip}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
    return btn
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CampaignDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const qc = useQueryClient()

    const canRun = usePermission('run_campaigns')
    const canEdit = usePermission('edit_campaigns')
    const canDelete = usePermission('delete_campaigns')
    const { isExpired: subExpired } = useSubscription()

    const { data, isLoading, error } = useCampaign(id)
    const campaign = data?.campaign

    const { data: progress } = useCampaignProgress(id, campaign?.status === 'running')

    const start    = useStartCampaign()
    const pause    = usePauseCampaign()
    const resume   = useResumeCampaign()
    const cancel   = useCancelCampaign()
    const complete = useCompleteCampaign()
    const archive  = useArchiveCampaign()
    const deleteCampaign = useDeleteCampaign()

    const [showEnrollDialog, setShowEnrollDialog] = useState(false)

    const anyPending = [start, pause, resume, cancel, complete, archive, deleteCampaign].some(m => m.isPending)

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
    const pausedForNight = isRunningButPausedForNight(campaign)
    const readyToStart   = isReadyToStart(campaign)

    async function handleStart()   { await start.mutateAsync(id);          router.push('/dashboard/admin/crm/calls/live') }
    async function handlePause()   { await pause.mutateAsync(id) }
    async function handleResume()  { await resume.mutateAsync(id) }
    async function handleCancel()  { await cancel.mutateAsync(id) }
    async function handleComplete(){ await complete.mutateAsync({ id, force: true }) }
    async function handleArchive() { await archive.mutateAsync(id) }
    async function handleDelete()  { await deleteCampaign.mutateAsync(id); router.push('/dashboard/admin/crm/campaigns') }

    const projectNames = (campaign.projects?.length > 0 ? campaign.projects : (campaign.project ? [campaign.project] : [])).map(p => p.name)
    const hasDangerActions = (canRun && ['running','paused'].includes(s)) || (canEdit && ['completed','cancelled','failed'].includes(s)) || (canDelete && ['scheduled','archived','cancelled','completed','failed'].includes(s))
    const blockReason = (canRun && !subExpired) ? null : subExpired ? 'Subscription expired' : 'No permission'

    return (
        <div className="min-h-screen bg-gray-50/60 pb-8">
            <div className="mx-6 pt-4 space-y-4">
                {/* Header Card */}
                <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                    {/* Row 1: Back · Title · Status · Metadata */}
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <button
                                onClick={() => router.push('/dashboard/admin/crm/campaigns')}
                                className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>

                            <div className="min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-xl font-bold text-slate-900 truncate">{campaign.name}</h1>
                                    <CampaignStatusBadge status={s} isReadyToStart={readyToStart} isPausedForNight={pausedForNight} />
                                </div>
                                <div className="flex items-center gap-4 mt-2 flex-wrap">
                                    {campaign.projects?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {campaign.projects.map(p => (
                                                <span key={p.id} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-bold">
                                                    <Building2 className="w-2.5 h-2.5" />
                                                    {p.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {campaign.start_date && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            <span>{campaign.start_date} → {campaign.end_date || '∞'}</span>
                                        </div>
                                    )}
                                    {campaign.time_start && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span>{campaign.time_start.slice(0,5)} – {campaign.time_end.slice(0,5)} IST</span>
                                        </div>
                                    )}
                                    {campaign.total_enrolled > 0 && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                                            <Users className="w-3 h-3 text-slate-400" />
                                            <span>{campaign.total_enrolled} Leads</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions Row 1 (Primary ones) */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Refresh */}
                            <button
                                onClick={() => qc.invalidateQueries({ queryKey: ['campaign', id] })}
                                disabled={anyPending}
                                className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40"
                                title="Refresh data"
                            >
                                <RefreshCw className={cn("w-4 h-4", anyPending && "animate-spin")} />
                            </button>

                            {/* Archive — terminal states only */}
                            {['completed','cancelled','failed'].includes(s) && canEdit && (
                                <button
                                    onClick={handleArchive} disabled={anyPending}
                                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-40"
                                    title="Archive campaign"
                                >
                                    {anyPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                                </button>
                            )}

                            {/* Main Action Group */}
                            <div className="h-9 w-px bg-slate-200 mx-1 hidden md:block" />
                            
                            <div className="flex items-center gap-2">
                                {/* Start */}
                                {s === 'scheduled' && (
                                    <Button
                                        onClick={handleStart}
                                        disabled={!canRun || subExpired || anyPending}
                                        className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-xs uppercase tracking-wide"
                                    >
                                        {anyPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                        Start Campaign
                                    </Button>
                                )}

                                {/* Pause */}
                                {s === 'running' && !pausedForNight && (
                                    <Button
                                        variant="outline"
                                        onClick={handlePause}
                                        disabled={!canRun || anyPending}
                                        className="h-9 px-4 rounded-lg border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold text-xs uppercase tracking-wider"
                                    >
                                        {anyPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
                                        Pause
                                    </Button>
                                )}

                                {/* Resume */}
                                {s === 'paused' && (
                                    <Button
                                        onClick={handleResume}
                                        disabled={!canRun || subExpired || anyPending}
                                        className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-xs uppercase tracking-wider"
                                    >
                                        {anyPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                        Resume
                                    </Button>
                                )}

                                {/* Enroll leads */}
                                {canEdit && !['completed','cancelled','archived'].includes(s) && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowEnrollDialog(true)}
                                        className="h-9 px-4 rounded-lg border-slate-200 font-bold text-xs uppercase tracking-wider"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        Enroll Leads
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Failed banner */}
                    {s === 'failed' && (campaign.metadata?.fail_reason || campaign.fail_reason) && (
                        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-red-800 uppercase tracking-tight">Campaign Failed</p>
                                <p className="text-xs text-red-600 font-medium mt-1">
                                    {FAIL_REASON_MESSAGES[campaign.metadata?.fail_reason || campaign.fail_reason] || campaign.metadata?.fail_reason || campaign.fail_reason}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Night pause indicator */}
                    {s === 'running' && pausedForNight && (
                        <div className="mx-6 mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                            <Moon className="w-5 h-5 text-indigo-500" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-indigo-800">Paused for the night</p>
                                <p className="text-xs text-indigo-600 font-medium mt-0.5">Calls will automatically resume at {campaign.time_start} IST</p>
                            </div>
                        </div>
                    )}

                    {/* Row 2: Tabs and Secondary Actions */}
                    <div className="px-6 py-2.5 flex items-center justify-between bg-slate-50/50">
                        <Tabs defaultValue="overview" className="w-full">
                            <div className="flex items-center justify-between">
                                <TabsList className="bg-slate-100 p-1 h-auto rounded-lg">
                                    {[
                                        { value: 'overview',  label: 'Overview' },
                                        { value: 'leads',     label: 'Leads' },
                                        { value: 'logs',      label: 'Call Logs' },
                                        { value: 'analytics', label: 'Analytics' },
                                        ...(hasDangerActions ? [{ value: 'danger', label: 'Danger Zone', danger: true }] : []),
                                    ].map(tab => (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            className={cn(
                                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                                "data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900",
                                                tab.danger ? "data-[state=active]:text-red-600 hover:text-red-600" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {/* Row 2 Right side: Campaign Actions */}
                                <div className="flex items-center gap-2 pr-2">
                                    {/* Complete — running only */}
                                    {canRun && s === 'running' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="sm" className="h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-[10px] uppercase tracking-wider shadow-none">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete Campaign
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Complete this campaign?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will stop the automated worker. Any leads currently in the queue will be left as-is, and the campaign will be marked as finished.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleComplete} className="bg-emerald-600 hover:bg-emerald-700">Complete Campaign</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}

                                    {/* Cancel — active only */}
                                    {['running','paused'].includes(s) && canRun && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="sm" className="h-8 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold text-[10px] uppercase tracking-wider shadow-none">
                                                    <XCircle className="w-3.5 h-3.5" /> Cancel Campaign
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-red-600">Cancel this campaign?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will stop all queued calls immediately. Active calls will be allowed to finish naturally. This action cannot be reversed.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Keep Running</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleCancel}>Cancel Campaign</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>

                            {/* Tab Content Area */}
                            <div className="pt-3 -mx-6 px-6 bg-slate-50/50 min-h-[60vh]">
                                <TabsContent value="overview" className="mt-0 outline-none">
                                    <CampaignOverviewTab campaign={campaign} />
                                </TabsContent>
                                <TabsContent value="leads" className="mt-0 outline-none">
                                    <EnrolledLeadsTab campaignId={id} campaignStatus={s} projectIds={campaign.projects?.map(p => p.id) || [campaign.project_id]} />
                                </TabsContent>
                                <TabsContent value="logs" className="mt-0 outline-none">
                                    <CampaignCallLogsTab campaignId={id} />
                                </TabsContent>
                                <TabsContent value="analytics" className="mt-0 outline-none">
                                    <CampaignAnalyticsTab campaignId={id} />
                                </TabsContent>
                                {hasDangerActions && (
                                    <TabsContent value="danger" className="mt-0 outline-none">
                                        <DangerZone
                                            campaign={campaign}
                                            canDelete={canDelete}
                                            canRun={canRun}
                                            onCancel={handleCancel}
                                            onArchive={handleArchive}
                                            onDelete={handleDelete}
                                            isPending={anyPending}
                                        />
                                    </TabsContent>
                                )}
                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>

            <LeadEnrollmentPanel
                open={showEnrollDialog}
                onClose={() => setShowEnrollDialog(false)}
                campaignId={id}
                projectIds={campaign.projects?.map(p => p.id) || [campaign.project_id]}
            />
        </div>
    )
}

