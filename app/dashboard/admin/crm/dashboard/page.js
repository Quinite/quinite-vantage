'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    TrendingUp,
    TrendingDown,
    Users,
    Target,
    Activity,
    ArrowUpRight,
    Plus,
    Calendar,
    Phone,
    Mail,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PermissionGate } from '@/components/permissions/PermissionGate'

import { useCRMDashboard } from '@/hooks/useCRMDashboard'

export default function CRMDashboardPage() {
    const [dateRange, setDateRange] = useState('this_month')
    
    // Use React Query hook for data fetching and caching
    const { 
        data: stats, 
        isLoading: loading, 
        isRefetching, 
        error 
    } = useCRMDashboard(dateRange)

    const dateRangeOptions = [
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'this_quarter', label: 'This Quarter' },
        { value: 'last_quarter', label: 'Last Quarter' },
        { value: 'this_year', label: 'This Year' },
        { value: 'all_time', label: 'All Time' },
    ]

    const getDateRangeLabel = () => {
        return dateRangeOptions.find(opt => opt.value === dateRange)?.label || 'This Month'
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-500">
                <p>Failed to load dashboard data. Please try again later.</p>
                <Button onClick={() => window.location.reload()} className="mt-4">Reload Page</Button>
            </div>
        )
    }

    const metrics = [
        {

            value: loading ? '...' : stats?.totalLeads || 0,
            change: loading ? '...' : stats?.leadsChange || '+12%',
            trend: 'up',
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: 'view_own_leads', // Correct permission key
        },
        {
            title: 'Active Deals',
            value: loading ? '...' : stats?.activeDeals || 0,
            change: loading ? '...' : stats?.dealsChange || '+8%',
            trend: 'up',
            icon: Target,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            permission: 'view_own_leads', // Correct permission key
        },
        {
            title: 'Conversion Rate',
            value: loading ? '...' : stats?.conversionRate || '0%',
            change: loading ? '...' : stats?.conversionChange || '+3%',
            trend: 'up',
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: 'view_own_analytics', // Correct permission key
        },
        {
            title: 'Revenue (MTD)',
            value: loading ? '...' : stats?.revenue || '₹0',
            change: loading ? '...' : stats?.revenueChange || '+15%',
            trend: 'up',
            icon: null, // No icon, will show currency symbol
            currencySymbol: loading ? '₹' : (stats?.revenue?.match(/^[^\d]+/)?.[0] || '₹'),
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            permission: 'view_own_analytics', // Correct permission key
        },
    ]

    const recentActivities = loading ? [] : stats?.recentActivities || []

    const quickActions = [
        { label: 'Add Lead', href: '/dashboard/admin/crm/leads', icon: Plus, color: 'bg-blue-600 hover:bg-blue-700', permission: 'create_leads' },
        { label: 'View Pipeline', href: '/dashboard/admin/crm', icon: Target, color: 'bg-purple-600 hover:bg-purple-700', permission: 'view_own_leads' },
        { label: 'New Campaign', href: '/dashboard/admin/crm/campaigns', icon: Activity, color: 'bg-green-600 hover:bg-green-700', permission: 'create_campaigns' },
        { label: 'Analytics', href: '/dashboard/admin/crm/analytics', icon: TrendingUp, color: 'bg-orange-600 hover:bg-orange-700', permission: 'view_own_analytics' },
    ]

    const getActivityIcon = (type) => {
        switch (type) {
            case 'call': return Phone
            case 'email': return Mail
            case 'meeting': return Calendar
            case 'deal': return Target
            default: return Activity
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-50'
            case 'sent': return 'text-blue-600 bg-blue-50'
            case 'scheduled': return 'text-purple-600 bg-purple-50'
            case 'updated': return 'text-orange-600 bg-orange-50'
            default: return 'text-gray-600 bg-gray-50'
        }
    }

    if (loading) {
        return (
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-64 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">CRM Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview of your sales pipeline and activities</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 w-full sm:w-auto justify-between sm:justify-center">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {getDateRangeLabel()}
                                </div>
                                <ChevronDown className="w-4 h-4 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-full sm:w-48">
                            {dateRangeOptions.map((option) => (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => {
                                        setDateRange(option.value)
                                        setLoading(true)
                                    }}
                                    className={dateRange === option.value ? 'bg-accent' : ''}
                                >
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <PermissionGate feature="create_leads">
                        <Link href="/dashboard/admin/crm/leads" className="w-full sm:w-auto">
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 w-full justify-center">
                                <Plus className="w-4 h-4" />
                                Add Lead
                            </Button>
                        </Link>
                    </PermissionGate>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, index) => {
                    const Icon = metric.icon
                    const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown

                    return (
                        <PermissionGate key={index} feature={metric.permission}>
                            <Card className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                            {Icon ? (
                                                <Icon className="w-5 h-5" />
                                            ) : (
                                                <span className="text-lg font-bold">
                                                    {metric.currencySymbol}
                                                </span>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${metric.trend === 'up' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                            <TrendIcon className="w-3 h-3" />
                                            {metric.change}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                                        <h3 className="text-2xl font-semibold text-foreground mt-1">{metric.value}</h3>
                                    </div>
                                </CardContent>
                            </Card>
                        </PermissionGate>
                    )
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pipeline Overview & Quick Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Quick Actions</CardTitle>
                            <CardDescription>Common tasks and shortcuts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {quickActions.map((action, index) => {
                                    const Icon = action.icon
                                    return (
                                        <PermissionGate key={index} feature={action.permission}>
                                            <Link href={action.href}>
                                                <Button
                                                    variant="outline"
                                                    className="w-full h-auto flex-col gap-3 p-6 hover:bg-secondary/50 transition-all group"
                                                >
                                                    <div className="p-3 rounded-md bg-secondary border border-border text-muted-foreground group-hover:text-primary transition-colors">
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-sm font-medium">{action.label}</span>
                                                </Button>
                                            </Link>
                                        </PermissionGate>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pipeline Stages */}
                    <PermissionGate feature="view_own_leads">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Pipeline Overview</CardTitle>
                                <CardDescription>Deals by stage</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {(stats?.pipelineOverview || []).length > 0 ? (
                                        stats.pipelineOverview.map((stage, index) => {
                                            // Calculate percentage relative to max or total
                                            const total = stats?.totalLeads || 1
                                            const percentage = (stage.count / total) * 100

                                            return (
                                                <div key={index} className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm text-muted-foreground">{stage.count} deals</span>

                                                            </div>
                                                        </div>
                                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-500`}
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    backgroundColor: stage.color || '#3b82f6'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-center py-6 text-muted-foreground text-sm">
                                            No pipeline data available.
                                        </div>
                                    )}
                                </div>
                                <Link href="/dashboard/admin/crm">
                                    <Button variant="ghost" className="w-full mt-4 gap-2">
                                        View Full Pipeline
                                        <ArrowUpRight className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </PermissionGate>
                </div>

                {/* Recent Activities */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Activities</CardTitle>
                        <CardDescription>Latest updates and actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivities.length > 0 ? (
                                recentActivities.map((activity) => {
                                    const Icon = getActivityIcon(activity.type)
                                    return (
                                        <div key={activity.id} className="flex gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                                            <div className={`p-2 rounded-lg ${getStatusColor(activity.status)} flex-shrink-0`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground line-clamp-1">
                                                    {activity.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {activity.time}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    <p>No recent activities yet.</p>
                                    <p className="text-xs mt-1">Start by adding leads or creating campaigns.</p>
                                </div>
                            )}
                        </div>
                        <Link href="/dashboard/admin/crm/auditlog">
                            <Button variant="ghost" className="w-full mt-4 gap-2">
                                View All Activities
                                <ArrowUpRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-50">
                                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                                <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats?.tasksCompleted || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-orange-50">
                                <Clock className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Follow-ups</p>
                                <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats?.tasksPending || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-red-50">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Overdue Tasks</p>
                                <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats?.tasksOverdue || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
