'use client'

import { useQuery } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Home, Building2, Compass, BedDouble, Bath, Wind,
    Maximize2, TreePine, Star, ExternalLink,
    CheckCheck, Calendar, AlertCircle,
} from 'lucide-react'
import { formatINR, getStatusConfig } from '@/lib/inventory'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── fetch hook ───────────────────────────────────────────────────────────────
function useUnitDetail(unitId, enabled = true) {
    return useQuery({
        queryKey: ['unit-detail', unitId],
        queryFn: async () => {
            const res = await fetch(`/api/inventory/units/${unitId}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to fetch unit')
            return data.unit
        },
        enabled: !!unitId && enabled,
        staleTime: 60_000,
    })
}

// ── stat chip ────────────────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, color = 'text-slate-500' }) {
    if (!value && value !== 0) return null
    return (
        <div className="flex items-center gap-2 text-[12px]">
            <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
            <span className="text-slate-400">{label}</span>
            <span className="font-semibold text-slate-700 ml-auto">{value}</span>
        </div>
    )
}

// ── price row ────────────────────────────────────────────────────────────────
function PriceRow({ label, value, highlight }) {
    if (!value) return null
    return (
        <div className={cn('flex justify-between items-center text-[12px] py-1', highlight && 'border-t border-slate-100 mt-1 pt-2')}>
            <span className={cn(highlight ? 'font-bold text-slate-800' : 'text-slate-400')}>{label}</span>
            <span className={cn('font-bold', highlight ? 'text-blue-600 text-[14px]' : 'text-slate-600')}>
                {formatINR(value)}
            </span>
        </div>
    )
}

// ── main sheet ───────────────────────────────────────────────────────────────
export default function UnitDetailSheet({ unitId, unit: unitProp, open, onClose }) {
    // Always fetch full unit data — prop may be a partial object from deal queries
    const { data: fetchedUnit, isLoading } = useUnitDetail(unitId, open)
    const unit = fetchedUnit || unitProp

    const statusCfg = unit ? getStatusConfig(unit.status) : null
    const isLand = unit?.config?.category === 'land'
    const hasPriceBreakdown = unit?.floor_rise_price || unit?.plc_price

    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
            <SheetContent className="sm:max-w-md flex flex-col p-0 gap-0" side="right">

                {/* ── Header ── */}
                <SheetHeader className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-start gap-3">
                        <div className={cn(
                            'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border',
                            isLand ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        )}>
                            {isLand ? <TreePine className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <SheetTitle className="text-base font-bold text-slate-900 leading-tight">
                                    {unit ? `Unit ${unit.unit_number}` : <Skeleton className="h-5 w-24" />}
                                </SheetTitle>
                                {statusCfg && (
                                    <Badge className={cn('text-[9px] font-bold uppercase tracking-widest border shadow-none px-2 py-0.5', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                                        {statusCfg.label}
                                    </Badge>
                                )}
                            </div>
                            {unit ? (
                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 flex-wrap">
                                    {unit.project?.name && <span>{unit.project.name}</span>}
                                    {unit.tower?.name && <><span>·</span><span>{unit.tower.name}</span></>}
                                    {unit.floor_number != null && (
                                        <><span>·</span><span>Floor {unit.floor_number === 0 ? 'G' : unit.floor_number}</span></>
                                    )}
                                </div>
                            ) : (
                                <Skeleton className="h-3 w-40 mt-1.5" />
                            )}
                        </div>
                    </div>
                </SheetHeader>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading && !unit ? (
                        <div className="p-5 space-y-4">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                        </div>
                    ) : unit ? (
                        <div className="p-5 space-y-5">

                            {/* Pricing */}
                            <section className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3 space-y-0.5">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Pricing</p>
                                <PriceRow label="Base Price" value={unit.base_price} />
                                {hasPriceBreakdown && (
                                    <>
                                        <PriceRow label="Floor Rise" value={unit.floor_rise_price} />
                                        <PriceRow label="PLC" value={unit.plc_price} />
                                    </>
                                )}
                                <PriceRow label="Total Price" value={unit.total_price || unit.base_price} highlight />
                            </section>

                            {/* Area */}
                            <section className="bg-white border border-slate-100 rounded-2xl px-4 py-3 space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Area</p>
                                {isLand ? (
                                    <Stat icon={Maximize2} label="Plot Area" value={unit.plot_area ? `${unit.plot_area} sqft` : null} color="text-amber-400" />
                                ) : (
                                    <>
                                        <Stat icon={Maximize2} label="Carpet Area" value={unit.carpet_area ? `${unit.carpet_area} sqft` : null} color="text-emerald-400" />
                                        <Stat icon={Maximize2} label="Built-up Area" value={unit.built_up_area ? `${unit.built_up_area} sqft` : null} color="text-blue-400" />
                                        <Stat icon={Maximize2} label="Super Built-up" value={unit.super_built_up_area ? `${unit.super_built_up_area} sqft` : null} color="text-violet-400" />
                                    </>
                                )}
                            </section>

                            {/* Unit details */}
                            <section className="bg-white border border-slate-100 rounded-2xl px-4 py-3 space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Details</p>
                                <Stat icon={Building2} label="Config" value={unit.config?.config_name || unit.config?.property_type} color="text-slate-400" />
                                <Stat icon={Compass} label="Facing" value={unit.facing} color="text-sky-400" />
                                {!isLand && (
                                    <>
                                        <Stat icon={BedDouble} label="Bedrooms" value={unit.bedrooms} color="text-violet-400" />
                                        <Stat icon={Bath} label="Bathrooms" value={unit.bathrooms} color="text-blue-400" />
                                        <Stat icon={Wind} label="Balconies" value={unit.balconies} color="text-emerald-400" />
                                    </>
                                )}
                                {unit.is_corner && (
                                    <div className="flex items-center gap-2 text-[12px]">
                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                                        <span className="font-semibold text-slate-700">Corner Unit</span>
                                    </div>
                                )}
                                {unit.is_vastu_compliant && (
                                    <div className="flex items-center gap-2 text-[12px]">
                                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span className="font-semibold text-slate-700">Vastu Compliant</span>
                                    </div>
                                )}
                            </section>

                            {/* Construction */}
                            {(unit.construction_status || unit.possession_date) && (
                                <section className="bg-white border border-slate-100 rounded-2xl px-4 py-3 space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Construction</p>
                                    {unit.construction_status && (
                                        <Stat icon={AlertCircle} label="Status" value={unit.construction_status?.replace(/_/g, ' ')} color="text-orange-400" />
                                    )}
                                    {unit.possession_date && (
                                        <Stat icon={Calendar} label="Possession" value={new Date(unit.possession_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} color="text-emerald-400" />
                                    )}
                                </section>
                            )}

                            {/* Amenities */}
                            {Array.isArray(unit.amenities) && unit.amenities.length > 0 && (
                                <section>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Amenities</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {unit.amenities.map((a, i) => (
                                            <span key={i} className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-medium">
                                                {typeof a === 'string' ? a : a.name || a}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* ── Footer ── */}
                {unit && (
                    <div className="px-5 py-4 border-t border-slate-100 shrink-0">
                        <Link href={`/dashboard/inventory?unit=${unit.id}`} target="_blank" className="w-full">
                            <Button variant="outline" className="w-full gap-2 text-sm font-semibold">
                                <ExternalLink className="w-4 h-4" />
                                Open in Inventory
                            </Button>
                        </Link>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
