'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building, Plus, X, Home, Layers, IndianRupee, Maximize2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import AmenitiesDisplay from '@/components/amenities/AmenitiesDisplay'

import ComingUpNextCard from './ComingUpNextCard'
import BestTimeToContactCard from './BestTimeToContactCard'
import SentimentAnalysisCard from './SentimentAnalysisCard'
import ClientPreferencesCard from './ClientPreferencesCard'
import AiInsightsCard from './AiInsightsCard'

const STATUS_STYLES = {
    available:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    booked:     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
    sold:       { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
    reserved:   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
}

function getStatus(status) {
    return STATUS_STYLES[status?.toLowerCase()] || STATUS_STYLES.available
}

export default function LeadProfileOverview({
    lead,
    organization,
    onUpdate,
    onLinkUnit,
    onUnlinkUnit
}) {
    const leadId = lead.id
    const unit = lead.unit

    const carpetArea = unit?.carpet_area || unit?.config?.carpet_area
    const bedrooms   = unit?.bedrooms    || unit?.config?.bedrooms
    const price      = unit?.total_price || unit?.base_price || unit?.price
    const statusStyle = getStatus(unit?.status)

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-12 gap-6">
                {/* Units Card */}
                <div className="col-span-12 md:col-span-4">
                    <Card className="h-full border-0 shadow-sm ring-1 ring-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                                    <Building className="w-4 h-4" />
                                </div>
                                <CardTitle className="text-sm font-semibold text-gray-900">Linked Unit</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-medium">
                                    {unit ? 1 : 0}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600 rounded-full"
                                    onClick={onLinkUnit}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {unit ? (
                                <div className="group relative rounded-xl border border-slate-200 bg-slate-50/50 hover:border-blue-200 hover:bg-blue-50/30 transition-all p-3 space-y-3">
                                    {/* Unlink */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                            onClick={(e) => { e.stopPropagation(); onUnlinkUnit() }}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>

                                    {/* Header row: unit number + status */}
                                    <div className="flex items-center justify-between gap-2 pr-6">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="p-1.5 bg-white border border-slate-200 rounded-lg shrink-0">
                                                <Home className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-slate-900 leading-tight truncate">
                                                    Unit {unit.unit_number}
                                                    {unit.title ? ` — ${unit.title}` : ''}
                                                </p>
                                                {unit.project?.name && (
                                                    <p className="text-[11px] text-slate-500 truncate">{unit.project.name}</p>
                                                )}
                                            </div>
                                        </div>
                                        {unit.status && (
                                            <Badge className={`shrink-0 text-[10px] h-5 px-2 border font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${statusStyle.dot}`} />
                                                {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {bedrooms && (
                                            <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-100 px-2.5 py-2">
                                                <Layers className="w-3 h-3 text-violet-400 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] text-slate-400 uppercase font-semibold leading-none">Config</p>
                                                    <p className="text-xs font-bold text-slate-800 mt-0.5">{bedrooms}BHK</p>
                                                </div>
                                            </div>
                                        )}
                                        {unit.floor_number != null && (
                                            <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-100 px-2.5 py-2">
                                                <Building className="w-3 h-3 text-blue-400 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] text-slate-400 uppercase font-semibold leading-none">Floor</p>
                                                    <p className="text-xs font-bold text-slate-800 mt-0.5">{unit.floor_number}</p>
                                                </div>
                                            </div>
                                        )}
                                        {carpetArea && (
                                            <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-100 px-2.5 py-2">
                                                <Maximize2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] text-slate-400 uppercase font-semibold leading-none">Area</p>
                                                    <p className="text-xs font-bold text-slate-800 mt-0.5">{carpetArea} sqft</p>
                                                </div>
                                            </div>
                                        )}
                                        {price && (
                                            <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-100 px-2.5 py-2">
                                                <IndianRupee className="w-3 h-3 text-orange-400 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] text-slate-400 uppercase font-semibold leading-none">Price</p>
                                                    <p className="text-xs font-bold text-slate-800 mt-0.5">{formatCurrency(price)}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tower info if present */}
                                    {unit.tower?.name && (
                                        <p className="text-[10px] text-slate-400 pl-0.5">Tower: {unit.tower.name}</p>
                                    )}

                                    {/* Unit features from config */}
                                    {unit.config?.amenities?.length > 0 && (
                                        <AmenitiesDisplay
                                            amenityIds={unit.config.amenities}
                                            context="unit"
                                            variant="tags"
                                            maxVisible={4}
                                            title="Unit Features"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="py-12 text-center flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-gray-50/50">
                                    <Building className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-sm">No unit linked</p>
                                    <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-primary" onClick={onLinkUnit}>Link Unit</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Client Preferences - Spans 8 cols */}
                <div className="col-span-12 md:col-span-8">
                    <ClientPreferencesCard
                        lead={lead}
                        leadId={leadId}
                        onUpdate={onUpdate}
                        currency={organization?.currency || 'USD'}
                    />
                </div>
            </div>

            {/* Secondary Row */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-6">
                    <ComingUpNextCard leadId={leadId} />
                </div>
                <div className="col-span-12 md:col-span-6">
                    <BestTimeToContactCard
                        lead={lead}
                        leadId={leadId}
                        onUpdate={onUpdate}
                    />
                </div>
            </div>

            {/* Sentiment + AI Insights */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-6">
                    <SentimentAnalysisCard callLogs={lead.call_logs || []} />
                </div>
                <div className="col-span-12 md:col-span-6">
                    <AiInsightsCard lead={lead} />
                </div>
            </div>
        </div>
    )
}
