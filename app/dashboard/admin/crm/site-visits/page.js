'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/contexts/PermissionContext'
import { startOfMonth, endOfMonth } from 'date-fns'
import { MapPin, Filter, List, CalendarDays, Search, ArrowUpDown, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAllSiteVisits } from '@/hooks/useSiteVisits'
import { useUsers } from '@/hooks/usePipelines'
import { useProjects } from '@/hooks/useProjects'
import SiteVisitCalendar from '@/components/crm/site-visits/SiteVisitCalendar'
import SiteVisitsTable from '@/components/crm/site-visits/SiteVisitsTable'

export default function SiteVisitsPage() {
    const router = useRouter()
    const { hasPermission, loading: permLoading } = usePermissions()

    useEffect(() => {
        if (!permLoading && !hasPermission('view_site_visits')) {
            router.replace('/dashboard/admin/crm/dashboard')
        }
    }, [permLoading, hasPermission])

    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()).toISOString(),
        to:   endOfMonth(new Date()).toISOString(),
    })
    const [viewMode, setViewMode] = useState('calendar')
    const [filterAgent,   setFilterAgent]   = useState('__all__')
    const [filterProject, setFilterProject] = useState('__all__')
    const [filterStatus,  setFilterStatus]  = useState('__all__')
    const [search,        setSearch]        = useState('')
    const [sortBy,        setSortBy]        = useState('date_asc')

    const { data: visits = [], isLoading } = useAllSiteVisits({
        from:      viewMode === 'calendar' ? dateRange.from : undefined,
        to:        viewMode === 'calendar' ? dateRange.to   : undefined,
        agentId:   filterAgent   !== '__all__' ? filterAgent   : undefined,
        projectId: filterProject !== '__all__' ? filterProject : undefined,
    })

    const { data: users = [] } = useUsers()
    const { data: projects = [] } = useProjects()

    const processedVisits = useMemo(() => {
        let result = [...visits]
        
        if (search) {
            const s = search.toLowerCase()
            result = result.filter(v => 
                v.leads?.name?.toLowerCase().includes(s) || 
                v.leads?.phone?.includes(s) ||
                v.visit_notes?.toLowerCase().includes(s)
            )
        }
        
        if (filterStatus !== '__all__') {
            result = result.filter(v => v.status === filterStatus)
        }
        
        result.sort((a, b) => {
            if (sortBy === 'date_asc') return new Date(a.scheduled_at) - new Date(b.scheduled_at)
            if (sortBy === 'date_desc') return new Date(b.scheduled_at) - new Date(a.scheduled_at)
            if (sortBy === 'status') return a.status.localeCompare(b.status)
            if (sortBy === 'name_asc') return (a.leads?.name || '').localeCompare(b.leads?.name || '')
            if (sortBy === 'name_desc') return (b.leads?.name || '').localeCompare(a.leads?.name || '')
            return 0
        })
        
        return result
    }, [visits, search, filterStatus, sortBy])

    const handleDateRangeChange = useCallback(({ from, to }) => {
        setDateRange({ from, to })
    }, [])

    const scheduledCount  = visits.filter(v => v.status === 'scheduled').length
    const completedCount  = visits.filter(v => v.status === 'completed').length
    const noShowCount     = visits.filter(v => v.status === 'no_show').length
    const cancelledCount  = visits.filter(v => v.status === 'cancelled').length
    const interestedCount = visits.filter(v => v.outcome === 'interested').length
    const conversionRate  = completedCount > 0 ? Math.round((interestedCount / completedCount) * 100) : 0

    return (
        <div className="flex flex-col h-full gap-6 p-4 md:p-8 bg-slate-50/50 overflow-y-auto">
            {/* Standardized Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <MapPin className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
                        Site Visits
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 mt-1">
                        {isLoading ? 'Loading site visits...' : `Track and manage ${visits.length} scheduled property viewings.`}
                    </p>
                </div>

                {/* Filters Row */}
                {(users.length > 0 || projects.length > 0) && (
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 w-full sm:w-auto overflow-x-auto no-scrollbar">
                            {/* Project Filter */}
                            <Select value={filterProject} onValueChange={setFilterProject}>
                                <SelectTrigger className="h-9 w-[130px] text-xs border-none bg-transparent focus:ring-0">
                                    <SelectValue placeholder="All projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All projects</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="w-px h-4 bg-slate-200 shrink-0" />

                            {/* Agent Filter */}
                            <Select value={filterAgent} onValueChange={setFilterAgent}>
                                <SelectTrigger className="h-9 w-[130px] text-xs border-none bg-transparent focus:ring-0">
                                    <SelectValue placeholder="All agents" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All agents</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="w-px h-4 bg-slate-200 shrink-0" />

                            {/* Status Filter */}
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="h-9 w-[120px] text-xs border-none bg-transparent focus:ring-0">
                                    <SelectValue placeholder="All status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All status</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="no_show">No Show</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(filterAgent !== '__all__' || filterProject !== '__all__' || filterStatus !== '__all__' || search) && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-medium px-3 rounded-xl"
                                onClick={() => { 
                                    setFilterAgent('__all__'); 
                                    setFilterProject('__all__'); 
                                    setFilterStatus('__all__');
                                    setSearch('');
                                }}
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    {
                        label: 'Scheduled',
                        value: scheduledCount,
                        icon: Clock,
                        color: 'text-blue-600',
                        bg: 'bg-blue-50',
                        border: 'border-blue-100',
                        bar: 'bg-blue-500',
                    },
                    {
                        label: 'Completed',
                        value: completedCount,
                        icon: CheckCircle2,
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-50',
                        border: 'border-emerald-100',
                        bar: 'bg-emerald-500',
                    },
                    {
                        label: 'No Show',
                        value: noShowCount,
                        icon: XCircle,
                        color: 'text-red-500',
                        bg: 'bg-red-50',
                        border: 'border-red-100',
                        bar: 'bg-red-500',
                    },
                    {
                        label: 'Cancelled',
                        value: cancelledCount,
                        icon: XCircle,
                        color: 'text-slate-500',
                        bg: 'bg-slate-50',
                        border: 'border-slate-200',
                        bar: 'bg-slate-400',
                    },
                    {
                        label: 'Conversion',
                        value: `${conversionRate}%`,
                        icon: TrendingUp,
                        color: 'text-indigo-600',
                        bg: 'bg-indigo-50',
                        border: 'border-indigo-100',
                        bar: 'bg-indigo-500',
                        sub: `${interestedCount} interested`,
                    },
                ].map(({ label, value, icon: Icon, color, bg, border, bar, sub }) => (
                    <div key={label} className={`relative flex flex-col gap-3 rounded-2xl border ${border} bg-white p-5 shadow-sm transition-all hover:shadow-md overflow-hidden group`}>
                        <div className={`absolute top-0 left-0 right-0 h-1 ${bar} opacity-70 group-hover:opacity-100 transition-opacity`} />
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-slate-900 leading-none tabular-nums tracking-tight">{isLoading ? '—' : value}</p>
                            {sub && <p className="text-[11px] font-medium text-slate-500 mt-2">{sub}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search leads or notes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 pl-8 text-xs bg-background"
                        />
                    </div>
                    {viewMode !== 'calendar' && (
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-8 w-44 text-xs bg-background border-none shadow-none focus:ring-0">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date_asc">Date (Oldest First)</SelectItem>
                                    <SelectItem value="date_desc">Date (Newest First)</SelectItem>
                                    <SelectItem value="name_asc">Lead Name (A-Z)</SelectItem>
                                    <SelectItem value="name_desc">Lead Name (Z-A)</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Status legend */}
                    <div className="hidden md:flex items-center gap-4 text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                        {[
                            { color: 'bg-blue-400',    label: 'Scheduled' },
                            { color: 'bg-emerald-400', label: 'Completed' },
                            { color: 'bg-red-400',     label: 'No Show' },
                            { color: 'bg-zinc-400',    label: 'Cancelled' },
                        ].map(({ color, label }) => (
                            <span key={label} className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center bg-background p-1 rounded-lg border shadow-sm">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('calendar')}
                            className={`h-7 px-3 text-xs gap-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            Calendar
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className={`h-7 px-3 text-xs gap-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <List className="w-3.5 h-3.5" />
                            List
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0">
                {viewMode === 'calendar' ? (
                    <div className="h-full bg-card rounded-xl border border-border/60 p-4" style={{ minHeight: '600px' }}>
                        <SiteVisitCalendar
                            visits={processedVisits}
                            onDateRangeChange={handleDateRangeChange}
                        />
                    </div>
                ) : (
                    <div className="h-full bg-card rounded-xl border border-border/60 overflow-y-auto">
                        <SiteVisitsTable 
                            visits={processedVisits} 
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
