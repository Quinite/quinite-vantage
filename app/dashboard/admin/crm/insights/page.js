'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadialBarChart,
    RadialBar
} from 'recharts'
import { Activity, MessageSquare, Banknote, Calendar, AlertTriangle, UserCheck, TrendingUp, Brain, Sparkles, FileDown } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'
import { Button } from '@/components/ui/button'

function ConversationInsightsContent({ campaignId = null, dateRange = 30 }) {
    const canExport = usePermission('export_reports')
    const [insights, setInsights] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalInsights: 0,
        avgSentiment: 0,
        highInterest: 0,
        budgetMentioned: 0
    })
    const supabase = createClient()

    useEffect(() => {
        fetchInsights()
    }, [campaignId, dateRange])

    const fetchInsights = async () => {
        let query = supabase
            .from('call_logs')
            .select('*')
            .not('sentiment_score', 'is', null) // Only fetch analyzed calls
            .gte('created_at', new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })

        if (campaignId) {
            query = query.eq('campaign_id', campaignId)
        }

        const { data, error } = await query

        if (!error && data) {
            setInsights(data)
            calculateStats(data)
        }
        setLoading(false)
    }

    const calculateStats = (data) => {
        const totalInsights = data.length
        const avgSentiment = data.reduce((sum, i) => sum + (i.sentiment_score || 0), 0) / (totalInsights || 1)
        const highInterest = data.filter(i => i.interest_level === 'high').length
        const budgetMentioned = data.filter(i => i.ai_metadata?.budget_estimated).length

        setStats({
            totalInsights,
            avgSentiment: avgSentiment.toFixed(2),
            highInterest,
            budgetMentioned
        })
    }

    // Sentiment Distribution
    const getSentimentData = () => {
        const positive = insights.filter(i => i.sentiment_score > 0.3).length
        const neutral = insights.filter(i => i.sentiment_score >= -0.3 && i.sentiment_score <= 0.3).length
        const negative = insights.filter(i => i.sentiment_score < -0.3).length

        return [
            { name: 'Positive', value: positive, color: '#10b981', fill: '#10b981' },
            { name: 'Neutral', value: neutral, color: '#f59e0b', fill: '#f59e0b' },
            { name: 'Negative', value: negative, color: '#ef4444', fill: '#ef4444' }
        ]
    }

    // Interest Level Distribution
    const getInterestData = () => {
        const high = insights.filter(i => i.interest_level === 'high').length
        const medium = insights.filter(i => i.interest_level === 'medium').length
        const low = insights.filter(i => i.interest_level === 'low').length

        return [
            { name: 'High', value: high, fill: '#10b981' },
            { name: 'Medium', value: medium, fill: '#f59e0b' },
            { name: 'Low', value: low, fill: '#ef4444' }
        ]
    }

    // Purchase Readiness (Derived from Interest and Metadata)
    const getPurchaseReadinessData = () => {
        const high = insights.filter(i => i.interest_level === 'high').length
        const medium = insights.filter(i => i.interest_level === 'medium').length
        const low = insights.filter(i => i.interest_level === 'low').length
        const none = insights.filter(i => i.interest_level === 'none').length

        return [
            { name: 'Immediate', value: high, fill: '#10b981' },
            { name: 'Short Term', value: medium, fill: '#3b82f6' },
            { name: 'Long Term', value: low, fill: '#f59e0b' },
            { name: 'Not Ready', value: none, fill: '#ef4444' }
        ]
    }

    // Common Objections
    const getCommonObjections = () => {
        const objectionCounts = {}
        insights.forEach(insight => {
            const objections = insight.ai_metadata?.objections
            if (objections && Array.isArray(objections)) {
                objections.forEach(obj => {
                    objectionCounts[obj] = (objectionCounts[obj] || 0) + 1
                })
            }
        })

        return Object.entries(objectionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count, fill: '#ef4444' }))
    }

    // Budget Ranges
    const getBudgetRanges = () => {
        const ranges = {
            'Mentioned': 0,
            'Not Mentioned': 0
        }

        insights.forEach(insight => {
            if (insight.ai_metadata?.budget_estimated) {
                ranges['Mentioned']++
            } else {
                ranges['Not Mentioned']++
            }
        })

        return Object.entries(ranges).map(([name, value], index) => ({
            name,
            value,
            fill: ['#10b981', '#6b7280'][index]
        }))
    }

    if (loading) {
        return <InsightsSkeleton />
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900">{payload[0].name}</p>
                    <p className="text-sm text-gray-600">Count: <span className="font-bold">{payload[0].value}</span></p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                        Conversation Insights
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        AI-powered analysis of customer conversations
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-background w-fit">
                        Last {dateRange} days
                    </Badge>
                    <PermissionTooltip
                        hasPermission={canExport}
                        message="You need 'Export Reports' permission to export insights."
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!canExport}
                            onClick={() => {
                                // TODO: Implement export functionality
                                alert('Export functionality coming soon!')
                            }}
                            className="gap-2"
                        >
                            <FileDown className="w-4 h-4" />
                            Export
                        </Button>
                    </PermissionTooltip>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Total Conversations */}
                <Card className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
                            <h3 className="text-2xl font-semibold text-foreground mt-1">{stats.totalInsights}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Analyzed interactions</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Avg Sentiment */}
                <Card className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                <Activity className="w-5 h-5" />
                            </div>
                            <Badge variant={stats.avgSentiment > 0 ? "default" : stats.avgSentiment < 0 ? "destructive" : "secondary"} className="text-[10px]">
                                {stats.avgSentiment > 0 ? 'Positive' : stats.avgSentiment < 0 ? 'Negative' : 'Neutral'}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg Sentiment</p>
                            <h3 className="text-2xl font-semibold text-foreground mt-1">{stats.avgSentiment}</h3>
                            <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
                                <div
                                    className={`h-1.5 rounded-full transition-all duration-500 ${stats.avgSentiment > 0 ? 'bg-green-500' : stats.avgSentiment < 0 ? 'bg-red-500' : 'bg-yellow-500'}`}
                                    style={{ width: `${Math.min(Math.abs(stats.avgSentiment) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* High Interest */}
                <Card className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                                {stats.totalInsights > 0 ? Math.round((stats.highInterest / stats.totalInsights) * 100) : 0}%
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">High Interest</p>
                            <h3 className="text-2xl font-semibold text-foreground mt-1">{stats.highInterest}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Qualified leads</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Budget Mentioned */}
                <Card className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                <Banknote className="w-5 h-5" />
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                                {stats.totalInsights > 0 ? Math.round((stats.budgetMentioned / stats.totalInsights) * 100) : 0}%
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Budget Mentioned</p>
                            <h3 className="text-2xl font-semibold text-foreground mt-1">{stats.budgetMentioned}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Ready to invest</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="sentiment" className="space-y-6">
                <TabsList className="bg-white shadow-md border-0 p-1 w-full flex flex-wrap h-auto">
                    <TabsTrigger value="sentiment" className="flex-1 sm:min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
                        Sentiment
                    </TabsTrigger>
                    <TabsTrigger value="interest" className="flex-1 sm:min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
                        Interest Level
                    </TabsTrigger>
                    <TabsTrigger value="readiness" className="flex-1 sm:min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white">
                        Purchase Readiness
                    </TabsTrigger>
                    <TabsTrigger value="objections" className="flex-1 sm:min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white">
                        Objections
                    </TabsTrigger>
                    <TabsTrigger value="budget" className="flex-1 sm:min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white">
                        Budget
                    </TabsTrigger>
                </TabsList>

                {/* Sentiment Distribution */}
                <TabsContent value="sentiment" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-muted-foreground" />
                                    Sentiment Distribution
                                </CardTitle>
                                <CardDescription>Overall customer sentiment across conversations</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={getSentimentData().filter(i => i.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={120}
                                            innerRadius={60}
                                            fill="#8884d8"
                                            dataKey="value"
                                            paddingAngle={5}
                                        >
                                            {getSentimentData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg">
                            <CardHeader className="border-b">
                                <CardTitle>Sentiment Breakdown</CardTitle>
                                <CardDescription>Detailed sentiment analysis</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-6">
                                    {getSentimentData().map((item, index) => (
                                        <div key={index} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="font-medium text-gray-700">{item.name}</span>
                                                </div>
                                                <span className="text-2xl font-bold text-gray-900">{item.value}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className="h-3 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${stats.totalInsights > 0 ? (item.value / stats.totalInsights) * 100 : 0}%`,
                                                        backgroundColor: item.color
                                                    }}
                                                />
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {stats.totalInsights > 0 ? ((item.value / stats.totalInsights) * 100).toFixed(1) : 0}% of total
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Interest Level */}
                <TabsContent value="interest">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-muted-foreground" />
                                Interest Level Breakdown
                            </CardTitle>
                            <CardDescription>Customer interest in the product/service</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={getInterestData()}>
                                    <defs>
                                        <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                                        </linearGradient>
                                        <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        </linearGradient>
                                        <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" stroke="#6b7280" />
                                    <YAxis stroke="#6b7280" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Count">
                                        {getInterestData().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Purchase Readiness */}
                <TabsContent value="readiness">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-muted-foreground" />
                                Purchase Readiness Timeline
                            </CardTitle>
                            <CardDescription>When customers are ready to make a decision</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={getPurchaseReadinessData()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" stroke="#6b7280" />
                                    <YAxis stroke="#6b7280" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Count">
                                        {getPurchaseReadinessData().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Common Objections */}
                <TabsContent value="objections">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                                Common Objections
                            </CardTitle>
                            <CardDescription>Most frequently raised concerns</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={getCommonObjections()} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" stroke="#6b7280" />
                                    <YAxis dataKey="name" type="category" width={180} stroke="#6b7280" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" radius={[0, 8, 8, 0]} name="Occurrences">
                                        {getCommonObjections().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Budget Ranges */}
                <TabsContent value="budget">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-muted-foreground" />
                                Budget Range Distribution
                            </CardTitle>
                            <CardDescription>Customer budget preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={getBudgetRanges().filter(i => i.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={true}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        outerRadius={130}
                                        innerRadius={70}
                                        fill="#8884d8"
                                        dataKey="value"
                                        paddingAngle={3}
                                    >
                                        {getBudgetRanges().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function InsightsSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-xl" />
                <div className="space-y-2">
                    <Skeleton className="h-10 w-80" />
                    <Skeleton className="h-4 w-96" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-0 shadow-lg">
                        <CardContent className="p-6">
                            <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-10 w-20 mb-2" />
                            <Skeleton className="h-3 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="space-y-4">
                <Skeleton className="h-12 w-full max-w-2xl rounded-lg" />
                <Card className="border-0 shadow-lg">
                    <CardHeader className="border-b">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}



export default function ConversationInsightsDashboard(props) {
    return (
        <PermissionGate
            feature="view_crm_insights"
            fallbackMessage="You don't have permission to view insights. Contact your administrator."
        >
            <ConversationInsightsContent {...props} />
        </PermissionGate>
    )
}
