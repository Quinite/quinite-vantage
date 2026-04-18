'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Edit, RefreshCcw, Layers, Sparkles, Home, Maximize2, IndianRupee
} from 'lucide-react'
import UnitDrawer from './UnitDrawer'
import StatusChangeModal from './StatusChangeModal'
import { formatINR, getStatusConfig } from '@/lib/inventory'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function UnitCard({ unit: initialUnit, onActionComplete, canManage = false, canEdit = false }) {
    const [unit, setUnit] = useState(initialUnit)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isStatusOpen, setIsStatusOpen] = useState(false)

    const statusObj = getStatusConfig(unit.status || 'available')
    
    // Schema field mapping
    const carpetArea = unit.carpet_area || unit.config?.carpet_area || 0
    const bedrooms = unit.bedrooms || unit.config?.bedrooms || 0
    const configName = unit.config?.config_name || unit.config?.property_type || 'Standard'
    const towerName = unit.tower?.name || 'Main Tower'
    const floorNum = unit.floor_number ?? '0'
    const facing = unit.facing || 'East'
    const propertyType = (unit.config?.property_type || unit.type || '').toLowerCase();
    const isResidential = propertyType.includes('apartment') || propertyType.includes('villa') || propertyType.includes('residential') || propertyType.includes('penthouse');

    return (
        <TooltipProvider>
            <Card className={cn(
                "rounded-xl border transition-all duration-300 overflow-hidden group flex flex-col h-full hover:shadow-lg",
                statusObj.bg,
                statusObj.border || "border-slate-200",
                "hover:border-slate-300"
            )}>
                {/* Header Section */}
                <div className="p-4 pb-0">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                                <span className={cn(
                                    "text-[15px] font-bold tracking-tight leading-none group-hover:text-blue-600 transition-colors",
                                    statusObj.text
                                )}>
                                    {unit.unit_number}
                                </span>
                                {unit.is_corner && (
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
                                )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] leading-none">
                                {configName}
                            </span>
                        </div>
                        <Badge 
                            variant="secondary" 
                            className={cn(
                                "border-0 font-bold text-[9px] uppercase h-6 px-3 rounded-full shrink-0 shadow-sm bg-white/80 backdrop-blur-sm",
                                statusObj.text
                            )}
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full mr-2", statusObj.dot)} />
                            {unit.status?.replace('_', ' ')}
                        </Badge>
                    </div>

                    {/* Location Card */}
                    <div className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl border mb-3 group-hover:bg-white transition-colors shadow-sm",
                        statusObj.activeBg || "bg-white/60",
                        statusObj.border || "border-slate-100/50"
                    )}>
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm shrink-0">
                            <Layers className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold text-slate-900 truncate leading-none mb-1">
                                {towerName}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                                Floor {floorNum === 0 ? 'G' : floorNum} • {facing}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Data Grid Section */}
                <CardContent className="p-4 pt-1 flex-1 flex flex-col gap-2">
                    { !isResidential ? (
                        /* NON-RESIDENTIAL: AREA THEN VALUE IN ONE ROW (2 COLUMNS) */
                        <div className="grid grid-cols-2 gap-2">
                             <Box icon={<Maximize2 className="w-3 h-3"/>} color="text-emerald-500" label="Area" value={`${carpetArea} SQFT`} statusObj={statusObj} />
                             <Box icon={<IndianRupee className="w-3 h-3"/>} color="text-blue-500" label="Value" value={formatINR(unit.total_price || unit.base_price || 0).replace('.00', '').replace(' ', '')} statusObj={statusObj} />
                        </div>
                    ) : (
                        /* RESIDENTIAL: AREA AND PLAN IN ROW 1, VALUE IN ROW 2 */
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <Box icon={<Maximize2 className="w-3 h-3"/>} color="text-emerald-500" label="Area" value={`${carpetArea} SQFT`} statusObj={statusObj} />
                                <Box icon={<Home className="w-3 h-3"/>} color="text-amber-500" label="Plan" value={`${bedrooms}BHK`} statusObj={statusObj} />
                            </div>
                            <Box icon={<IndianRupee className="w-3 h-3"/>} color="text-blue-500" label="Valuation" value={formatINR(unit.total_price || unit.base_price || 0).replace('.00', '').replace(' ', '')} statusObj={statusObj} full />
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex gap-2 pt-3">
                        <Button
                            variant="secondary"
                            onClick={() => setIsStatusOpen(true)}
                            disabled={!canManage && !canEdit}
                            className="flex-1 h-8 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-[0.1em] rounded-xl shadow-md transition-all active:scale-95"
                        >
                            <RefreshCcw className="w-3 h-3 mr-2 shadow-sm" />
                            Status
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditOpen(true)}
                            disabled={!canEdit && !canManage}
                            className="w-8 h-8 p-0 rounded-xl border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 shadow-sm transition-all active:scale-95 shrink-0"
                        >
                            <Edit className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </CardContent>

                <UnitDrawer
                    unit={unit}
                    open={isEditOpen}
                    mode="edit"
                    onClose={() => setIsEditOpen(false)}
                    onSave={async (payload) => {
                        const url = `/api/inventory/units/${unit.id}`
                        const res = await fetch(url, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        })
                        if (!res.ok) throw new Error('Failed to update')
                        const data = await res.json()
                        setUnit(data.unit)
                        if (onActionComplete) onActionComplete()
                        return true
                    }}
                />

                <StatusChangeModal
                    property={unit}
                    isOpen={isStatusOpen}
                    onClose={() => setIsStatusOpen(false)}
                    onStatusChanged={(updatedUnit) => {
                        setUnit(updatedUnit)
                        if (onActionComplete) onActionComplete()
                    }}
                />
            </Card>
        </TooltipProvider>
    )
}

function Box({ icon, label, value, color, full, statusObj }) {
    // Map activeBg to a slightly lighter version if needed, 
    // but for now we'll use activeBg or falling back to bg-white/40
    return (
       <div className={cn(
           "p-2 rounded-xl border transition-colors group-hover:bg-white flex items-center gap-2 overflow-hidden shadow-sm",
           statusObj.activeBg || "bg-white/60",
           statusObj.border || "border-slate-100/50",
           full ? "w-full" : ""
       )}>
           <div className={cn("w-5 h-5 rounded-md bg-white flex items-center justify-center border border-slate-100 shadow-sm shrink-0", color)}>
               {icon}
           </div>
           <div className="flex flex-col min-w-0">
               <span className="text-[7px] font-bold text-slate-300 uppercase leading-none mb-0.5 tracking-wider">{label}</span>
               <span className="text-[10px] font-bold text-slate-900 tabular-nums truncate leading-none">
                   {value}
               </span>
           </div>
       </div>
    )
}
