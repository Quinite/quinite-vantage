'use client'

import { useQueryClient } from '@tanstack/react-query'


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, TrendingUp, Home, CheckCircle2, Clock } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useRouter } from 'next/navigation'

export default function ProjectCard({ project }) {
    const router = useRouter()

    const totalUnits = project.total_units || 0
    const soldUnits = project.sold_units || 0
    const reservedUnits = project.reserved_units || 0
    const availableUnits = project.available_units || (totalUnits - soldUnits - reservedUnits)

    const occupancyRate = totalUnits > 0 ? ((soldUnits + reservedUnits) / totalUnits) * 100 : 0

    const statusConfig = {
        planning: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: '📋 Planning' },
        under_construction: { color: 'bg-amber-100 text-amber-700 border-amber-300', label: '🏗️ Under Construction' },
        ready_to_move: { color: 'bg-green-100 text-green-700 border-green-300', label: '✅ Ready to Move' },
        completed: { color: 'bg-purple-100 text-purple-700 border-purple-300', label: '🎉 Completed' }
    }

    const status = statusConfig[project.project_status] || statusConfig.planning

    const queryClient = useQueryClient()


    const prefetchProjectData = () => {
        if (!project.id) return
        
        // Prefetch project details
        queryClient.prefetchQuery({
            queryKey: ['inventory-project', project.id],
            queryFn: () => fetch(`/api/projects/${project.id}`)
                .then(res => res.ok ? res.json() : { project: null })
                .then(d => d.project || null),
            staleTime: 5 * 60 * 1000
        })

        // Prefetch units for this project
        queryClient.prefetchQuery({
            queryKey: ['inventory-units', project.id],
            queryFn: () => fetch(`/api/inventory/units?project_id=${project.id}`)
                .then(res => res.ok ? res.json() : { units: [] })
                .then(d => d.units || []),
            staleTime: 2 * 60 * 1000
        })
    }

    const handleClick = () => {
        router.push(`/dashboard/admin/inventory/projects/${project.id}`)
    }


    return (
        <Card
            className="border-border shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden bg-white"
            onMouseEnter={prefetchProjectData}
            onClick={handleClick}
        >

            <CardHeader className="pb-3 bg-gradient-to-br from-white to-slate-50 group-hover:from-blue-50 group-hover:to-white transition-colors">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-foreground group-hover:text-blue-600 transition-colors truncate">
                            {project.name}
                        </CardTitle>
                        {project.address && (
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 truncate">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                {project.address}
                            </p>
                        )}
                    </div>
                    <Badge variant="outline" className={`${status.color} border text-[10px] font-semibold px-2.5 py-1 whitespace-nowrap shadow-sm`}>
                        {status.label}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Unit Configurations & Category */}
                <div className="space-y-3">
                    {/* Unit Configurations */}
                    {project.unit_configs && project.unit_configs.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Unit Configurations</p>
                            <div className="flex flex-wrap gap-1.5">
                                {project.unit_configs.map((config, idx) => (
                                    <Badge key={idx} variant="outline" className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase">
                                        {config.config_name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Price Range */}
                    {project.unit_configs && project.unit_configs.length > 0 && (() => {
                        const prices = project.unit_configs.map(ut => ut.base_price).filter(p => p > 0)
                        if (prices.length > 0) {
                            const minPrice = Math.min(...prices)
                            const maxPrice = Math.max(...prices)
                            const formatPrice = (price) => {
                                if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)}Cr`
                                if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`
                                return `₹${price.toLocaleString('en-IN')}`
                            }
                            return (
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Starting From</p>
                                    <p className="text-base font-black text-blue-600 tracking-tight">
                                        {formatPrice(minPrice)}
                                    </p>
                                </div>
                            )
                        }
                        return null
                    })()}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
                        </div>
                        <p className="text-lg font-black text-slate-900 leading-none">{totalUnits}</p>
                    </div>

                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Home className="w-3.5 h-3.5 text-emerald-500" />
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Available</p>
                        </div>
                        <p className="text-lg font-black text-emerald-900 leading-none">{availableUnits}</p>
                    </div>

                    <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Sold</p>
                        </div>
                        <p className="text-lg font-black text-blue-900 leading-none">{soldUnits}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                {totalUnits > 0 && (
                    <div className="pt-2">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sales Progress</span>
                            <span className="text-[10px] font-black text-blue-600">{occupancyRate.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-500" 
                                style={{ width: `${occupancyRate}%` }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
