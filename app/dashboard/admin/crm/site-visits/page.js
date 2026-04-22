'use client'

import { useState, useCallback } from 'react'
import { startOfWeek, endOfWeek } from 'date-fns'
import { MapPin, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAllSiteVisits } from '@/hooks/useSiteVisits'
import { useUsers } from '@/hooks/usePipelines'
import SiteVisitCalendar from '@/components/crm/site-visits/SiteVisitCalendar'

export default function SiteVisitsPage() {
    const [dateRange, setDateRange] = useState({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
        to:   endOfWeek(new Date(),   { weekStartsOn: 1 }).toISOString(),
    })
    const [filterAgent,   setFilterAgent]   = useState('__all__')
    const [filterProject, setFilterProject] = useState('__all__')

    const { data: visits = [], isLoading } = useAllSiteVisits({
        from:      dateRange.from,
        to:        dateRange.to,
        agentId:   filterAgent   !== '__all__' ? filterAgent   : undefined,
        projectId: filterProject !== '__all__' ? filterProject : undefined,
    })

    const { data: users = [] } = useUsers()

    const handleDateRangeChange = useCallback(({ from, to }) => {
        setDateRange({ from, to })
    }, [])

    const scheduledCount = visits.filter(v => v.status === 'scheduled').length
    const completedCount = visits.filter(v => v.status === 'completed').length

    return (
        <div className="flex flex-col h-full gap-4 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Site Visits
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {isLoading ? 'Loading...' : `${scheduledCount} scheduled · ${completedCount} completed`}
                    </p>
                </div>

                {/* Filters */}
                {users.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Select value={filterAgent} onValueChange={setFilterAgent}>
                            <SelectTrigger className="h-8 w-36 text-xs">
                                <SelectValue placeholder="All agents" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All agents</SelectItem>
                                {users.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {filterAgent !== '__all__' && (
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
                                onClick={() => setFilterAgent('__all__')}>
                                Clear
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Status legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {[
                    { color: 'bg-blue-400',    label: 'Scheduled' },
                    { color: 'bg-emerald-400', label: 'Completed' },
                    { color: 'bg-red-400',     label: 'No Show' },
                    { color: 'bg-zinc-400',    label: 'Cancelled' },
                ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        {label}
                    </span>
                ))}
            </div>

            {/* Calendar */}
            <div className="flex-1 min-h-0 bg-card rounded-xl border border-border/60 p-4" style={{ minHeight: '500px' }}>
                <SiteVisitCalendar
                    visits={visits}
                    onDateRangeChange={handleDateRangeChange}
                />
            </div>
        </div>
    )
}
