'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, TrendingUp, Home, Trash2, ChevronDown, CheckCircle2, XCircle, Clock, Building2, ArrowRightLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils/currency'
import AddDealDialog from './AddDealDialog'

const DEAL_STATUSES = [
    { value: 'active',      label: 'Active',        icon: Clock,         color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'negotiation', label: 'Negotiation',   icon: Clock,         color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'won',         label: 'Closed Won ✓',  icon: CheckCircle2,  color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'lost',        label: 'Closed Lost ✗', icon: XCircle,       color: 'bg-red-100 text-red-700 border-red-200' },
]

function getDealStatusConfig(status) {
    const s = (status || '').toLowerCase()
    if (s === 'won' || s === 'closed' || s === 'closed won')
        return { label: 'Won',         color: 'bg-green-100 text-green-700 border-green-200' }
    if (s === 'lost')
        return { label: 'Lost',        color: 'bg-red-100 text-red-700 border-red-200' }
    if (s === 'negotiation')
        return { label: 'Negotiating', color: 'bg-purple-100 text-purple-700 border-purple-200' }
    return   { label: status || 'Active', color: 'bg-blue-100 text-blue-700 border-blue-200' }
}

function getUnitStatusConfig(status) {
    const s = (status || '').toLowerCase()
    if (s === 'sold')      return { label: 'Sold',     color: 'bg-red-100 text-red-600 border-red-200' }
    if (s === 'reserved')  return { label: 'Reserved', color: 'bg-amber-100 text-amber-700 border-amber-200' }
    return                        { label: 'Available', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
}

export default function UnitDealsCard({ deals = [], leadId, onUpdate, currency = 'INR', defaultUnit, defaultProject }) {
    const [isAddDealOpen, setIsAddDealOpen] = useState(false)
    const [updatingDealId, setUpdatingDealId] = useState(null)

    const handleDelete = async (dealId) => {
        if (!confirm('Remove this deal?')) return
        try {
            const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete deal')
            toast.success('Deal removed')
            if (onUpdate) onUpdate()
        } catch {
            toast.error('Failed to remove deal')
        }
    }

    const handleStatusChange = async (dealId, newStatus) => {
        setUpdatingDealId(dealId)
        try {
            const res = await fetch(`/api/deals/${dealId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to update')
            }
            toast.success(`Marked as ${DEAL_STATUSES.find(s => s.value === newStatus)?.label || newStatus}`)
            if (onUpdate) onUpdate()
        } catch (error) {
            toast.error(error.message || 'Failed to update deal')
        } finally {
            setUpdatingDealId(null)
        }
    }

    const totalValue = deals.reduce((sum, d) => sum + (d.amount || 0), 0)

    return (
        <>
            <Card className="h-full border-0 shadow-sm ring-1 ring-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md">
                            <Home className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-900">Linked Units</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Units & deals for this lead</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-medium">
                            {deals.length}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-emerald-50 hover:text-emerald-600 rounded-full"
                            onClick={() => setIsAddDealOpen(true)}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-3 px-4 pb-4">
                    {deals.length > 0 ? (
                        <div className="space-y-3">
                            {/* Total pipeline value */}
                            {totalValue > 0 && (
                                <div className="flex items-center justify-between bg-emerald-50/70 rounded-lg px-3 py-2 border border-emerald-100">
                                    <span className="text-xs text-emerald-700 font-medium">Total Deal Value</span>
                                    <span className="text-sm font-bold text-emerald-900">{formatCurrency(totalValue)}</span>
                                </div>
                            )}

                            {/* Deal rows */}
                            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-0.5">
                                {deals.map((deal, index) => {
                                    const unit = deal.unit
                                    const project = deal.project
                                    const dealStatus = getDealStatusConfig(deal.status)
                                    const unitStatus = unit ? getUnitStatusConfig(unit.status) : null
                                    const isUpdating = updatingDealId === deal.id

                                    // What to show as the title
                                    const unitLabel = unit?.unit_number
                                        || project?.name
                                        || deal.name
                                        || `Deal #${index + 1}`
                                    const projectLabel = unit && project ? project.name : null

                                    // Build detail chips
                                    const chips = []
                                    if (unit) {
                                        if (unit.floor_number != null) chips.push(`Floor ${unit.floor_number}`)
                                        if (unit.bedrooms)             chips.push(`${unit.bedrooms} BHK`)
                                        const area = unit.carpet_area || unit.built_up_area
                                        if (area)                      chips.push(`${area} sq.ft`)
                                        if (unit.facing)               chips.push(`${unit.facing} facing`)
                                    }

                                    const dealAmount = deal.amount
                                        ? formatCurrency(deal.amount)
                                        : (unit?.total_price || unit?.base_price)
                                            ? formatCurrency(unit.total_price || unit.base_price)
                                            : null

                                    return (
                                        <div
                                            key={deal.id || index}
                                            className="group rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all bg-white p-3"
                                        >
                                            {/* Row 1: unit name + deal status */}
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <div className="p-1 bg-emerald-50 rounded-md shrink-0">
                                                        {unit ? (
                                                            <Home className="w-3 h-3 text-emerald-600" />
                                                        ) : (
                                                            <Building2 className="w-3 h-3 text-blue-500" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                                            {unitLabel}
                                                        </p>
                                                        {projectLabel && (
                                                            <p className="text-[10px] text-muted-foreground truncate">{projectLabel}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Deal status dropdown */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            disabled={isUpdating}
                                                            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wide transition-all hover:opacity-80 shrink-0 ${dealStatus.color} ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                                        >
                                                            {isUpdating ? '...' : dealStatus.label}
                                                            <ChevronDown className="w-2.5 h-2.5" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                                            Change Status
                                                        </div>
                                                        <DropdownMenuSeparator />
                                                        {DEAL_STATUSES.map(opt => {
                                                            const Icon = opt.icon
                                                            return (
                                                                <DropdownMenuItem
                                                                    key={opt.value}
                                                                    onClick={() => handleStatusChange(deal.id, opt.value)}
                                                                    className="gap-2 cursor-pointer"
                                                                >
                                                                    <Icon className="w-3.5 h-3.5" />
                                                                    {opt.label}
                                                                </DropdownMenuItem>
                                                            )
                                                        })}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Row 2: unit detail chips */}
                                            {chips.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-7 mb-2">
                                                    {chips.map((chip, i) => (
                                                        <span key={i} className="text-[10px] text-muted-foreground">{chip}</span>
                                                    ))}
                                                    {unitStatus && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${unitStatus.color}`}>
                                                            {unitStatus.label}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Row 3: deal amount + date + delete */}
                                            <div className="flex items-center justify-between pl-7">
                                                {dealAmount ? (
                                                    <span className="text-xs font-bold text-gray-900">{dealAmount}</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">No amount set</span>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    {deal.created_at && (
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(deal.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5 w-5 text-gray-300 hover:text-red-500 hover:bg-red-50"
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(deal.id) }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-8 border-dashed text-muted-foreground hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
                                onClick={() => setIsAddDealOpen(true)}
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Link Another Unit
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                                <Home className="w-5 h-5 text-emerald-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">No units linked</p>
                            <p className="text-xs text-muted-foreground mb-4 max-w-[180px]">Link a unit from inventory to track this lead's interest</p>
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsAddDealOpen(true)}>
                                <Plus className="w-3 h-3 mr-1" />
                                Link Unit
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AddDealDialog
                leadId={leadId}
                isOpen={isAddDealOpen}
                onClose={() => setIsAddDealOpen(false)}
                onSuccess={onUpdate}
                defaultUnit={defaultUnit}
                defaultProject={defaultProject}
            />
        </>
    )
}
