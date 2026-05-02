'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Handshake, Building, ExternalLink, Star, IndianRupee,
    BedDouble, Layers, Maximize2, CheckCheck, Plus,
} from 'lucide-react'
import { usePermission } from '@/contexts/PermissionContext'
import AddDealDialog, { DEAL_STATUSES } from '@/components/crm/AddDealDialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatRelativeTime } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── Status meta ──────────────────────────────────────────────────────────────
const STATUS_META = {
    interested:  { color: 'bg-violet-50 text-violet-700 border-violet-200',   dot: 'bg-violet-400',  accent: 'border-l-violet-400' },
    negotiation: { color: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-400',    accent: 'border-l-blue-400' },
    reserved:    { color: 'bg-orange-50 text-orange-700 border-orange-200',   dot: 'bg-orange-400',  accent: 'border-l-orange-400' },
    won:         { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', accent: 'border-l-emerald-400' },
    lost:        { color: 'bg-gray-100 text-gray-500 border-gray-200',        dot: 'bg-gray-400',    accent: 'border-l-gray-300' },
}

function StatusPill({ status }) {
    const meta = STATUS_META[status] || STATUS_META.interested
    const label = DEAL_STATUSES.find(s => s.value === status)?.label || status
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold', meta.color)}>
            {status === 'reserved' && <Star className="w-2.5 h-2.5 fill-current" />}
            {status === 'won'      && <CheckCheck className="w-2.5 h-2.5" />}
            {status !== 'reserved' && status !== 'won' && <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />}
            {label}
        </span>
    )
}

function AvatarChip({ profile }) {
    if (!profile) return null
    const initials = (profile.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const parts = (profile.full_name || '').trim().split(' ')
    const displayName = parts.length > 1 ? `${parts[parts.length - 1]} ${parts[0]}` : parts[0]
    return (
        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 border border-gray-200 rounded-full pl-0.5 pr-2 py-0.5">
            {profile.avatar_url
                ? <img src={profile.avatar_url} className="w-3.5 h-3.5 rounded-full object-cover" alt={profile.full_name} />
                : <span className="w-3.5 h-3.5 rounded-full bg-gray-300 inline-flex items-center justify-center text-[7px] font-bold text-gray-600 shrink-0">{initials}</span>
            }
            <span className="font-medium leading-none">{displayName}</span>
        </span>
    )
}
// ── Mini deal row for the overview card ──────────────────────────────────────
function MiniDealRow({ deal }) {
    const unit = deal.unit
    const project = deal.project || unit?.project
    const meta = STATUS_META[deal.status] || STATUS_META.interested
    const isLost = deal.status === 'lost'

    return (
        <div className={cn(
            'group relative rounded-lg border border-gray-100 bg-white p-3 transition-all hover:shadow-sm border-l-[3px]',
            meta.accent,
            isLost && 'opacity-50',
        )}>
            <div className="flex items-start justify-between gap-2">
                {/* Left: unit/project info */}
                <div className="min-w-0 flex-1">
                    {unit ? (
                        <>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-[13px] text-gray-900">Unit {unit.unit_number}</span>
                                {unit.tower?.name && (
                                    <span className="text-[10px] text-gray-400">· {unit.tower.name}</span>
                                )}
                            </div>
                            {project?.name && (
                                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{project.name}</p>
                            )}
                        </>
                    ) : (
                        <p className="font-semibold text-[13px] text-gray-900 truncate">
                            {project?.name || deal.name || 'General Interest'}
                        </p>
                    )}
                </div>

                {/* Right: status pill */}
                <StatusPill status={deal.status} />
            </div>

            {/* Unit specs row */}
            {unit && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {unit.bedrooms && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                            <BedDouble className="w-3 h-3 text-violet-400" />{unit.bedrooms} BHK
                        </span>
                    )}
                    {unit.floor_number != null && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Layers className="w-3 h-3 text-blue-400" />Floor {unit.floor_number === 0 ? 'G' : unit.floor_number}
                        </span>
                    )}
                    {unit.carpet_area && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Maximize2 className="w-3 h-3 text-emerald-400" />{unit.carpet_area} sqft
                        </span>
                    )}
                    {deal.amount ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-800">
                            {formatCurrency(deal.amount)}
                        </span>
                    ) : (unit.total_price || unit.base_price) ? (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            {formatCurrency(unit.total_price || unit.base_price)}
                        </span>
                    ) : null}
                </div>
            )}

            {/* Amount only (no unit) */}
            {!unit && deal.amount && (
                <div className="mt-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-800">
                        {formatCurrency(deal.amount)}
                    </span>
                </div>
            )}

            {/* Won badge */}
            {deal.status === 'won' && deal.won_at && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                    <CheckCheck className="w-3 h-3" />Won {formatRelativeTime(deal.won_at)}
                </div>
            )}

            {/* Footer: added/updated by */}
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-50">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {deal.createdByProfile && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                            <AvatarChip profile={deal.createdByProfile} />
                            {deal.created_at && (
                                <span className="text-gray-400">{formatRelativeTime(deal.created_at)}</span>
                            )}
                        </span>
                    )}
                    {deal.updatedByProfile && deal.updatedByProfile.id !== deal.createdByProfile?.id && (
                        <>
                            <span className="text-gray-300">·</span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                <AvatarChip profile={deal.updatedByProfile} />
                            </span>
                        </>
                    )}
                    {!deal.createdByProfile && deal.created_at && (
                        <span className="text-[10px] text-gray-400">{formatRelativeTime(deal.created_at)}</span>
                    )}
                </div>
                {unit && (
                    <Link href={`/dashboard/inventory?unit=${unit.id}`} target="_blank">
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 gap-1 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <ExternalLink className="w-2.5 h-2.5" />View
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    )
}

export default function DealsOverviewCard({ leadId, onViewAllDeals }) {
    const queryClient = useQueryClient()
    const [isAddDealOpen, setIsAddDealOpen] = useState(false)
    const canViewDeals = usePermission('view_deals')

    const { data, isLoading } = useQuery({
        queryKey: ['lead-deals', leadId],
        queryFn: async () => {
            const res = await fetch(`/api/leads/${leadId}/deals`)
            if (!res.ok) return { deals: [] }
            return res.json()
        },
        enabled: !!leadId && canViewDeals,
        staleTime: 30_000,
    })

    const deals = data?.deals || []
    const activeDeals = deals.filter(d => d.status !== 'lost')
    const lostDeals = deals.filter(d => d.status === 'lost')
    const totalAmount = activeDeals.reduce((sum, d) => sum + (d.amount || 0), 0)

    // Status summary counts
    const statusCounts = {}
    activeDeals.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1
    })

    if (!canViewDeals) return null

    if (isLoading) {
        return (
            <Card className="h-full border-0 shadow-sm ring-1 ring-gray-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Handshake className="w-4 h-4 text-amber-600" />
                        </div>
                        <CardTitle className="text-sm font-bold text-gray-900">Deals</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card className="h-full border-0 shadow-sm ring-1 ring-gray-200 flex flex-col">
            <CardHeader className="pb-4 shrink-0 border-b border-gray-100 mb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                            <Handshake className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-900">Deals</CardTitle>
                {/* Status summary bar */}
                {activeDeals.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(statusCounts).map(([status, count]) => {
                            const meta = STATUS_META[status]
                            if (!meta) return null
                            return (
                                <span key={status} className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-semibold',
                                    meta.color,
                                )}>
                                    {count} {DEAL_STATUSES.find(s => s.value === status)?.label || status}
                                </span>
                            )
                        })}
                        {totalAmount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[9px] font-bold text-orange-700">
                                {formatCurrency(totalAmount)}
                            </span>
                        )}
                    </div>
                )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-full"
                            onClick={() => setIsAddDealOpen(true)}
                            title="Add Deal"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>


            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
                {deals.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-8">
                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-3">
                            <Handshake className="w-6 h-6 text-amber-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No deals yet</p>
                        <p className="text-xs text-gray-500 mt-1 mb-3">Link a unit to start tracking interest</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Show up to 3 deals: active first, then lost to fill */}
                        {[...activeDeals, ...lostDeals].slice(0, 3).map(deal => (
                            <MiniDealRow key={deal.id} deal={deal} />
                        ))}

                        {/* CTA to see all */}
                        {deals.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onViewAllDeals}
                                className="w-full mt-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-xs font-semibold py-2 h-auto"
                            >
                                {deals.length > 3 ? `View all ${deals.length} deals` : 'View all deals'}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
        <AddDealDialog
            leadId={leadId}
            isOpen={isAddDealOpen}
            onClose={() => setIsAddDealOpen(false)}
            onSuccess={() => queryClient.invalidateQueries(['lead-deals', leadId])}
        />
    </>
    )
}
