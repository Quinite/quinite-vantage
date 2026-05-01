'use client'

import React from 'react'
import { 
    Building2, 
    Home, 
    Layers, 
    Compass, 
    Maximize, 
    Bath, 
    CheckCircle2, 
    Clock, 
    Construction,
    CircleDollarSign
} from 'lucide-react'
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card'
import { formatCurrency } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

export default function TaskUnitBadge({ unit, project, compact = false }) {
    if (!unit) return null

    // Format construction status
    const getStatusInfo = (status) => {
        switch (status) {
            case 'under_construction': return { label: 'Under Construction', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Construction }
            case 'ready_to_move': return { label: 'Ready', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 }
            case 'completed': return { label: 'Completed', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: CheckCircle2 }
            default: return { label: status?.replace('_', ' ') || 'Available', color: 'text-slate-600 bg-slate-50 border-slate-100', icon: Clock }
        }
    }

    const sInfo = getStatusInfo(unit.construction_status || unit.status)
    const price = unit.total_price || unit.base_price || 0
    const area = unit.carpet_area || unit.built_up_area || unit.super_built_up_area

    return (
        <HoverCard openDelay={300} closeDelay={100}>
            <HoverCardTrigger asChild>
                <div
                    onClick={e => e.stopPropagation()}
                    className={cn(
                        "inline-flex max-w-fit items-center gap-1 px-1.5 py-px rounded border border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-200 transition-colors cursor-pointer shadow-sm active:scale-95",
                        compact && "px-1"
                    )}
                >
                    <Building2 className="w-2.5 h-2.5 shrink-0 opacity-70" />
                    <span className="text-[10px] font-bold tracking-tight">
                        {compact ? unit.unit_number : `Unit ${unit.unit_number}${unit.tower?.name ? ` (${unit.tower.name})` : ''}`}
                    </span>
                </div>
            </HoverCardTrigger>
            <HoverCardContent 
                className="w-64 p-0 shadow-2xl border-emerald-100 overflow-hidden z-[100] rounded-xl" 
                align="start"
                side="top"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col">
                    {/* Compact Header */}
                    <div className="bg-emerald-50/40 p-3 border-b border-emerald-100/50">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 truncate">Unit {unit.unit_number}</h4>
                                <p className="text-[10px] text-slate-500 font-medium truncate">
                                    {unit.tower?.name ? `${unit.tower.name} Tower` : 'Main Block'}
                                </p>
                            </div>
                            <div className={cn("px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 shadow-sm", sInfo.color)}>
                                <sInfo.icon className="w-2.5 h-2.5" />
                                {sInfo.label}
                            </div>
                        </div>
                    </div>

                    {/* Compact Stats Grid */}
                    <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2.5 bg-white">
                        <StatItem icon={Layers} label="Floor" value={unit.floor_number !== undefined && unit.floor_number !== null ? `${unit.floor_number}${getOrdinal(unit.floor_number)}` : 'N/A'} />
                        <StatItem icon={Maximize} label="Area" value={area ? `${area} sqft` : 'N/A'} />
                        <StatItem icon={Home} label="BHK" value={unit.bedrooms ? `${unit.bedrooms} BHK` : 'N/A'} />
                        <StatItem icon={Bath} label="Baths" value={unit.bathrooms ? `${unit.bathrooms} Baths` : 'N/A'} />
                        <StatItem icon={Compass} label="Facing" value={unit.facing || 'N/A'} />
                        <StatItem icon={CircleDollarSign} label="Price" value={price ? formatCurrency(price) : 'N/A'} isPrice />
                    </div>

                    {/* Footer Project Info */}
                    {project && (
                        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Project</p>
                            <p className="text-[11px] font-bold text-indigo-600 line-clamp-1">{project.name}</p>
                            {project.address && <p className="text-[9px] text-slate-500 line-clamp-1">{project.address}</p>}
                        </div>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    )
}

function StatItem({ icon: Icon, label, value, isPrice }) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <Icon className={cn("w-3.5 h-3.5", isPrice ? "text-emerald-500" : "text-slate-400")} />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter leading-none">{label}</span>
                <span className={cn("text-[10px] font-bold truncate", isPrice ? "text-emerald-700" : "text-slate-700")}>{value}</span>
            </div>
        </div>
    )
}

function getOrdinal(n) {
    if (n === 0) return '';
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
