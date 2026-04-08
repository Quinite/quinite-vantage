'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import PricingTiers from '@/components/subscription/PricingTiers'
import CreditPurchase from '@/components/billing/CreditPurchase'
import {
    CheckCircle2, Clock, Users, FolderKanban, Phone,
    TrendingUp, AlertTriangle, CreditCard, Receipt,
    ArrowDownLeft, Wallet, Calendar, Activity,
    FileText, Sparkles, Zap, AlertCircle, LayoutDashboard,
    Megaphone
} from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────────────────────

const getDaysRemaining = (endDate) => {
    if (!endDate) return null
    return Math.max(0, Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)))
}

const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const colorMap = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    bar: 'bg-blue-500'    },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  bar: 'bg-violet-500'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500' },
    orange:  { bg: 'bg-orange-50',  text: 'text-orange-600',  bar: 'bg-orange-500'  },
}

const txTypeConfig = {
    purchase:  { label: 'Purchase',   icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50', sign: '+' },
    deduct:    { label: 'Call Usage', icon: Phone,         color: 'text-slate-600',   bg: 'bg-slate-100',  sign: '-' },
    deduction: { label: 'Call Usage', icon: Phone,         color: 'text-slate-600',   bg: 'bg-slate-100',  sign: '-' },
    refund:    { label: 'Refund',     icon: ArrowDownLeft, color: 'text-blue-600',    bg: 'bg-blue-50',    sign: '+' },
    bonus:     { label: 'Bonus',      icon: Sparkles,      color: 'text-violet-600',  bg: 'bg-violet-50',  sign: '+' },
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
    const [subscription, setSubscription] = useState(null)
    const [organization, setOrganization] = useState(null)
    const [credits, setCredits]           = useState(null)
    const [invoices, setInvoices]         = useState([])
    const [usageData, setUsageData]       = useState(null)
    const [limits, setLimits]             = useState(null)
    const [loading, setLoading]           = useState(true)
    const [invoicesLoading, setInvoicesLoading] = useState(false)
    const [activeTab, setActiveTab]       = useState('overview')

    useEffect(() => {
        Promise.all([fetchSubscription(), fetchOrganization(), fetchCredits()])
            .finally(() => setLoading(false))
    }, [])

    const fetchOrganization = async () => {
        try {
            const res  = await fetch('/api/organization/settings')
            const data = await res.json()
            if (res.ok) setOrganization(data.organization)
        } catch {}
    }

    const fetchCredits = async () => {
        try {
            const res  = await fetch('/api/billing/credits')
            const data = await res.json()
            if (res.ok) setCredits(data)
        } catch {}
    }

    const fetchInvoices = async () => {
        setInvoicesLoading(true)
        try {
            const res  = await fetch('/api/billing/invoices')
            const data = await res.json()
            if (res.ok) setInvoices(data.invoices || [])
        } catch {} finally {
            setInvoicesLoading(false)
        }
    }

    const fetchSubscription = async () => {
        try {
            const res  = await fetch('/api/subscriptions/current')
            const data = await res.json()
            if (res.ok) {
                setSubscription(data.subscription)
                setUsageData(data.usage)
                setLimits(data.limits)
            } else {
                toast.error(data.error || 'Failed to fetch subscription')
            }
        } catch {
            toast.error('Failed to fetch subscription')
        }
    }

    const handleUpgrade = async (planId) => {
        const tid = toast.loading('Processing upgrade...')
        try {
            const res  = await fetch('/api/subscriptions/current?action=upgrade', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ plan_id: planId }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('Subscription updated!', { id: tid })
                fetchSubscription()
            } else {
                toast.error(data.error || 'Upgrade failed', { id: tid })
            }
        } catch {
            toast.error('Upgrade failed', { id: tid })
        }
    }

    const handleTabChange = (tab) => {
        setActiveTab(tab)
        if (tab === 'invoices' && invoices.length === 0) fetchInvoices()
    }

    // ── derived values ──────────────────────────────────────────────────────
    const currencySymbol  = organization?.currency_symbol || '₹'
    const planName        = subscription?.plan?.name || 'Free'
    const planSlug        = subscription?.plan?.slug || 'free'
    const isPlanActive    = subscription?.status === 'active'
    const isCancelling    = subscription?.cancel_at_period_end
    const daysRemaining   = getDaysRemaining(subscription?.current_period_end)
    const monthlyBilling  = (subscription?.plan?.per_user_price_inr && subscription?.user_count)
        ? subscription.plan.per_user_price_inr * subscription.user_count
        : 0

    const usageBars = (usageData && limits) ? [
        { label: 'Projects',     icon: FolderKanban, color: 'blue',    current: usageData.projects,  limit: limits.projects  },
        { label: 'Team Members', icon: Users,        color: 'violet',  current: usageData.users,     limit: limits.users     },
        { label: 'Campaigns',    icon: Megaphone,    color: 'emerald', current: usageData.campaigns, limit: limits.campaigns },
        { label: 'AI Calls',     icon: Phone,        color: 'orange',  current: usageData.ai_calls,  limit: limits.ai_calls  },
    ] : []

    // ── loading skeleton ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="h-full bg-gray-50/50 overflow-y-auto">
                <div className="max-w-6xl mx-auto p-6 space-y-5">
                    <Skeleton className="h-52 w-full rounded-2xl" />
                    <Skeleton className="h-11 w-96 rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full bg-gray-50/50 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-6 space-y-5">

                {/* ── Plan Hero Banner ────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* gradient stripe */}
                    <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
                    <div className="p-6">
                        {/* top row: plan identity + billing pill(s) */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            {/* left: icon + name + description + period */}
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-200">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                        <h1 className="text-xl font-bold text-slate-900">{planName} Plan</h1>
                                        {isCancelling ? (
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 text-xs font-medium">
                                                <AlertTriangle className="w-3 h-3" />
                                                Cancels {formatDate(subscription?.current_period_end)}
                                            </Badge>
                                        ) : isPlanActive ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 text-xs font-medium">
                                                <CheckCircle2 className="w-3 h-3" /> Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 leading-snug">
                                        {subscription?.plan?.description || 'Your current subscription plan'}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                            {formatDate(subscription?.current_period_start)}
                                            {' → '}
                                            {formatDate(subscription?.current_period_end)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* right: days + billing + upgrade */}
                            <div className="flex items-center gap-3 shrink-0">
                                {daysRemaining !== null && (
                                    <div className="text-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className={cn(
                                            'text-2xl font-bold tabular-nums',
                                            daysRemaining <= 7 ? 'text-amber-600' : 'text-slate-900'
                                        )}>
                                            {daysRemaining}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mt-0.5">days left</div>
                                    </div>
                                )}
                                {monthlyBilling > 0 ? (
                                    <div className="text-center px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="text-2xl font-bold text-blue-700 tabular-nums">
                                            {currencySymbol}{monthlyBilling.toFixed(0)}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mt-0.5">/ month</div>
                                    </div>
                                ) : planSlug === 'free' && (
                                    <Button
                                        size="sm"
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm gap-1.5 font-semibold"
                                        onClick={() => handleTabChange('plans')}
                                    >
                                        <TrendingUp className="w-4 h-4" /> Upgrade
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* stats strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
                            {[
                                { label: 'Team Members',   value: usageData?.users    ?? '—', icon: Users,         bg: 'bg-violet-50',  text: 'text-violet-600'  },
                                { label: 'Projects Active',value: usageData?.projects ?? '—', icon: FolderKanban,  bg: 'bg-blue-50',    text: 'text-blue-600'    },
                                { label: 'Credits Balance',value: credits?.balance != null ? credits.balance.toFixed(1) : '—',
                                                                                               icon: Wallet,        bg: 'bg-emerald-50', text: 'text-emerald-600', suffix: ' cr' },
                                { label: 'Calls This Period', value: usageData?.ai_calls ?? '—', icon: Phone,      bg: 'bg-orange-50',  text: 'text-orange-600'  },
                            ].map(({ label, value, icon: Icon, bg, text, suffix }) => (
                                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
                                        <Icon className={cn('w-4 h-4', text)} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-slate-500 font-medium leading-none mb-0.5 truncate">{label}</p>
                                        <p className="text-base font-bold text-slate-900 tabular-nums">{value}{suffix}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Tabs ────────────────────────────────────────────────────── */}
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="bg-white border border-slate-200 p-1 h-auto gap-0.5 rounded-xl w-full sm:w-auto">
                        {[
                            { value: 'overview', label: 'Overview',     icon: LayoutDashboard },
                            { value: 'plans',    label: 'Plans',         icon: Zap             },
                            { value: 'credits',  label: 'Call Credits',  icon: Phone           },
                            { value: 'invoices', label: 'Invoices',      icon: Receipt         },
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

                    {/* ───────── Overview ───────── */}
                    <TabsContent value="overview" className="mt-4 space-y-4">
                        {/* Usage & Limits */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 rounded-t-xl">
                                <h2 className="text-sm font-semibold text-slate-800">Usage &amp; Limits</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Current period usage against your plan limits</p>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                                {usageBars.length > 0 ? usageBars.map(({ label, icon: Icon, color, current, limit }) => {
                                    const c         = colorMap[color]
                                    const isUnlim   = limit === -1 || limit === 0
                                    const pct       = isUnlim ? 0 : Math.min(100, (current / limit) * 100)
                                    const isNear    = pct >= 75 && !isUnlim
                                    const isFull    = pct >= 90 && !isUnlim
                                    const barColor  = isFull ? 'bg-red-500' : isNear ? 'bg-amber-500' : c.bar
                                    return (
                                        <div key={label} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('h-6 w-6 rounded-md flex items-center justify-center', c.bg)}>
                                                        <Icon className={cn('w-3.5 h-3.5', c.text)} />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700">{label}</span>
                                                </div>
                                                <span className="text-sm text-slate-600 font-semibold tabular-nums">
                                                    {current} / {isUnlim ? '∞' : limit}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                {isUnlim ? (
                                                    <div className="h-full w-full bg-emerald-200 rounded-full" />
                                                ) : (
                                                    <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
                                                )}
                                            </div>
                                            {isFull && (
                                                <p className="text-xs text-red-600 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Limit almost reached — upgrade to add more
                                                </p>
                                            )}
                                        </div>
                                    )
                                }) : (
                                    <div className="col-span-2 py-10 text-center text-slate-400 text-sm">
                                        No usage data available.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upgrade nudge */}
                        {planSlug !== 'enterprise' && (
                            <div className="rounded-xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles className="w-4 h-4 text-blue-200" />
                                        <p className="font-semibold text-sm">Unlock more with a higher plan</p>
                                    </div>
                                    <p className="text-xs text-blue-200">
                                        Get unlimited leads, advanced analytics, priority support and more.
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="bg-white text-blue-700 hover:bg-blue-50 shrink-0 gap-1.5 font-semibold"
                                    onClick={() => handleTabChange('plans')}
                                >
                                    <TrendingUp className="w-3.5 h-3.5" /> View Plans
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    {/* ───────── Plans ───────── */}
                    <TabsContent value="plans" className="mt-4">
                        <PricingTiers
                            currentPlan={subscription?.plan?.name}
                            onUpgrade={handleUpgrade}
                            organizationCurrency={organization?.currency}
                            organizationCurrencySymbol={currencySymbol}
                        />
                    </TabsContent>

                    {/* ───────── Call Credits ───────── */}
                    <TabsContent value="credits" className="mt-4 space-y-4">
                        {/* Balance hero */}
                        <div className={cn(
                            'rounded-xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
                            credits?.lowBalance
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-white border-slate-200 shadow-sm'
                        )}>
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    'h-12 w-12 rounded-xl flex items-center justify-center shadow-sm',
                                    credits?.lowBalance ? 'bg-amber-100' : 'bg-emerald-100'
                                )}>
                                    <Wallet className={cn('w-6 h-6', credits?.lowBalance ? 'text-amber-600' : 'text-emerald-600')} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Current Balance</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-bold text-slate-900 tabular-nums">
                                            {credits?.balance?.toFixed(2) || '0.00'}
                                        </span>
                                        <span className="text-sm text-slate-500 font-medium">credits</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        1 credit = 1 min of calling &nbsp;·&nbsp; ₹4 per credit
                                    </p>
                                </div>
                            </div>
                            {credits?.lowBalance && (
                                <div className="flex items-center gap-2 text-amber-700 bg-amber-100 px-3 py-2 rounded-lg text-sm font-medium">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    Low balance — top up to avoid call interruptions
                                </div>
                            )}
                        </div>

                        {/* Purchase + Transaction history */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <CreditPurchase
                                currentBalance={credits?.balance}
                                onPurchaseComplete={fetchCredits}
                            />

                            {/* Transactions */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                                    <h3 className="text-sm font-semibold text-slate-800">Transaction History</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Recent credit activity</p>
                                </div>
                                <div className="divide-y divide-slate-100 overflow-y-auto flex-1" style={{ maxHeight: 420 }}>
                                    {credits?.transactions?.length > 0 ? (
                                        credits.transactions.map((tx) => {
                                            const cfg  = txTypeConfig[tx.type] || txTypeConfig.deduct
                                            const Icon = cfg.icon
                                            const isPlus = cfg.sign === '+'
                                            return (
                                                <div
                                                    key={tx.id}
                                                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
                                                            <Icon className={cn('w-4 h-4', cfg.color)} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-800">{cfg.label}</p>
                                                            <p className="text-xs text-slate-400">
                                                                {new Date(tx.created_at).toLocaleDateString('en-IN', {
                                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className={cn('text-sm font-semibold tabular-nums', isPlus ? 'text-emerald-600' : 'text-slate-700')}>
                                                            {cfg.sign}{Math.abs(tx.amount).toFixed(2)}
                                                        </p>
                                                        {tx.balance_after != null && (
                                                            <p className="text-xs text-slate-400 tabular-nums">
                                                                Bal: {Number(tx.balance_after).toFixed(2)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="py-14 text-center text-slate-400">
                                            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-25" />
                                            <p className="text-sm font-medium text-slate-500">No transactions yet</p>
                                            <p className="text-xs mt-1">Credit activity will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ───────── Invoices ───────── */}
                    <TabsContent value="invoices" className="mt-4">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                                <h3 className="text-sm font-semibold text-slate-800">Billing History</h3>
                                <p className="text-xs text-slate-500 mt-0.5">All invoices and payment records</p>
                            </div>
                            {invoicesLoading ? (
                                <div className="p-6 space-y-3">
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                                </div>
                            ) : invoices.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {/* column headers */}
                                    <div className="hidden sm:grid grid-cols-[1fr_120px_100px_110px] gap-4 px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        <span>Description</span>
                                        <span className="text-right">Amount</span>
                                        <span className="text-center">Status</span>
                                        <span className="text-right">Date</span>
                                    </div>
                                    {invoices.map((inv) => {
                                        const isPaid = inv.status === 'paid'
                                        return (
                                            <div
                                                key={inv.id}
                                                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_100px_110px] gap-4 items-center px-5 py-4 hover:bg-slate-50/60 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                        <FileText className="w-4 h-4 text-slate-500" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">
                                                            {inv.description || 'Invoice'}
                                                        </p>
                                                        <p className="text-xs text-slate-400">#{String(inv.id).slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 text-right tabular-nums">
                                                    {currencySymbol}{Number(inv.amount || 0).toFixed(2)}
                                                </span>
                                                <div className="hidden sm:flex justify-center">
                                                    <Badge className={cn(
                                                        'text-xs font-medium capitalize',
                                                        isPaid
                                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                            : 'bg-amber-100 text-amber-700 border-amber-200'
                                                    )}>
                                                        {inv.status}
                                                    </Badge>
                                                </div>
                                                <span className="hidden sm:block text-xs text-slate-400 text-right">
                                                    {formatDate(inv.created_at)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="py-16 text-center text-slate-400">
                                    <Receipt className="w-10 h-10 mx-auto mb-3 opacity-25" />
                                    <p className="text-sm font-medium text-slate-500">No invoices yet</p>
                                    <p className="text-xs mt-1">Your billing history will appear here</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

            </div>
        </div>
    )
}
