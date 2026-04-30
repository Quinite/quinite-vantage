'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Wallet, Zap, AlertTriangle, RefreshCw, Mail, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

function formatDateTime(dateStr) {
    const d = new Date(dateStr)
    const date = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${date} · ${time}`
}

function getTransactionMeta(type) {
    switch (type) {
        case 'manual_topup':
            return { badge: '+', badgeClass: 'bg-green-100 text-green-800', label: 'Added by admin', positive: true }
        case 'plan_allocation':
            return { badge: '+', badgeClass: 'bg-blue-100 text-blue-800', label: 'Plan allocation', positive: true }
        case 'consumption':
            return { badge: '-', badgeClass: 'bg-red-100 text-red-800', label: 'Call usage', positive: false }
        case 'refund':
            return { badge: '+', badgeClass: 'bg-green-100 text-green-800', label: 'Refund', positive: true }
        case 'adjustment':
            return { badge: '~', badgeClass: 'bg-blue-100 text-blue-800', label: 'Adjustment', positive: true }
        default:
            return { badge: '~', badgeClass: 'bg-gray-100 text-gray-800', label: type, positive: true }
    }
}

function SkeletonCard() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-28" />
            </CardContent>
        </Card>
    )
}

export default function CreditBalance() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [refreshing, setRefreshing] = useState(false)

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/billing/credits')
            if (!res.ok) throw new Error(`Failed to load credits (${res.status})`)
            const json = await res.json()
            setData(json)
            if (isRefresh) toast.success('Credits refreshed')
        } catch (err) {
            console.error('CreditBalance fetch error:', err)
            setError(err.message || 'Failed to load credit balance')
            if (isRefresh) toast.error('Failed to refresh credits')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="p-4 flex justify-between items-center">
                                    <div className="flex gap-3 items-center">
                                        <Skeleton className="h-5 w-5 rounded-full" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="py-8 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                    <p className="text-red-700 font-medium mb-4">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => fetchData()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const { credits, transactions = [] } = data || {}
    const recentTransactions = transactions.slice(0, 20)

    return (
        <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">AI Call Minutes</h2>
                    <p className="text-sm text-muted-foreground">Your current credit balance and usage</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Low balance alert */}
            {credits?.low_balance && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                    <span>
                        <span className="font-medium">Low AI call minutes</span> — contact support to top up before your campaigns are paused.
                    </span>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Call Credits */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Call Credits</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-start gap-2">
                            <p className="text-3xl font-bold text-gray-900">{credits?.balance ?? 0}</p>
                            {credits?.low_balance && (
                                <Badge className="bg-amber-100 text-amber-800 mt-1 text-xs">Low balance</Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">minutes available</p>
                    </CardContent>
                </Card>

                {/* Total Consumed */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Consumed</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-3xl font-bold text-gray-900">{credits?.total_consumed ?? 0}</p>
                        <p className="text-xs text-muted-foreground">minutes used all time</p>
                    </CardContent>
                </Card>
            </div>

            {/* Contact support card */}
            <Card className="bg-gray-50 border-gray-200">
                <CardContent className="py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Need more AI call minutes?</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Contact us to purchase additional minutes — our team will add them to your account within 24 hours.
                            </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm" asChild>
                                <a href="mailto:support@quinite.in" className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Email us
                                </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href="https://wa.me/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    WhatsApp
                                </a>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Transaction History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {recentTransactions.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No call activity yet
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Minutes</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Balance After</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentTransactions.map((tx) => {
                                        const meta = getTransactionMeta(tx.transaction_type)
                                        const isPositive = tx.transaction_type !== 'consumption'
                                        return (
                                            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={`${meta.badgeClass} text-xs font-bold w-5 h-5 flex items-center justify-center p-0 rounded-full`}>
                                                            {meta.badge}
                                                        </Badge>
                                                        <span className="text-gray-700">{meta.label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-semibold ${isPositive ? 'text-green-700' : 'text-red-600'}`}>
                                                        {isPositive ? '+' : '-'}{Math.abs(tx.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {tx.balance_after}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                    {formatDateTime(tx.created_at)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
