'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Building, Search, Filter, Home, TrendingUp } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { useInventoryUnits } from '@/hooks/useInventory'
import { useQueryClient } from '@tanstack/react-query'
import { getStatusConfig } from '@/lib/inventory'
import { cn } from '@/lib/utils'
import { UnitCard } from '@/components/inventory/UnitCard'
import { usePermission } from '@/contexts/PermissionContext'

export default function ProjectInventoryTab({ projectId, project, onMetricsUpdate }) {
    const queryClient = useQueryClient()
    const canManage = usePermission('manage_inventory')
    const canEdit = usePermission('edit_inventory')
    
    const { 
        data: units = [], 
        isLoading: loading,
        refetch: fetchUnits 
    } = useInventoryUnits(projectId)

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const handleActionComplete = () => {
        queryClient.invalidateQueries({ queryKey: ['inventory-units', projectId] })
        queryClient.invalidateQueries({ queryKey: ['inventory-project', projectId] })
        queryClient.invalidateQueries({ queryKey: ['inventory-projects'] })
        if (onMetricsUpdate) {
            // Refetch project summary? 
        }
    }

    const filteredUnits = useMemo(() => {
        return units.filter(p => {
            const matchesSearch = !search || 
                (p.unit_number?.toLowerCase().includes(search.toLowerCase())) ||
                (p.title?.toLowerCase().includes(search.toLowerCase()))
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [units, search, statusFilter])

    const statusCounts = useMemo(() => ({
        all: units.length,
        available: units.filter(p => p.status === 'available').length,
        reserved: units.filter(p => p.status === 'reserved').length,
        sold: units.filter(p => p.status === 'sold').length
    }), [units])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-50/50 rounded-2xl border border-slate-200">
                <LoadingSpinner />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Minimal Dashboard Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200/50 shadow-sm">
                        <Building className="w-5 h-5 text-slate-900" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-slate-900 leading-none">Project Inventory</h3>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                             {units.length} total units registered
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                    {Object.entries(statusCounts).map(([status, count]) => {
                        if (status === 'all' || count === 0) return null
                        const config = getStatusConfig(status)
                        return (
                            <div key={status} className={cn("flex flex-col items-end px-4 py-2 rounded-xl border border-slate-100 bg-slate-50/50 grow md:grow-0 min-w-[90px]")}>
                                <span className={cn("text-[9px] font-bold uppercase tracking-widest leading-none mb-1.5 opacity-50", config.text)}>{status}</span>
                                <span className={cn("text-lg font-bold tabular-nums leading-none tracking-tight", config.text)}>{count}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Filters Bar - Refined */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-10 transition-all hover:border-slate-300">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by unit number or title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 border-slate-100 rounded-xl text-sm font-medium focus:bg-white focus:ring-0 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                        <SelectTrigger className="w-full md:w-[220px] h-11 bg-slate-50 border-slate-100 rounded-xl text-xs font-bold text-slate-600 uppercase tracking-wider pl-3">
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-blue-500" />
                                <SelectValue placeholder="STATUS FILTER" />
                                {statusFilter !== 'all' && (
                                    <Badge variant="secondary" className="h-4 px-1 text-[8px] bg-blue-100 text-blue-600 ml-1">1</Badge>
                                )}
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-2xl p-1">
                            <SelectItem value="all" className="text-xs font-bold uppercase tracking-wider py-2.5">ALL UNITS ({statusCounts.all})</SelectItem>
                            <SelectItem value="available" className="text-xs font-bold uppercase tracking-wider py-2.5">AVAILABLE ({statusCounts.available})</SelectItem>
                            <SelectItem value="reserved" className="text-xs font-bold uppercase tracking-wider py-2.5">RESERVED ({statusCounts.reserved})</SelectItem>
                            <SelectItem value="sold" className="text-xs font-bold uppercase tracking-wider py-2.5 text-rose-600">SOLD ({statusCounts.sold})</SelectItem>
                        </SelectContent>
                    </Select>
                    { (search || statusFilter !== 'all') && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-11 px-4 text-slate-400 hover:text-slate-900 rounded-xl text-xs font-bold uppercase tracking-widest"
                            onClick={() => { setSearch(''); setStatusFilter('all'); }}
                        >
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Dynamic Content */}
            {
                filteredUnits.length === 0 ? (
                    <div className="text-center py-28 bg-white border border-dashed rounded-3xl border-slate-200 shadow-sm transition-all hover:bg-slate-50/50 group">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <Home className="w-10 h-10 text-slate-200 group-hover:text-blue-200 transition-colors" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                             {search || statusFilter !== 'all' ? 'No Matching Units' : 'Inventory Empty'}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 max-w-sm mx-auto uppercase tracking-widest leading-relaxed opacity-60">
                            {search || statusFilter !== 'all'
                                ? 'Adjust your search parameters or check the status filter'
                                : 'Generate units from the structural grid to see them here'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-5">
                        {filteredUnits.map(unit => (
                            <UnitCard 
                                key={unit.id} 
                                unit={unit}
                                onActionComplete={handleActionComplete}
                                canManage={canManage}
                                canEdit={canEdit}
                            />
                        ))}
                    </div>
                )
            }
        </div >
    )
}
