'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import {
    Plus, User, Phone, Trash2, ExternalLink, Mail, MapPin, Tag,
    Star, IndianRupee, AlertCircle, Search, Loader2, CheckCheck, TrendingDown, TrendingUp,
    ChevronDown, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUnitDeals, useUnitDealsInvalidate } from '@/hooks/useUnitDeals'
import { usePermission } from '@/contexts/PermissionContext'
import { DEAL_STATUSES } from '@/components/crm/AddDealDialog'
import { formatRelativeTime, formatDateTime } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'
import { formatINR } from '@/lib/inventory'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── Status meta ──────────────────────────────────────────────────────────────
const STATUS_META = {
    interested:  { color: 'bg-violet-50 text-violet-700 border-violet-200',   dot: 'bg-violet-400',  accent: 'bg-violet-400' },
    negotiation: { color: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-400',    accent: 'bg-blue-400' },
    reserved:    { color: 'bg-orange-50 text-orange-700 border-orange-200',   dot: 'bg-orange-400',  accent: 'bg-orange-400' },
    won:         { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', accent: 'bg-emerald-400' },
    lost:        { color: 'bg-gray-100 text-gray-500 border-gray-200',        dot: 'bg-gray-400',    accent: 'bg-gray-300' },
}

function StatusPill({ status, interactive }) {
    const meta = STATUS_META[status] || STATUS_META.interested
    const label = DEAL_STATUSES.find(s => s.value === status)?.label || status
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all',
            meta.color,
            interactive && 'hover:brightness-95 cursor-pointer shadow-sm active:scale-[0.98]'
        )}>
            {status === 'reserved' && <Star className="w-2.5 h-2.5 fill-current" />}
            {status === 'won'      && <CheckCheck className="w-3 h-3" />}
            {status !== 'reserved' && status !== 'won' && <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />}
            <span>{label}</span>
            {interactive && <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />}
        </span>
    )
}

function AvatarChip({ profile, label }) {
    if (!profile) return null
    const initials = (profile.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const parts = (profile.full_name || '').trim().split(' ')
    const displayName = parts.length > 1 ? `${parts[parts.length - 1]} ${parts[0]}` : parts[0]
    return (
        <span
            className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 border border-gray-200 rounded-full pl-0.5 pr-2 py-0.5"
            title={label ? `${label}: ${profile.full_name}` : profile.full_name}
        >
            {profile.avatar_url
                ? <img src={profile.avatar_url} className="w-3.5 h-3.5 rounded-full object-cover" alt={profile.full_name} />
                : <span className="w-3.5 h-3.5 rounded-full bg-gray-300 inline-flex items-center justify-center text-[7px] font-bold text-gray-600 shrink-0">{initials}</span>
            }
            <span className="font-medium leading-none">{displayName}</span>
        </span>
    )
}

// ── Add lead dialog ──────────────────────────────────────────────────────────
function AddLeadDealDialog({ unitId, unit, projectId, isOpen, onClose, onSuccess }) {
    const [search, setSearch] = useState('')
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedLead, setSelectedLead] = useState(null)
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchLeads = async (q = '', pId = null) => {
        setLoading(true)
        try {
            let url = `/api/leads?limit=20`
            if (q) {
                url += `&search=${encodeURIComponent(q)}`
            } else if (pId) {
                url += `&project_id=${pId}`
            }
            
            const res = await fetch(url)
            const data = await res.json()
            setLeads(data.leads || [])
        } catch {} finally { setLoading(false) }
    }

    // Load project leads when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSearch('')
            setSelectedLead(null)
            const totalPrice = Number(unit?.total_price || unit?.base_price || 0)
            setAmount(totalPrice > 0 ? totalPrice.toString() : '')
            setNotes('')
            fetchLeads('', projectId)
        }
    }, [isOpen, projectId])

    const handleSearch = (val) => {
        setSearch(val)
        if (val.length >= 1) fetchLeads(val)
        else fetchLeads('', projectId) // Revert to project leads if search is cleared
    }

    const handleSave = async () => {
        if (!selectedLead || !amount) return
        setSaving(true)
        try {
            const name = `${selectedLead.name} — Unit ${unit?.unit_number || ''}`
            const res = await fetch('/api/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: selectedLead.id,
                    unit_id: unitId,
                    name,
                    status: 'interested',
                    ...(amount ? { amount: Number(amount) } : {}),
                    ...(notes.trim() ? { notes: notes.trim() } : {}),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            toast.success('Lead linked to unit')
            onSuccess?.()
            onClose()
        } catch (e) {
            toast.error(e.message || 'Failed to add lead')
        } finally {
            setSaving(false)
            setSelectedLead(null)
            setSearch('')
            setLeads([])
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose() }}>
            <DialogContent
                className="sm:max-w-sm"
                onPointerDownOutside={(e) => e.stopPropagation()}
                onInteractOutside={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>Add New Deal</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or phone..."
                            className="pl-9"
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="h-[220px] overflow-y-auto border rounded-xl bg-muted/10 p-2 space-y-1.5">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                {search ? 'No leads found.' : 'Type to search leads...'}
                            </div>
                        ) : leads.map(lead => (
                            <div
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                                className={cn(
                                    'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border',
                                    selectedLead?.id === lead.id
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'border-transparent bg-card hover:bg-accent/50 hover:border-border'
                                )}
                            >
                                {lead.avatar_url ? (
                                    <img src={lead.avatar_url} alt={lead.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {lead.name?.[0]?.toUpperCase() + lead.name?.split(' ')?.[1]?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm truncate">{lead.name}</p>
                                        {lead.stage?.name && (
                                            <Badge 
                                                variant="secondary" 
                                                className="px-1.5 py-0 text-[8px] h-3.5 font-bold uppercase tracking-tight"
                                                style={{ 
                                                    backgroundColor: lead.stage.color ? `${lead.stage.color}15` : '#f1f5f9',
                                                    color: lead.stage.color || '#475569',
                                                    borderColor: lead.stage.color ? `${lead.stage.color}33` : '#e2e8f0',
                                                    borderWidth: '1px'
                                                }}
                                            >
                                                {lead.stage.name}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-0.5">
                                        {lead.phone && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{lead.phone}</span>}
                                        {lead.email && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{lead.email}</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {lead.project?.name && lead.project.id !== projectId && (
                                            <Badge variant="outline" className="px-1.5 py-0 text-[9px] h-4 border-slate-200 text-slate-500 font-medium">
                                                <MapPin className="w-2 h-2 mr-0.5" />{lead.project.name}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            type="number"
                            placeholder="Deal Amount *"
                            className="pl-8 pr-28"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            min={0}
                            required
                        />
                        {amount && Number(amount) > 0 && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-emerald-600 pointer-events-none">
                                {formatINR(Number(amount))}
                            </span>
                        )}
                    </div>
                    <Textarea
                        placeholder="Notes (optional)"
                        className="resize-none text-sm"
                        rows={2}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={!selectedLead || !amount || saving}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : 'Add Deal'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Edit deal dialog ─────────────────────────────────────────────────────────
function EditDealDialog({ deal, unit, isOpen, onClose, onSuccess, targetStatus }) {
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen && deal) {
            setAmount(deal.amount?.toString() || '')
            setNotes(deal.notes || '')
        }
    }, [isOpen, deal])

    const handleSave = async () => {
        if (!amount) {
            toast.error('Deal amount is mandatory')
            return
        }
        setSaving(true)
        try {
            const res = await fetch(`/api/deals/${deal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(amount),
                    notes: notes.trim(),
                    ...(targetStatus ? { status: targetStatus } : {}),
                }),
            })
            if (!res.ok) throw new Error('Failed to update deal')
            toast.success(targetStatus ? 'Status updated' : 'Deal updated')
            onSuccess()
            onClose()
        } catch (e) {
            toast.error(e.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose() }}>
            <DialogContent className="sm:max-w-sm" onPointerDownOutside={(e) => e.stopPropagation()} onInteractOutside={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Pencil className="w-4 h-4" />
                        {targetStatus ? 'Confirm Status Change' : 'Edit Deal'}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {targetStatus && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-blue-700 uppercase">Updating status to:</span>
                            <StatusPill status={targetStatus} />
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                            Deal Amount <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                type="number"
                                className="pl-8 pr-28"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                min={0}
                                placeholder="0"
                            />
                            {amount && Number(amount) > 0 && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-emerald-600">
                                    {formatINR(Number(amount))}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Notes</Label>
                        <Textarea
                            placeholder="Add notes..."
                            className="resize-none text-sm"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={saving || !amount}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {targetStatus ? 'Update Status' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Price comparison helper ──────────────────────────────────────────────────
function PriceComparison({ dealAmount, listedPrice }) {
    if (!dealAmount || !listedPrice) return null
    const diff = dealAmount - listedPrice
    if (Math.abs(diff) < 1) return null // no meaningful difference
    const isDiscount = diff < 0
    const pct = Math.abs(diff / listedPrice * 100).toFixed(1)
    return (
        <div className={cn(
            'flex items-center gap-2 flex-wrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium border',
            isDiscount
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
        )}>
            {isDiscount
                ? <TrendingDown className="w-3 h-3 shrink-0" />
                : <TrendingUp className="w-3 h-3 shrink-0" />
            }
            <span>
                Sold at <span className="font-bold">{formatCurrency(dealAmount)}</span>
                <span className="text-[10px] mx-1.5 opacity-60">·</span>
                Listed <span className="line-through opacity-60">{formatCurrency(listedPrice)}</span>
                <span className="text-[10px] mx-1.5 opacity-60">·</span>
                {isDiscount ? '−' : '+'}{formatCurrency(Math.abs(diff))} ({pct}%)
            </span>
        </div>
    )
}

// ── Deal card ────────────────────────────────────────────────────────────────
function DealCard({ deal, unit, unitId, onRefresh, canManage, canDelete }) {
    const [editOpen, setEditOpen] = useState(false)
    const [targetStatus, setTargetStatus] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const lead = deal.lead
    const createdByProfile = deal.createdByProfile
    const updatedByProfile = deal.updatedByProfile
    const showUpdated = updatedByProfile && updatedByProfile.id !== createdByProfile?.id
    const isReserved = deal.status === 'reserved'
    const isWon = deal.status === 'won'
    const isLost = deal.status === 'lost'
    const accentColor = STATUS_META[deal.status]?.accent || 'bg-gray-300'

    const handleStatusChange = (newStatus) => {
        if (newStatus === 'reserved') {
            if (!confirm('This will move any existing reserved deal for this unit to Negotiation. Continue?')) return
        }
        setTargetStatus(newStatus)
        setEditOpen(true)
    }

    const handleDelete = async () => {
        if (!confirm('Remove this lead from this unit?')) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed')
            toast.success('Deal removed')
            onRefresh()
        } catch {
            toast.error('Failed to remove deal')
        } finally { setDeleting(false) }
    }

    return (
        <div className={cn(
            'rounded-xl border bg-white p-4 space-y-3 transition-all hover:shadow-sm relative overflow-hidden',
            isLost && 'opacity-55',
        )}>
            {/* Left accent bar */}
            <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl', accentColor)} />

            {/* Header: lead info + status */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    {lead?.avatar_url ? (
                        <img 
                            src={lead.avatar_url} 
                            alt={lead.name} 
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {lead?.name?.[0]?.toUpperCase() + lead?.name?.split(' ')?.[1]?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-gray-900 truncate">{lead?.name || 'Unknown Lead'}</p>
                            {lead?.stage?.name && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge 
                                                variant="secondary" 
                                                className="px-1.5 py-0 text-[9px] font-bold uppercase tracking-tight cursor-default"
                                                style={{ 
                                                    backgroundColor: lead.stage.color ? `${lead.stage.color}15` : '#f1f5f9',
                                                    color: lead.stage.color || '#475569',
                                                    borderColor: lead.stage.color ? `${lead.stage.color}33` : '#e2e8f0',
                                                    borderWidth: '1px'
                                                }}
                                            >
                                                {lead.stage.name}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="text-xs">Pipeline Stage</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {lead?.assigned_to_user && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 px-1.5 py-0 rounded-md bg-slate-50 border border-slate-100 text-[9px] font-medium text-slate-500 cursor-default">
                                                <User className="w-2.5 h-2.5" />
                                                {lead.assigned_to_user.full_name.split(' ')[0]}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="text-xs">Assigned To</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            {lead?.phone && (
                                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />{lead.phone}
                                </p>
                            )}
                            {lead?.email && (
                                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" />{lead.email}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {canManage ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="focus:outline-none disabled:opacity-50"
                                >
                                    <StatusPill status={deal.status} interactive />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 p-1">
                                {DEAL_STATUSES.filter(s => s.value !== deal.status).map(s => {
                                    const meta = STATUS_META[s.value]
                                    return (
                                        <DropdownMenuItem
                                            key={s.value}
                                            onClick={() => handleStatusChange(s.value)}
                                            className="flex items-center gap-2 text-sm rounded-md cursor-pointer"
                                        >
                                            <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
                                            {s.label}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <StatusPill status={deal.status} />
                    )}
                    {lead?.id && (
                        <Link href={`/dashboard/admin/crm/leads/${lead.id}`} target="_blank">
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 text-gray-300 hover:text-gray-700">
                                <ExternalLink className="w-3 h-3" />
                            </Button>
                        </Link>
                    )}
                    {canManage && (
                        <Button
                            type="button"
                            variant="ghost" size="icon"
                            className="h-6 w-6 p-0 text-gray-300 hover:text-gray-700"
                            onClick={() => { setTargetStatus(null); setEditOpen(true); }}
                        >
                            <Pencil className="w-3 h-3" />
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            type="button"
                            variant="ghost" size="icon"
                            className="h-6 w-6 p-0 text-gray-300 hover:text-red-500"
                            onClick={handleDelete} disabled={deleting}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>

            <EditDealDialog
                deal={deal}
                unit={unit}
                isOpen={editOpen}
                onClose={() => { setEditOpen(false); setTargetStatus(null); }}
                onSuccess={onRefresh}
                targetStatus={targetStatus}
            />

            {/* Deal financial row */}
            {deal.amount > 0 && (
                <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-2.5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deal Value</span>
                        <span className="text-sm font-extrabold text-slate-900 leading-none mt-1">{formatINR(deal.amount)}</span>
                    </div>
                    {unit && (
                        <div className="flex flex-col items-end">
                             {/* Compact price diff badge */}
                             {(() => {
                                 const listedPrice = Number(unit.total_price || unit.base_price || 0)
                                 if (listedPrice <= 0) return null
                                 const diff = deal.amount - listedPrice
                                 const pct = Math.abs(diff / listedPrice * 100).toFixed(1)
                                 if (Math.abs(diff) < 1) return <span className="text-[9px] font-bold text-slate-400 uppercase">Listed Price</span>
                                 return (
                                     <div className={cn(
                                         "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold",
                                         diff < 0 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                     )}>
                                         {diff < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
                                         {pct}% {diff < 0 ? 'Off' : 'More'}
                                     </div>
                                 )
                             })()}
                        </div>
                    )}
                </div>
            )}

            {/* Notes row */}
            {deal.notes && (
                <div className="flex items-start gap-2 text-gray-500 bg-amber-50/30 border border-amber-100/50 rounded-lg px-2.5 py-2">
                    <span className="text-[11px] leading-relaxed italic">"{deal.notes}"</span>
                </div>
            )}

            {/* Won badge + price comparison */}
            {isWon && (
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        <CheckCheck className="w-3 h-3" />Deal Won
                        {deal.won_at && <span className="font-normal text-emerald-500">· {formatRelativeTime(deal.won_at)}</span>}
                    </div>
                    {deal.amount && (
                        <PriceComparison
                            dealAmount={Number(deal.amount)}
                            listedPrice={Number(unit?.total_price || unit?.base_price || 0)}
                        />
                    )}
                </div>
            )}

            {/* Lost reason */}
            {isLost && deal.lost_reason && (
                <div className="flex items-start gap-1.5 text-[11px] text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />{deal.lost_reason}
                </div>
            )}

            {/* Footer: added/updated by */}
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100 flex-wrap">
                {createdByProfile && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <AvatarChip profile={createdByProfile} label="Added" />
                        {deal.created_at && (
                            <span className="cursor-default" title={formatDateTime(deal.created_at)}>
                                {formatRelativeTime(deal.created_at)}
                            </span>
                        )}
                    </span>
                )}
                {showUpdated && (
                    <>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <AvatarChip profile={updatedByProfile} label="Updated" />
                            {deal.updated_at && (
                                <span className="cursor-default" title={formatDateTime(deal.updated_at)}>
                                    {formatRelativeTime(deal.updated_at)}
                                </span>
                            )}
                        </span>
                    </>
                )}
            </div>
        </div>
    )
}

// ── Main panel ───────────────────────────────────────────────────────────────
export default function UnitDealsPanel({ unit, project }) {
    const [addLeadOpen, setAddLeadOpen] = useState(false)
    const canManage = usePermission('manage_deals')
    const canDelete = usePermission('delete_deals')
    const invalidate = useUnitDealsInvalidate()

    const { data, isLoading } = useUnitDeals(unit?.id)
    const deals = data?.deals || []

    const counts = {
        interested:  deals.filter(d => d.status === 'interested').length,
        negotiation: deals.filter(d => d.status === 'negotiation').length,
        reserved:    deals.filter(d => d.status === 'reserved').length,
        won:         deals.filter(d => d.status === 'won').length,
    }

    const wonDeal = deals.find(d => d.status === 'won')
    const listedPrice = Number(unit?.total_price || unit?.base_price || 0)
    const wonAmount = wonDeal?.amount ? Number(wonDeal.amount) : null
    const priceDiff = wonAmount && listedPrice ? wonAmount - listedPrice : null

    const activeDeals = deals.filter(d => d.status !== 'lost')
    const lostDeals   = deals.filter(d => d.status === 'lost')
    const handleRefresh = () => invalidate(unit?.id)

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Sold price vs listed banner */}
            {wonDeal && wonAmount && listedPrice > 0 && priceDiff !== null && Math.abs(priceDiff) >= 1 && (
                <div className={cn(
                    'flex items-center gap-2.5 rounded-xl px-4 py-3 border text-sm',
                    priceDiff < 0
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                )}>
                    {priceDiff < 0
                        ? <TrendingDown className="w-4 h-4 shrink-0 text-amber-500" />
                        : <TrendingUp className="w-4 h-4 shrink-0 text-blue-500" />
                    }
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-semibold">
                            Unit sold at {formatCurrency(wonAmount)}
                        </span>
                        <span className="text-[12px] opacity-70">
                            Listed price: <span className="line-through">{formatCurrency(listedPrice)}</span>
                        </span>
                        <span className={cn('text-[12px] font-semibold', priceDiff < 0 ? 'text-amber-600' : 'text-blue-600')}>
                            {priceDiff < 0 ? '−' : '+'}{formatCurrency(Math.abs(priceDiff))} ({Math.abs(priceDiff / listedPrice * 100).toFixed(1)}%)
                        </span>
                    </div>
                </div>
            )}
            {/* Header: summary chips + Add Lead */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    {counts.reserved > 0 && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 border gap-1 text-[11px]">
                            <Star className="w-2.5 h-2.5 fill-current" />{counts.reserved} Reserved
                        </Badge>
                    )}
                    {counts.negotiation > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-[11px]">{counts.negotiation} Negotiation</Badge>
                    )}
                    {counts.interested > 0 && (
                        <Badge className="bg-violet-100 text-violet-700 border-violet-200 border text-[11px]">{counts.interested} Interested</Badge>
                    )}
                    {counts.won > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-[11px]">{counts.won} Won</Badge>
                    )}
                    {deals.length === 0 && (
                        <span className="text-sm text-gray-400">No leads linked yet</span>
                    )}
                </div>
                {canManage && (
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddLeadOpen(true)}>
                        <Plus className="w-3.5 h-3.5" />Add Lead
                    </Button>
                )}
            </div>

            {/* Active deal cards */}
            {activeDeals.length > 0 && (
                <div className="space-y-2">
                    {activeDeals.map(deal => (
                        <DealCard key={deal.id} deal={deal} unit={unit} unitId={unit?.id} onRefresh={handleRefresh} canManage={canManage} canDelete={canDelete} />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {deals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-gray-50/50">
                    <User className="w-8 h-8 text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">No interested leads yet</p>
                </div>
            )}

            {/* Lost deals */}
            {lostDeals.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Lost ({lostDeals.length})</p>
                    {lostDeals.map(deal => (
                        <DealCard key={deal.id} deal={deal} unit={unit} unitId={unit?.id} onRefresh={handleRefresh} canManage={canManage} canDelete={canDelete} />
                    ))}
                </div>
            )}

            <AddLeadDealDialog
                unitId={unit?.id}
                unit={unit}
                projectId={project?.id}
                isOpen={addLeadOpen}
                onClose={() => setAddLeadOpen(false)}
                onSuccess={handleRefresh}
            />
        </div>
    )
}
