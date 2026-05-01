'use client'
import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Users,
    FolderKanban,
    UserPlus,
    Megaphone,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    Download,
    Plus,
    BarChart3,
    FileText,
    Settings,
    KanbanSquare,
    Building
} from 'lucide-react'
import Link from 'next/link'
import CustomBreadcrumbs from '@/components/ui/CustomBreadcrumbs'
import { usePermissions } from '@/contexts/PermissionContext'

export default function AdminDashboardPage() {
    const [dashboardStats, setDashboardStats] = useState({
        users: { value: 0, trend: 0 },
        projects: { value: 0, trend: 0 },
        leads: { value: 0, trend: 0 },
        activeCampaigns: { value: 0, trend: 0 }
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/admin/stats')
                const data = await res.json()
                if (res.ok) {
                    setDashboardStats(data)
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    const formatTrend = (val) => {
        if (val > 0) return `+${val}%`
        return `${val}%`
    }

    const getTrendDirection = (val) => {
        return val >= 0 ? 'up' : 'down'
    }

    const { hasPermission, hasAnyPermission, loading: permissionsLoading } = usePermissions()

    const stats = [
        {
            title: 'Total Leads',
            value: loading ? '...' : dashboardStats.leads?.value || 0,
            change: loading ? '...' : `${formatTrend(dashboardStats.leads?.trend || 0)} from last 30 days`,
            trend: getTrendDirection(dashboardStats.leads?.trend || 0),
            icon: UserPlus,
            permission: ['view_own_leads', 'view_team_leads', 'view_all_leads']
        },
        {
            title: 'Active Campaigns',
            value: loading ? '...' : dashboardStats.activeCampaigns?.value || 0,
            change: loading ? '...' : `${formatTrend(dashboardStats.activeCampaigns?.trend || 0)} from last 30 days`,
            trend: getTrendDirection(dashboardStats.activeCampaigns?.trend || 0),
            icon: Megaphone,
            permission: 'view_campaigns'
        },
        {
            title: 'Total Projects',
            value: loading ? '...' : dashboardStats.projects?.value || 0,
            change: loading ? '...' : `${formatTrend(dashboardStats.projects?.trend || 0)} from last 30 days`,
            trend: getTrendDirection(dashboardStats.projects?.trend || 0),
            icon: FolderKanban,
            permission: 'view_projects'
        },
        {
            title: 'Total Users',
            value: loading ? '...' : dashboardStats.users?.value || 0,
            change: loading ? '...' : `${formatTrend(dashboardStats.users?.trend || 0)} from last 30 days`,
            trend: getTrendDirection(dashboardStats.users?.trend || 0),
            icon: Users,
            permission: 'view_users'
        }
    ]

    const filteredStats = stats.filter(stat => {
        if (!stat.permission) return true
        if (Array.isArray(stat.permission)) return hasAnyPermission(stat.permission)
        return hasPermission(stat.permission)
    })

    const quickActions = [
        {
            title: 'Manage CRM Pipeline',
            description: 'View deals and update stages',
            href: '/dashboard/admin/crm',
            icon: KanbanSquare,
            permission: ['view_own_leads', 'view_team_leads', 'view_all_leads', 'view_projects']
        },
        {
            title: 'Manage Inventory',
            description: 'Add properties or update listings',
            href: '/dashboard/admin/inventory',
            icon: Building,
            permission: 'view_inventory'
        },
        {
            title: 'View Analytics',
            description: 'Track overall performance',
            href: '/dashboard/admin/analytics',
            icon: BarChart3,
            permission: ['view_own_analytics', 'view_team_analytics', 'view_org_analytics']
        },
        {
            title: 'Organization Settings',
            description: 'Manage users and profile',
            href: '/dashboard/admin/settings',
            icon: Settings,
            permission: 'view_settings'
        }
    ]

    const filteredQuickActions = quickActions.filter(action => {
        if (!action.permission) return true
        if (Array.isArray(action.permission)) return hasAnyPermission(action.permission)
        return hasPermission(action.permission)
    })

    const handleExport = () => {
        const headers = ['Metric,Value,Trend\n']
        const rows = [
            `Total Users,${dashboardStats.users?.value || 0},${dashboardStats.users?.trend || 0}%`,
            `Total Projects,${dashboardStats.projects?.value || 0},${dashboardStats.projects?.trend || 0}%`,
            `Total Leads,${dashboardStats.leads?.value || 0},${dashboardStats.leads?.trend || 0}%`,
            `Total Campaigns,${dashboardStats.activeCampaigns?.value || 0},${dashboardStats.activeCampaigns?.trend || 0}%`
        ]
        const csvContent = headers.concat(rows).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', 'dashboard_stats.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleDownloadPDF = () => {
        const doc = new jsPDF()

        // Add Company Logo/Title
        doc.setFontSize(20)
        doc.setTextColor(40, 40, 40)
        doc.text('Vantage CRM', 14, 22)

        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text('Performance Report', 14, 28)

        // Add Date
        const date = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        doc.text(`Generated on: ${date}`, 14, 34)

        // Add Line
        doc.setDrawColor(200, 200, 200)
        doc.line(14, 38, 196, 38)

        // Prepare Data for Table
        const tableData = [
            ['Total Leads', dashboardStats.leads?.value || 0, `${dashboardStats.leads?.trend > 0 ? '+' : ''}${dashboardStats.leads?.trend}%`],
            ['Active Campaigns', dashboardStats.activeCampaigns?.value || 0, `${dashboardStats.activeCampaigns?.trend > 0 ? '+' : ''}${dashboardStats.activeCampaigns?.trend}%`],
            ['Total Projects', dashboardStats.projects?.value || 0, `${dashboardStats.projects?.trend > 0 ? '+' : ''}${dashboardStats.projects?.trend}%`],
            ['Total Users', dashboardStats.users?.value || 0, `${dashboardStats.users?.trend > 0 ? '+' : ''}${dashboardStats.users?.trend}%`]
        ]

        // Generate Table
        autoTable(doc, {
            startY: 45,
            head: [['Metric', 'Value', 'Trend']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [66, 133, 244],
                textColor: 255,
                fontSize: 12
            },
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            columnStyles: {
                0: { fontStyle: 'bold' },
                2: { textColor: [100, 100, 100] }
            }
        })

        // Add Summary Section
        const finalY = doc.lastAutoTable.finalY || 100
        doc.setFontSize(12)
        doc.setTextColor(40, 40, 40)
        doc.text('Summary', 14, finalY + 15)

        doc.setFontSize(10)
        doc.setTextColor(80, 80, 80)
        doc.text(`This report summarizes key performance metrics for the current month.`, 14, finalY + 22)

        // Footer
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' })
            doc.text('Generated by Vantage CRM', 14, 285)
        }

        doc.save(`monthly_report_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="mb-2">
                <CustomBreadcrumbs />
            </div>
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard Overview</h1>
                    <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening today.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button variant="outline" onClick={handleExport} className="gap-2 text-xs w-full sm:w-auto justify-center">
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </Button>
                    {hasPermission('view_inventory') && (
                        <Link href="/dashboard/admin/inventory/new" className="w-full sm:w-auto">
                            <Button className="gap-2 text-xs w-full justify-center">
                                <Plus className="w-3.5 h-3.5" />
                                New Property
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredStats.map((stat, index) => {
                    const Icon = stat.icon
                    const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown

                    return (
                        <Card key={index} className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${stat.trend === 'up' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                        <TrendIcon className="w-3 h-3" />
                                        {stat.change}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                                    <h3 className="text-2xl font-semibold text-foreground mt-1">{stat.value}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Content Grid */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Quick Links Column */}
                <div className="flex-1 lg:flex-[2] flex flex-col gap-6">
                    <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredQuickActions.map((action, index) => {
                            const Icon = action.icon
                            return (
                                <Link key={index} href={action.href} className="block h-full">
                                    <Card className="group hover:bg-secondary/40 transition-all cursor-pointer h-full border-border min-h-[140px] flex flex-col justify-center">
                                        <CardContent className="p-6 flex items-start gap-4">
                                            <div className="text-muted-foreground group-hover:text-primary transition-colors">
                                                <div className="p-3 rounded-md bg-secondary border border-border">
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                                                        {action.title}
                                                    </h3>
                                                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {action.description}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Report Column */}
                <div className="flex-1 flex flex-col gap-6">
                    <h2 className="text-lg font-semibold text-foreground">Reports</h2>
                    <Card className="flex-1 flex flex-col border-border bg-gradient-to-br from-card to-secondary/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base font-medium">
                                <FileText className="w-4 h-4 text-primary" />
                                Performance Insight
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 pb-6">
                            <div className="h-full border border-dashed border-border rounded-lg flex flex-col items-center justify-center bg-card/50 p-6 text-center">
                                <div className="p-3 bg-secondary rounded-full mb-3">
                                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <p className="text-foreground font-medium text-sm">Monthly Report Generated</p>
                                <p className="text-xs text-muted-foreground mt-1 mb-4">Based on your recent activity</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs h-8"
                                    onClick={handleDownloadPDF}
                                >
                                    Download PDF
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
