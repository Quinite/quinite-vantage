'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import CreditBalance from '@/components/billing/CreditBalance'
import PricingTiers from '@/components/subscription/PricingTiers'
import {
    CheckCircle2, AlertTriangle, FolderKanban, Phone,
    Users, Calendar, Activity, Zap, AlertCircle,
    LayoutDashboard, Megaphone, RefreshCw, Mail,
    MessageCircle, Info
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────

const getDaysRemaining = (endDate) => {
    if (!endDate) return null
    return Math.max(0, Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)))
}

const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    })
}

const getBarColor = (pct) => {
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
}

// ─── sub-components ───────────────────────────────────────────────────────────

function UsageBar({ label, icon: Icon, iconBg, iconText, active, archived, count, limit, isOverLimit }) {
    const isUnlimited = limit === -1 || limit === 0
    const total = count ?? (active ?? 0) + (archived ?? 0)
    const pct = isUnlimited ? 100 : Math.min(100, (total / limit) * 100)
    const barColor = isUnlimited ? 'bg-emerald-400' : getBarColor(pct)
    const hasBreakdown = active !== undefined && archived !== undefined

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', iconBg)}>
                        <Icon className={cn('w-4 h-4', iconText)} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                </div>
                {isOverLimit && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1">
                        <AlertCircle className="w-3 h-3" /> Limit Reached
                    </Badge>
                )}
            </div>

            {/* progress bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-300', barColor)}
                    style={{ width: isUnlimited ? '100%' : `${pct}%` }}
                />
            </div>

            {/* count text */}
            <div className="flex items-center justify-between text-xs">
                {isUnlimited ? (
                    <span className="text-emerald-600 font-medium">Unlimited</span>
                ) : hasBreakdown ? (
                    <span className="text-slate-500">
                        <span className="font-semibold text-slate-700">{active}</span> active
                        {' + '}
                        <span className="font-semibold text-slate-700">{archived}</span> archived
                        {' = '}
                        <span className="font-semibold text-slate-700">{total}</span>
                        {' / '}
                        <span className="font-semibold text-slate-700">{limit}</span>
                    </span>
                ) : (
                    <span className="text-slate-500">
                        <span className="font-semibold text-slate-700">{total}</span>
                        {' / '}
                        <span className="font-semibold text-slate-700">{limit}</span>
                    </span>
                )}
                {isOverLimit && (
                    <a
                        href="mailto:support@quinite.in?subject=Limit%20Reached"
                        className="text-blue-600 hover:underline font-medium"
                    >
                        Contact us
                    </a>
                )}
            </div>
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div className="h-full bg-gray-50/50 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6 space-y-5">
                <Skeleton className="h-44 w-full rounded-2xl" />
                <Skeleton className="h-11 w-80 rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <Skeleton className="h-52 w-full rounded-xl" />
            </div>
        </div>
    )
}

function ErrorState({ onRetry }) {
    return (
        <div className="h-full bg-gray-50/50 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-white rounded-2xl border border-red-200 p-10 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">Failed to load subscription</p>
                        <p className="text-sm text-slate-500 mt-1">There was a problem fetching your subscription details.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Try Again
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
    const [data, setData]         = useState(null)
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState(false)
    const [activeTab, setActiveTab] = useState('overview')

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(false)
        try {
            const res  = await fetch('/api/subscriptions/current')
            const json = await res.json()
            if (res.ok) {
                setData(json)
            } else {
                setError(true)
                toast.error(json.error || 'Failed to fetch subscription')
            }
        } catch {
            setError(true)
            toast.error('Failed to fetch subscription')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) return <LoadingSkeleton />
    if (error)   return <ErrorState onRetry={fetchData} />

    // ── derived values ────────────────────────────────────────────────────────
    const { subscription, plan, usage, credits, over_limit } = data || {}

    const planName      = plan?.name        || 'Free'
    const planSlug      = plan?.slug        || 'free'
    const status        = subscription?.status || 'unknown'
    const daysRemaining = getDaysRemaining(subscription?.current_period_end)

    const statusConfig = {
        active:    { label: 'Active',      class: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
        trialing:  { label: 'Trial',       class: 'bg-blue-100 text-blue-700 border-blue-200',          icon: CheckCircle2 },
        past_due:  { label: 'Expired',     class: 'bg-red-100 text-red-700 border-red-200',             icon: AlertTriangle },
        cancelled: { label: 'Cancelled',   class: 'bg-red-100 text-red-700 border-red-200',             icon: AlertTriangle },
        suspended: { label: 'Suspended',   class: 'bg-amber-100 text-amber-700 border-amber-200',       icon: AlertTriangle },
    }
    const sc = statusConfig[status] || statusConfig.cancelled
    const StatusIcon = sc.icon

    // Usage bars config
    const usageBars = usage ? [
        {
            label: 'Projects', icon: FolderKanban,
            iconBg: 'bg-blue-50', iconText: 'text-blue-600',
            active: usage.projects?.active, archived: usage.projects?.archived,
            count: usage.projects?.count, limit: usage.projects?.limit,
            isOverLimit: over_limit?.projects,
        },
        {
            label: 'Leads', icon: Users,
            iconBg: 'bg-violet-50', iconText: 'text-violet-600',
            active: usage.leads?.active, archived: usage.leads?.archived,
            count: usage.leads?.count, limit: usage.leads?.limit,
            isOverLimit: over_limit?.leads,
        },
        {
            label: 'Campaigns', icon: Megaphone,
            iconBg: 'bg-orange-50', iconText: 'text-orange-600',
            active: usage.campaigns?.active, archived: usage.campaigns?.archived,
            count: usage.campaigns?.count, limit: usage.campaigns?.limit,
            isOverLimit: over_limit?.campaigns,
        },
        {
            label: 'Team Members', icon: Users,
            iconBg: 'bg-emerald-50', iconText: 'text-emerald-600',
            count: usage.users?.count, limit: usage.users?.limit,
            isOverLimit: over_limit?.users,
        },
    ] : []


    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50/30 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Zap className="w-7 h-7 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Subscription & Billing</h1>
                            <p className="text-sm md:text-base text-slate-500 mt-1">
                                Manage your plan, call credits, and usage limits.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ─────────────────────────────────────────────────── */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>

                    {/* Tab bar */}
                    <TabsList className="bg-white border border-slate-200 p-1 h-auto gap-0.5 rounded-xl w-full sm:w-auto">
                        {[
                            { value: 'overview', label: 'Overview',    icon: LayoutDashboard },
                            { value: 'credits',  label: 'Call Credits', icon: Phone           },
                            { value: 'plan',     label: 'Plan',         icon: Zap             },
                        ].map(({ value, label, icon: Icon }) => (
                            <TabsTrigger
                                key={value}
                                value={value}
                                className="gap-1.5 px-4 py-2 text-sm rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* ─────────── Overview ─────────── */}
                    <TabsContent value="overview" className="mt-4 space-y-4">

                        {/* Plan card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
                            <div className="p-5">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    {/* left: icon + name + badge + period */}
                                    <div className="flex items-start gap-4">
                                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-200">
                                            <Zap className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                {/* gradient plan name badge */}
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-violet-600 shadow-sm">
                                                    {planName}
                                                </span>
                                                {/* status badge */}
                                                <Badge className={cn('gap-1 text-xs font-medium', sc.class)}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {sc.label}
                                                </Badge>
                                            </div>
                                            <h1 className="text-lg font-bold text-slate-900">{planName} Plan</h1>
                                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                    {formatDate(subscription?.current_period_start)}
                                                    {' → '}
                                                    {formatDate(subscription?.current_period_end)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* right: days remaining */}
                                    {daysRemaining !== null && (
                                        <div className={cn(
                                            'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold shrink-0',
                                            status === 'past_due' || daysRemaining === 0
                                                ? 'bg-red-50 border-red-200 text-red-700'
                                                : daysRemaining <= 7
                                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                        )}>
                                            <Activity className="w-4 h-4" />
                                            {status === 'past_due' || daysRemaining === 0
                                                ? 'Subscription expired'
                                                : daysRemaining <= 7
                                                    ? `${daysRemaining} days remaining`
                                                    : `${daysRemaining} days left`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Usage grid */}
                        <div>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                                Usage &amp; Limits
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {usageBars.map((bar) => (
                                    <UsageBar key={bar.label} {...bar} />
                                ))}
                            </div>
                        </div>

                        {/* AI Minutes card */}
                        {credits && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-500" />
                                    <h2 className="text-sm font-semibold text-slate-800">AI Call Minutes</h2>
                                </div>

                                <div className="p-5 space-y-4">
                                    {/* low balance alert */}
                                    {credits.low_balance && (
                                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                                            <span>
                                                <span className="font-semibold">Low balance</span> — contact support to top up before your campaigns are paused.
                                            </span>
                                        </div>
                                    )}

                                    {/* two-column breakdown */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Available balance */}
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available</p>
                                            <div>
                                                <span className="text-2xl font-bold text-slate-900 tabular-nums">{credits.balance ?? 0}</span>
                                                <span className="text-sm text-slate-500 ml-1">min</span>
                                            </div>
                                        </div>

                                        {/* Total consumed */}
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Used all time</p>
                                            <div>
                                                <span className="text-2xl font-bold text-slate-900 tabular-nums">{credits.total_consumed ?? 0}</span>
                                                <span className="text-sm text-slate-500 ml-1">min</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                        <p className="text-sm text-slate-500">Need more minutes? Contact our team.</p>
                                        <div className="flex gap-2 shrink-0">
                                            <Button variant="outline" size="sm" asChild>
                                                <a href="mailto:support@quinite.in?subject=AI%20Call%20Minutes%20Top-up" className="flex items-center gap-1.5">
                                                    <Mail className="w-3.5 h-3.5" /> Email us
                                                </a>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <a
                                                    href="https://wa.me/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* ─────────── Plan ─────────── */}
                    <TabsContent value="plan" className="mt-4 space-y-4">
                        {/* info note */}
                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                            <span>
                                Plan changes are handled by our team.{' '}
                                <a
                                    href="mailto:support@quinite.in?subject=Plan%20Change%20Request"
                                    className="font-semibold underline underline-offset-2 hover:text-blue-900"
                                >
                                    Contact us
                                </a>{' '}
                                to upgrade or downgrade.
                            </span>
                        </div>
                        <PricingTiers currentPlanSlug={planSlug} />
                    </TabsContent>

                    {/* ─────────── Call Credits ─────────── */}
                    <TabsContent value="credits" className="mt-4">
                        <CreditBalance />
                    </TabsContent>

                </Tabs>

            </div>
        </div>
    )
}
