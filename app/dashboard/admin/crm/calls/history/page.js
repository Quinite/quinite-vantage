'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Phone, Search, Clock, PhoneForwarded, PhoneOff,
    MessageSquare, MessageCircle, Flag, TrendingUp, TrendingDown,
    Minus, Lock, ChevronDown, ChevronUp, Zap,
    Building2, Calendar, CheckCircle2, X
} from 'lucide-react'
import { format } from 'date-fns'
import { usePermission } from '@/contexts/PermissionContext'
import { toast } from 'react-hot-toast'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(secs) {
    if (!secs) return '0:00'
    const m = Math.floor(secs / 60)
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
}

function initials(name) {
    if (!name) return '?'
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function fmtDate(iso) {
    try { return format(new Date(iso), 'dd MMM, h:mm a') } catch { return '—' }
}

function sentimentMeta(score) {
    if (score == null) return { label: '—', color: 'text-muted-foreground', bar: 'bg-muted', pct: 0, icon: Minus }
    if (score >= 0.3)  return { label: 'Positive', color: 'text-emerald-600', bar: 'bg-emerald-500', pct: Math.round((score + 1) * 50), icon: TrendingUp }
    if (score < -0.1)  return { label: 'Negative', color: 'text-red-500',     bar: 'bg-red-500',     pct: Math.round((score + 1) * 50), icon: TrendingDown }
    return                    { label: 'Neutral',  color: 'text-amber-500',   bar: 'bg-amber-400',   pct: Math.round((score + 1) * 50), icon: Minus }
}

const STATUS_META = {
    completed:    { label: 'Completed',    cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
    transferred:  { label: 'Transferred',  cls: 'bg-blue-500/10 text-blue-700 border-blue-200' },
    failed:       { label: 'Failed',       cls: 'bg-red-500/10 text-red-600 border-red-200' },
    in_progress:  { label: 'In Progress',  cls: 'bg-amber-500/10 text-amber-700 border-amber-200' },
    disconnected: { label: 'Disconnected', cls: 'bg-zinc-400/10 text-zinc-600 border-zinc-200' },
    unknown:      { label: 'Unknown',      cls: 'bg-zinc-400/10 text-zinc-500 border-zinc-200' },
}

const INTEREST_META = {
    high:   { cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
    medium: { cls: 'bg-amber-500/10 text-amber-700 border-amber-200' },
    low:    { cls: 'bg-zinc-400/10 text-zinc-500 border-zinc-200' },
    none:   { cls: 'bg-zinc-300/10 text-zinc-400 border-zinc-100' },
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent }) {
    return (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-muted/60">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
            </div>
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={`text-3xl font-bold mt-0.5 tabular-nums ${accent || 'text-foreground'}`}>{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
        </div>
    )
}

// ─── Transcript panel ─────────────────────────────────────────────────────────

function TranscriptPanel({ transcript, onClose }) {
    return (
        <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Conversation Transcript
                </p>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="bg-muted/30 border border-border/50 rounded-xl p-4 max-h-80 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs text-foreground/80 font-mono leading-relaxed">{transcript}</pre>
            </div>
        </div>
    )
}

// ─── Call row ─────────────────────────────────────────────────────────────────

function CallRow({ call, isSelected, onSelect, onWhatsApp }) {
    const statusKey = call.call_status || 'unknown'
    const sm = STATUS_META[statusKey] || STATUS_META.unknown
    const sent = sentimentMeta(call.sentiment_score != null ? Number(call.sentiment_score) : null)
    const SentIcon = sent.icon
    const interestKey = call.interest_level || call.ai_metadata?.interest_level
    const im = INTEREST_META[interestKey]
    const hasInsights = call.summary || call.sentiment_score != null

    return (
        <div className={`bg-card border rounded-xl overflow-hidden transition-all duration-150
            ${isSelected ? 'border-border shadow-sm' : 'border-border/60 hover:border-border hover:shadow-sm'}`}
        >
            {/* top accent */}
            <div className={`h-0.5 w-full ${statusKey === 'completed' ? 'bg-emerald-500' : statusKey === 'transferred' ? 'bg-blue-500' : statusKey === 'failed' ? 'bg-red-500' : 'bg-muted'}`} />

            <div className="p-4">
                {/* main row */}
                <div className="flex items-start gap-3">
                    {/* avatar */}
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {initials(call.lead?.name)}
                    </div>

                    {/* body */}
                    <div className="flex-1 min-w-0">
                        {/* name + badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm text-foreground truncate">{call.lead?.name || 'Unknown Lead'}</span>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium border ${sm.cls}`}>
                                {sm.label}
                            </Badge>
                            {call.transferred && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border bg-blue-500/10 text-blue-700 border-blue-200">
                                    <PhoneForwarded className="w-2.5 h-2.5 mr-1" />Transferred
                                </Badge>
                            )}
                            {interestKey && im && (
                                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium border capitalize ${im.cls}`}>
                                    {interestKey}
                                </Badge>
                            )}
                        </div>

                        {/* meta row */}
                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                            <span className="font-mono">{call.lead?.phone || call.callee_number || '—'}</span>
                            {call.campaign?.name && (
                                <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3 shrink-0" />
                                    <span className="truncate max-w-[160px]">{call.campaign.name}</span>
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                {fmtDuration(call.duration)}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 shrink-0" />
                                {fmtDate(call.created_at)}
                            </span>
                            {call.call_cost != null && (
                                <span className="font-mono">
                                    {parseFloat(call.call_cost).toFixed(2)} cr
                                </span>
                            )}
                        </div>

                        {/* insights row */}
                        {hasInsights ? (
                            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                                {/* sentiment */}
                                {call.sentiment_score != null && (
                                    <div className="flex items-center gap-1.5">
                                        <SentIcon className={`w-3.5 h-3.5 ${sent.color}`} />
                                        <span className={`text-xs font-medium ${sent.color}`}>{sent.label}</span>
                                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${sent.bar}`} style={{ width: `${sent.pct}%` }} />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                                            {Number(call.sentiment_score).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                {/* priority */}
                                {call.ai_metadata?.priority_score != null && (
                                    <div className="flex items-center gap-1">
                                        <Flag className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="text-xs text-muted-foreground">Priority <span className="font-semibold text-foreground">{call.ai_metadata.priority_score}</span></span>
                                    </div>
                                )}
                                {/* summary */}
                                {call.summary && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 italic flex-1 min-w-0">"{call.summary}"</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground/60 mt-2 italic">No insights yet</p>
                        )}
                    </div>

                    {/* actions */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {call.conversation_transcript && (
                            <Button
                                variant="ghost" size="sm"
                                onClick={onSelect}
                                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                title={isSelected ? 'Hide transcript' : 'View transcript'}
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {isSelected ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                            </Button>
                        )}
                            {call.lead?.id && !call.ai_metadata?.whatsapp_brochure_requested && (
                            <Button
                                variant="ghost" size="sm"
                                onClick={onWhatsApp}
                                className="h-7 px-2 text-muted-foreground hover:text-emerald-600"
                                title="Create WhatsApp brochure task"
                            >
                                <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* transcript */}
                {isSelected && call.conversation_transcript && (
                    <TranscriptPanel transcript={call.conversation_transcript} onClose={onSelect} />
                )}

                {/* disconnect reason */}
                {call.disconnect_reason && (
                    <div className="mt-3 flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Disconnect:</span>
                        <span className="text-[10px] text-muted-foreground capitalize">{call.disconnect_reason.replace(/_/g, ' ')}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HistorySkeleton() {
    return (
        <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-8 w-12" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex gap-3 flex-wrap">
                    <Skeleton className="h-9 flex-1 min-w-40 rounded-lg" />
                    <Skeleton className="h-9 w-32 rounded-lg" />
                    <Skeleton className="h-9 w-32 rounded-lg" />
                    <Skeleton className="h-9 w-36 rounded-lg" />
                </div>
            </div>
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="h-0.5 bg-muted" />
                        <div className="p-4 flex gap-3">
                            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-72" />
                                <Skeleton className="h-3 w-56" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CallHistory() {
    const [calls, setCalls] = useState([])
    const [filtered, setFiltered] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [interestFilter, setInterestFilter] = useState('all')
    const [selectedId, setSelectedId] = useState(null)
    const [user, setUser] = useState(null)
    const [orgId, setOrgId] = useState(null)

    const supabase = createClient()
    const hasAccess = usePermission('view_call_history')

    // ── bootstrap ─────────────────────────────────────────────────────────────
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

    useEffect(() => {
        if (user && hasAccess && orgId) fetchHistory()
        else if (!loading && !hasAccess) setLoading(false)
    }, [user, hasAccess, orgId, dateFrom, dateTo, statusFilter, interestFilter])

    // ── client-side search filter ─────────────────────────────────────────────
    useEffect(() => {
        if (!search.trim()) { setFiltered(calls); return }
        const q = search.toLowerCase()
        setFiltered(calls.filter(c =>
            c.lead?.name?.toLowerCase().includes(q) ||
            c.lead?.phone?.includes(search) ||
            c.campaign?.name?.toLowerCase().includes(q) ||
            c.callee_number?.includes(search)
        ))
    }, [search, calls])

    // ── data fetch ────────────────────────────────────────────────────────────
    const fetchHistory = async () => {
        if (!orgId) return
        let q = supabase
            .from('call_logs')
            .select(`
                id, call_status, duration, call_cost, created_at,
                conversation_transcript, sentiment_score,
                interest_level, summary, ai_metadata, transferred,
                disconnect_reason, callee_number,
                lead:leads!call_logs_lead_id_fkey(id, name, phone, assigned_to),
                campaign:campaigns(id, name)
            `)
            .eq('organization_id', orgId)
            .not('call_status', 'in', '("in_progress","ringing")')
            .order('created_at', { ascending: false })
            .limit(200)

        if (dateFrom) q = q.gte('created_at', dateFrom)
        if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59')
        if (statusFilter !== 'all') q = q.eq('call_status', statusFilter)
        if (interestFilter !== 'all') q = q.eq('interest_level', interestFilter)

        const { data, error } = await q
        if (!error && data) { setCalls(data); setFiltered(data) }
        setLoading(false)
    }

    // ── actions ───────────────────────────────────────────────────────────────
    const createWhatsAppTask = async (call) => {
        try {
            const { error } = await supabase.from('tasks').insert({
                lead_id: call.lead?.id,
                organization_id: orgId,
                title: 'Send project brochure via WhatsApp',
                description: `Requested from call history. Call ID: ${call.id}`,
                assigned_to: call.lead?.assigned_to,
                created_by: user.id,
                priority: 'medium',
                status: 'pending',
                due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
            })
            if (error) throw error
            toast.success('WhatsApp task created')
        } catch {
            toast.error('Failed to create task')
        }
    }

    const clearFilters = () => {
        setSearch(''); setDateFrom(''); setDateTo('')
        setStatusFilter('all'); setInterestFilter('all')
    }
    const hasFilters = search || dateFrom || dateTo || statusFilter !== 'all' || interestFilter !== 'all'

    // ── derived stats ─────────────────────────────────────────────────────────
    const completed   = calls.filter(c => ['completed', 'transferred', 'disconnected'].includes(c.call_status)).length
    const transferred = calls.filter(c => c.transferred).length
    const analyzed    = calls.filter(c => c.summary || c.sentiment_score != null).length
    const avgDur      = calls.length ? Math.round(calls.reduce((a, c) => a + (c.duration || 0), 0) / calls.length) : 0

    // ── guards ────────────────────────────────────────────────────────────────
    if (!hasAccess && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                    <h2 className="text-base font-semibold text-foreground">Access Restricted</h2>
                    <p className="text-sm text-muted-foreground mt-1">You don't have permission to view call history.</p>
                </div>
            </div>
        )
    }

    if (loading) return <HistorySkeleton />

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-muted/5 p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Call History</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">AI call interactions · last 200 records</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground tabular-nums">
                    {calls.length} calls
                </span>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                    label="Completed"
                    value={completed}
                    sub={`${calls.length ? Math.round((completed / calls.length) * 100) : 0}% success rate`}
                    icon={CheckCircle2}
                    accent="text-emerald-600"
                />
                <StatCard
                    label="Transferred"
                    value={transferred}
                    sub="Escalated to human"
                    icon={PhoneForwarded}
                    accent="text-blue-600"
                />
                <StatCard
                    label="Avg Duration"
                    value={fmtDuration(avgDur)}
                    sub="Per call"
                    icon={Clock}
                />
                <StatCard
                    label="AI Analyzed"
                    value={analyzed}
                    sub={`${calls.length ? Math.round((analyzed / calls.length) * 100) : 0}% of calls`}
                    icon={Zap}
                    accent="text-violet-600"
                />
            </div>

            {/* ── Filters ── */}
            <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex gap-2.5 flex-wrap">
                    {/* search */}
                    <div className="relative flex-1 min-w-52">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search lead, phone, campaign…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>

                    {/* date from */}
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="h-9 w-36 text-sm"
                        title="From date"
                    />

                    {/* date to */}
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="h-9 w-36 text-sm"
                        title="To date"
                    />

                    {/* status */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-36 text-sm">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="transferred">Transferred</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="disconnected">Disconnected</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* interest */}
                    <Select value={interestFilter} onValueChange={setInterestFilter}>
                        <SelectTrigger className="h-9 w-36 text-sm">
                            <SelectValue placeholder="Interest" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Interest</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                    </Select>

                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-3 text-muted-foreground hover:text-foreground">
                            <X className="w-3.5 h-3.5 mr-1.5" /> Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Call list ── */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">Call Records</span>
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
                            {filtered.length}
                        </span>
                    </div>
                    {hasFilters && filtered.length !== calls.length && (
                        <p className="text-xs text-muted-foreground">{calls.length - filtered.length} filtered out</p>
                    )}
                </div>

                <div className="p-4 space-y-2.5">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                                <PhoneOff className="w-6 h-6 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">No calls found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {hasFilters ? 'Try adjusting your filters.' : 'Call logs will appear here after campaigns run.'}
                            </p>
                            {hasFilters && (
                                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3">
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        filtered.map(call => (
                            <CallRow
                                key={call.id}
                                call={call}
                                isSelected={selectedId === call.id}
                                onSelect={() => setSelectedId(selectedId === call.id ? null : call.id)}
                                        onWhatsApp={() => createWhatsAppTask(call)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
