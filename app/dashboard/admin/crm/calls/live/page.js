'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Phone, Clock, PhoneForwarded,
    RefreshCw, StopCircle, Radio, Lock, ArrowUpRight, Mic
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { usePermission } from '@/contexts/PermissionContext'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtSecs(secs) {
    if (!secs && secs !== 0) return '0:00'
    const m = Math.floor(secs / 60)
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
}

function initials(name) {
    if (!name) return '?'
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot({ color = 'bg-emerald-500' }) {
    return (
        <span className="relative flex h-2 w-2 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
        </span>
    )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent, pulse, onClick, badge }) {
    return (
        <div
            onClick={onClick}
            className={`group relative bg-card border border-border rounded-xl p-5 flex flex-col gap-3 transition-all duration-200
                ${onClick ? 'cursor-pointer hover:border-border/80 hover:shadow-md' : ''}
            `}
        >
            <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${accent ? `${accent}/10` : 'bg-muted'}`}>
                    <Icon className={`w-4 h-4 ${accent ? `text-${accent.replace('bg-', '')}` : 'text-muted-foreground'}`} />
                </div>
                <div className="flex items-center gap-1.5">
                    {pulse && <PulseDot color={pulse} />}
                    {badge}
                </div>
            </div>
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
            {onClick && (
                <ArrowUpRight className="absolute top-4 right-4 w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            )}
        </div>
    )
}

// ─── Active call card ─────────────────────────────────────────────────────────

function ActiveCallCard({ call, elapsed, onForceEnd }) {
    const secs = elapsed[call.id] ?? 0
    const isRinging = call.call_status === 'ringing'
    const isTransferred = call.transferred

    const sentimentScore = call.sentiment_score != null ? Number(call.sentiment_score) : null
    const sentimentColor = sentimentScore == null ? null
        : sentimentScore >= 0.3 ? 'bg-emerald-500'
        : sentimentScore < -0.1 ? 'bg-red-500'
        : 'bg-amber-400'

    return (
        <div className={`relative bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md
            ${isRinging ? 'border-amber-200' : isTransferred ? 'border-blue-200' : 'border-emerald-200/70'}`}
        >
            {/* top accent bar */}
            <div className={`h-0.5 w-full ${isRinging ? 'bg-amber-400' : isTransferred ? 'bg-blue-500' : 'bg-emerald-500'}`} />

            <div className="p-4 space-y-4">
                {/* header row */}
                <div className="flex items-start gap-3">
                    {/* avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                        ${isRinging ? 'bg-amber-500/10 text-amber-700' : isTransferred ? 'bg-blue-500/10 text-blue-700' : 'bg-emerald-500/10 text-emerald-700'}`}
                    >
                        {initials(call.lead?.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground truncate">
                                {call.lead?.name || 'Unknown Lead'}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
                                ${isRinging
                                    ? 'bg-amber-500/10 text-amber-700 border border-amber-200'
                                    : isTransferred
                                    ? 'bg-blue-500/10 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-500/10 text-emerald-700 border border-emerald-200'
                                }`}
                            >
                                {isRinging
                                    ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Ringing</>
                                    : isTransferred
                                    ? <><PhoneForwarded className="w-3 h-3" /> Transferred</>
                                    : <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</>
                                }
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {call.lead?.phone || call.callee_number || '—'}
                            {call.lead?.mailing_city ? <span className="font-sans ml-1.5 not-italic">· {call.lead.mailing_city}</span> : null}
                        </p>
                    </div>

                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onForceEnd(call.id)}
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        title="Force end call"
                    >
                        <StopCircle className="w-4 h-4" />
                    </Button>
                </div>

                {/* metrics row */}
                <div className="grid grid-cols-3 gap-2">
                    {/* duration */}
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Duration</p>
                        <p className="text-sm font-bold text-foreground font-mono tabular-nums">{fmtSecs(secs)}</p>
                    </div>

                    {/* sentiment */}
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Sentiment</p>
                        {sentimentScore != null ? (
                            <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${sentimentColor}`}
                                        style={{ width: `${Math.max(0, Math.min(100, (sentimentScore + 1) * 50))}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground">{sentimentScore.toFixed(1)}</span>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">—</p>
                        )}
                    </div>

                    {/* campaign */}
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Campaign</p>
                        <p className="text-xs font-medium text-foreground truncate" title={call.campaign?.name}>
                            {call.campaign?.name || '—'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Queue breakdown bar ───────────────────────────────────────────────────────

function QueueBreakdown({ queued, calling, total }) {
    if (total === 0) return (
        <div className="h-2 w-full rounded-full bg-muted" />
    )
    return (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex gap-px">
            <div className="bg-sky-500 h-full rounded-l-full transition-all duration-700" style={{ width: `${(queued / total) * 100}%` }} />
            <div className="bg-amber-400 h-full rounded-r-full transition-all duration-700" style={{ width: `${(calling / total) * 100}%` }} />
        </div>
    )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyActiveCalls() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                <Mic className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-foreground">No active calls right now</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Active calls will appear here automatically. The page refreshes every 5 seconds.
            </p>
        </div>
    )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LiveSkeleton() {
    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-44" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
                        <div className="flex items-start justify-between">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-4 w-12 rounded-full" />
                        </div>
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-8 w-12" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <Skeleton className="h-5 w-36" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="border rounded-xl overflow-hidden">
                            <div className="h-0.5 bg-muted" />
                            <div className="p-4 space-y-3">
                                <div className="flex gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-12 rounded-lg" />)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LiveCallMonitor() {
    const [activeCalls, setActiveCalls] = useState([])
    const [queueStats, setQueueStats] = useState({ queued: 0, calling: 0 })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [user, setUser] = useState(null)
    const [orgId, setOrgId] = useState(null)
    const [elapsed, setElapsed] = useState({})
    const [lastUpdated, setLastUpdated] = useState(null)

    const supabase = createClient()
    const hasAccess = usePermission('view_live_calls')
    const orgIdRef = useRef(null)

    // keep ref in sync so interval callbacks always have fresh orgId
    useEffect(() => { orgIdRef.current = orgId }, [orgId])

    // ── bootstrap user + org ──────────────────────────────────────────────────
    useEffect(() => {
        ;(async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            if (user) {
                const { data: profile } = await supabase.from('profiles')
                    .select('organization_id').eq('id', user.id).single()
                if (profile?.organization_id) setOrgId(profile.organization_id)
            }
        })()
    }, [])

    // ── initial fetch ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (user && hasAccess && orgId) refresh()
        else if (!loading && (!hasAccess || !user)) setLoading(false)
    }, [user, hasAccess, orgId])

    // ── realtime subscriptions ────────────────────────────────────────────────
    useEffect(() => {
        if (!user || !hasAccess) return
        const logsChannel = supabase.channel('live_call_logs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'call_logs' }, () => {
                fetchCalls()
                stamp()
            })
            .subscribe()
        const leadsChannel = supabase.channel('live_campaign_leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_leads' }, () => {
                fetchQueue()
                stamp()
            })
            .subscribe()
        return () => {
            supabase.removeChannel(logsChannel)
            supabase.removeChannel(leadsChannel)
        }
    }, [user, hasAccess])

    // ── 5s polling fallback ───────────────────────────────────────────────────
    useEffect(() => {
        if (!user || !hasAccess || !orgId) return
        const t = setInterval(() => { fetchCalls(); fetchQueue(); stamp() }, 5000)
        return () => clearInterval(t)
    }, [user, hasAccess, orgId])

    // ── elapsed timer ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeCalls.length) { setElapsed({}); return }
        const tick = () => {
            const now = Date.now()
            const next = {}
            activeCalls.forEach(c => {
                next[c.id] = Math.floor((now - new Date(c.created_at).getTime()) / 1000)
            })
            setElapsed(next)
        }
        tick()
        const t = setInterval(tick, 1000)
        return () => clearInterval(t)
    }, [activeCalls])

    // ── data fetchers ─────────────────────────────────────────────────────────
    const fetchCalls = async () => {
        const id = orgIdRef.current
        if (!id) return
        const { data, error } = await supabase
            .from('call_logs')
            .select('*, lead:leads(id,name,phone,mailing_city), campaign:campaigns(id,name)')
            .eq('organization_id', id)
            .in('call_status', ['in_progress', 'ringing'])
            .order('created_at', { ascending: false })
        if (!error && data) setActiveCalls(data)
    }

    const fetchQueue = async () => {
        const id = orgIdRef.current
        if (!id) return
        const { data, error } = await supabase
            .from('campaign_leads')
            .select('status')
            .eq('organization_id', id)
            .in('status', ['queued', 'calling'])
        if (!error && data) {
            setQueueStats({
                queued: data.filter(r => r.status === 'queued').length,
                calling: data.filter(r => r.status === 'calling').length,
            })
        }
    }

    const stamp = () => setLastUpdated(new Date())

    const refresh = async () => {
        setRefreshing(true)
        await Promise.all([fetchCalls(), fetchQueue()])
        setRefreshing(false)
        setLoading(false)
        stamp()
    }

    const handleForceEnd = async (callId) => {
        if (!confirm('Force-end this call? It will be marked as failed.')) return
        const toastId = toast.loading('Ending call…')
        try {
            const res = await fetch(`/api/crm/calls/${callId}/cancel`, { method: 'POST' })
            if (!res.ok) throw new Error()
            toast.success('Call ended', { id: toastId })
            fetchCalls()
        } catch {
            toast.error('Failed to end call', { id: toastId })
        }
    }

    // ── derived stats ─────────────────────────────────────────────────────────
    const totalQueue = queueStats.queued + queueStats.calling
    const systemLive = activeCalls.length > 0 || queueStats.queued > 0 || queueStats.calling > 0

    // ── guards ────────────────────────────────────────────────────────────────
    if (!hasAccess && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                    <h2 className="text-base font-semibold text-foreground">Access Restricted</h2>
                    <p className="text-sm text-muted-foreground mt-1">You don't have permission to view live calls.</p>
                </div>
            </div>
        )
    }

    if (loading) return <LiveSkeleton />

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-muted/5 p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <h1 className="text-xl font-bold text-foreground tracking-tight">Live Call Monitor</h1>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border
                            ${systemLive
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                        >
                            <PulseDot color={systemLive ? 'bg-emerald-500' : 'bg-muted-foreground'} />
                            {systemLive ? 'System Active' : 'Idle'}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Real-time AI call monitoring &nbsp;·&nbsp;
                        {lastUpdated
                            ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                            : 'Connecting…'
                        }
                    </p>
                </div>

                <button
                    onClick={() => refresh()}
                    disabled={refreshing}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all ${refreshing ? 'opacity-60' : ''}`}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <StatCard
                    label="Active Calls"
                    value={activeCalls.length}
                    sub="In progress right now"
                    icon={Phone}
                    pulse={activeCalls.length > 0 ? 'bg-emerald-500' : undefined}
                    badge={activeCalls.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200">
                            LIVE
                        </span>
                    )}
                />
                <StatCard
                    label="Queued"
                    value={queueStats.queued}
                    sub="Waiting to be called"
                    icon={Clock}
                />
                <StatCard
                    label="Calling"
                    value={queueStats.calling}
                    sub="Call dispatched"
                    icon={Radio}
                    pulse={queueStats.calling > 0 ? 'bg-amber-400' : undefined}
                />
            </div>

            {/* ── Queue progress bar ── */}
            {totalQueue > 0 && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Campaign Queue Breakdown</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{totalQueue} total leads</p>
                    </div>
                    <QueueBreakdown
                        queued={queueStats.queued}
                        calling={queueStats.calling}
                        total={totalQueue}
                    />
                    <div className="flex items-center gap-4">
                        {[
                            { color: 'bg-sky-500', label: 'Queued', value: queueStats.queued },
                            { color: 'bg-amber-400', label: 'Calling', value: queueStats.calling },
                        ].map(s => (
                            <div key={s.label} className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                                <span className="text-xs text-muted-foreground">{s.label}</span>
                                <span className="text-xs font-semibold text-foreground tabular-nums">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Active calls grid ── */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">Active Calls</span>
                        {activeCalls.length > 0 && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200 tabular-nums">
                                {activeCalls.length}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-refreshes every 5s</p>
                </div>

                <div className="p-5">
                    {activeCalls.length === 0 ? (
                        <EmptyActiveCalls />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {activeCalls.map(call => (
                                <ActiveCallCard
                                    key={call.id}
                                    call={call}
                                    elapsed={elapsed}
                                    onForceEnd={handleForceEnd}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
