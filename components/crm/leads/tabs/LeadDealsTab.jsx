'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
    Plus, Building, ExternalLink, Trash2, Pencil, Search,
    Star, IndianRupee, Layers, Maximize2, AlertCircle,
    BedDouble, CheckCheck, CheckCircle2, Loader2, Handshake, XCircle,
    TrendingUp, TrendingDown, ChevronDown, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { usePermission } from '@/contexts/PermissionContext'
import AddDealDialog, { DEAL_STATUSES } from '@/components/crm/AddDealDialog'
import UnitDetailSheet from '@/components/inventory/UnitDetailSheet'
import { formatRelativeTime, formatDateTime } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'
import { formatINR } from '@/lib/inventory'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getDefaultAvatar } from '@/lib/avatar-utils'

function formatPrice(val) {
    if (!val) return null
    const n = Number(val)
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
    if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
    return `₹${n.toLocaleString('en-IN')}`
}

// ── Status pill config ──────────────────────────────────────────────────────
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

// ── User avatar chip — avatar only, name on tooltip ─────────────────────────
function AvatarChip({ profile, label }) {
    if (!profile) return null
    const initials = (profile.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    // Show last name first: "Chauhan Manish" style
    const parts = (profile.full_name || '').trim().split(' ')
    const displayName = parts.length > 1 ? `${parts[parts.length - 1]} ${parts[0]}` : parts[0]
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full pl-0.5 pr-2 py-0.5 shadow-sm">
            <Avatar className="h-4 w-4 border-white shadow-sm ring-1 ring-slate-100 bg-slate-200">
                <AvatarFallback className="text-[7px] font-bold text-slate-600">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <span className="font-medium leading-none">{displayName}</span>
        </span>
    )
}

// ── Inline status changer ────────────────────────────────────────────────────
function StatusChanger({ deal, onStatusChange, disabled }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className="focus:outline-none disabled:opacity-50"
                    title="Change status"
                >
                    <StatusPill status={deal.status} interactive />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 p-1">
                {DEAL_STATUSES.filter(s => s.value !== deal.status).map(s => {
                    const meta = STATUS_META[s.value]
                    return (
                        <DropdownMenuItem
                            key={s.value}
                            onClick={() => onStatusChange(s.value)}
                            className="flex items-center gap-2 text-sm rounded-md cursor-pointer"
                        >
                            <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
                            {s.label}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ── Edit deal dialog (2-step: unit/project → details) ───────────────────────
function EditDealDialog({ deal, isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1)
    const [activeTab, setActiveTab] = useState('unit')
    const [search, setSearch] = useState('')
    const [units, setUnits] = useState([])
    const [projects, setProjects] = useState([])
    const [loadingUnits, setLoadingUnits] = useState(false)
    const [selectedUnit, setSelectedUnit] = useState(null)
    const [selectedProject, setSelectedProject] = useState(null)
    const [unitProjectFilter, setUnitProjectFilter] = useState(null)
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen || !deal) return
        // pre-populate from existing deal
        setStep(1)
        setSearch('')
        setAmount(deal.amount ?? '')
        setNotes(deal.notes ?? '')
        setSelectedUnit(deal.unit || null)
        setSelectedProject(deal.unit ? null : (deal.project || null))
        setActiveTab(deal.unit ? 'unit' : 'project')
        const existingProject = deal.unit?.project || deal.project || null
        setUnitProjectFilter(existingProject ? { id: existingProject.id, name: existingProject.name } : null)
        fetchUnits()
        fetchProjects()
    }, [isOpen, deal])

    // Auto-fill amount when unit is selected
    useEffect(() => {
        if (selectedUnit && !amount) {
            setAmount(selectedUnit.total_price || selectedUnit.base_price || '')
        }
    }, [selectedUnit])

    const fetchUnits = async () => {
        setLoadingUnits(true)
        try {
            const res = await fetch('/api/inventory/units')
            const data = await res.json()
            setUnits(data.units || [])
        } catch {} finally { setLoadingUnits(false) }
    }

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/inventory/projects')
            const data = await res.json()
            setProjects(data.projects || [])
        } catch {}
    }

    const filteredUnits = units.filter(u => {
        if (!['available', 'reserved'].includes(u.status) && u.id !== deal?.unit?.id) return false
        const matchSearch =
            (u.unit_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.tower_name || '').toLowerCase().includes(search.toLowerCase())
        return matchSearch && (!unitProjectFilter || u.project_id === unitProjectFilter.id)
    })

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    )

    const handleSave = async () => {
        if (!amount) {
            toast.error('Deal amount is mandatory')
            return
        }
        setSaving(true)
        try {
            const projectId = selectedProject?.id || selectedUnit?.project_id || unitProjectFilter?.id || null
            const res = await fetch(`/api/deals/${deal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    unit_id: selectedUnit?.id || null,
                    project_id: projectId,
                    amount: Number(amount),
                    notes: notes.trim() || null,
                }),
            })
            if (!res.ok) throw new Error('Failed')
            toast.success('Deal updated')
            onSuccess?.()
            onClose()
        } catch {
            toast.error('Failed to update deal')
        } finally {
            setSaving(false)
        }
    }

    const selectedLabel = selectedUnit
        ? `Unit ${selectedUnit.unit_number}${selectedUnit.tower?.name || selectedUnit.tower_name ? ` · ${selectedUnit.tower?.name || selectedUnit.tower_name}` : ''}`
        : selectedProject?.name || null

    const selectedSub = selectedUnit
        ? (selectedUnit.project?.name || selectedUnit.project_name || '')
        : selectedProject ? 'General project interest' : ''

    const UNIT_STATUS_COLORS = {
        available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        reserved:  'bg-orange-50 text-orange-700 border-orange-200',
        sold:      'bg-red-50 text-red-600 border-red-200',
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{step === 1 ? 'Edit Unit or Project' : 'Edit Details'}</DialogTitle>
                </DialogHeader>

                {step === 1 && (
                    <div className="py-2 space-y-3">
                        <div className="flex p-1 bg-muted rounded-lg">
                            {['unit', 'project'].map(tab => (
                                <button
                                    key={tab}
                                    className={cn(
                                        'flex-1 text-sm font-medium py-1.5 rounded-md transition-all',
                                        activeTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    onClick={() => { setActiveTab(tab); setSearch('') }}
                                >
                                    {tab === 'unit' ? 'Specific Unit' : 'General Project'}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'unit' && (
                            <Select
                                value={unitProjectFilter?.id || 'all'}
                                onValueChange={val => {
                                    if (val === 'all') { setUnitProjectFilter(null); return }
                                    const p = projects.find(p => p.id === val)
                                    setUnitProjectFilter(p || null)
                                    if (selectedUnit && selectedUnit.project_id !== val) setSelectedUnit(null)
                                }}
                            >
                                <SelectTrigger className="text-sm h-9">
                                    <SelectValue placeholder="All projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All projects</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={activeTab === 'unit' ? 'Search by unit no, tower...' : 'Search projects...'}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>

                        <div className="h-[240px] overflow-y-auto rounded-xl border bg-muted/10 p-2 space-y-1.5">
                            {loadingUnits ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
                                </div>
                            ) : activeTab === 'unit' ? (
                                filteredUnits.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-1">
                                        <Building className="w-7 h-7 opacity-20" />No units found
                                    </div>
                                ) : filteredUnits.map(unit => {
                                    const selected = selectedUnit?.id === unit.id
                                    return (
                                        <div
                                            key={unit.id}
                                            onClick={() => { setSelectedUnit(unit); setSelectedProject(null) }}
                                            className={cn(
                                                'p-3 rounded-lg border cursor-pointer transition-all',
                                                selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-transparent bg-card hover:bg-accent/50 hover:border-border'
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-semibold text-sm text-foreground">Unit {unit.unit_number}</p>
                                                        {unit.tower_name && <span className="text-[11px] text-muted-foreground">· {unit.tower_name}</span>}
                                                        <Badge variant="outline" className={cn('text-[10px] h-4 px-1.5 capitalize border', UNIT_STATUS_COLORS[unit.status] || '')}>
                                                            {unit.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                        {unit.bedrooms && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><BedDouble className="w-3 h-3" />{unit.bedrooms} BHK</span>}
                                                        {unit.floor_number != null && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Layers className="w-3 h-3" />Floor {unit.floor_number === 0 ? 'G' : unit.floor_number}</span>}
                                                        {unit.carpet_area && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Maximize2 className="w-3 h-3" />{unit.carpet_area} sqft</span>}
                                                        {(unit.base_price || unit.total_price) && <span className="text-[11px] font-semibold text-foreground">{formatINR(unit.total_price || unit.base_price)}</span>}
                                                    </div>
                                                    {unit.project_name && <p className="text-[10px] text-muted-foreground mt-1 truncate">{unit.project_name}</p>}
                                                </div>
                                                {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                filteredProjects.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No projects found.</div>
                                ) : filteredProjects.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => { setSelectedProject(project); setSelectedUnit(null) }}
                                        className={cn(
                                            'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                                            selectedProject?.id === project.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-transparent bg-card hover:bg-accent/50 hover:border-border'
                                        )}
                                    >
                                        <div className="mt-0.5 p-1.5 bg-secondary rounded-md shrink-0">
                                            <Building className="w-3.5 h-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <p className="font-medium text-sm truncate">{project.name}</p>
                                                {selectedProject?.id === project.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                                            </div>
                                            {project.city && <p className="text-[11px] text-muted-foreground mt-0.5">{project.city}</p>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-center">
                            <Button
                                variant="link" size="sm" className="text-xs text-muted-foreground"
                                onClick={() => { setSelectedUnit(null); setSelectedProject(null); setStep(2) }}
                            >
                                Continue without changing unit
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="py-4 space-y-5">
                        {selectedLabel && (
                            <div className="p-3 bg-muted/30 rounded-lg border flex items-center gap-3">
                                <div className="p-1.5 bg-secondary rounded-md shrink-0">
                                    <Building className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{selectedLabel}</p>
                                    {selectedSub && <p className="text-xs text-muted-foreground truncate">{selectedSub}</p>}
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 text-xs shrink-0" onClick={() => setStep(1)}>Change</Button>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Deal Amount <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input 
                                    type="number" 
                                    className="pl-8 pr-24" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)} 
                                    placeholder="0"
                                    required 
                                />
                                {amount && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-700 bg-orange-50/80 px-2 py-1 rounded border border-orange-200 pointer-events-none">
                                        {formatINR(amount)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <Textarea rows={3} className="resize-none text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 1 ? (
                        <>
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button onClick={() => setStep(2)}>Next</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Lost reason dialog ───────────────────────────────────────────────────────
function LostReasonDialog({ deal, isOpen, onClose, onSuccess }) {
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/deals/${deal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'lost', lost_reason: reason }),
            })
            if (!res.ok) throw new Error('Failed')
            toast.success('Deal marked as lost')
            onSuccess?.()
            onClose()
        } catch {
            toast.error('Failed to update deal')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Why was this deal lost?</DialogTitle></DialogHeader>
                <Textarea
                    rows={3}
                    className="resize-none text-sm"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Budget constraints, chose a different unit..."
                />
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="destructive" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Mark Lost'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Confirmation Dialog ─────────────────────────────────────────────────────
function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Continue', loading }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-2">
                    <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={onConfirm} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Deal card ────────────────────────────────────────────────────────────────
function DealCard({ deal, onRefresh, canManage, canDelete }) {
    const [editOpen, setEditOpen] = useState(false)
    const [lostOpen, setLostOpen] = useState(false)
    const [unitSheetOpen, setUnitSheetOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [changingStatus, setChangingStatus] = useState(false)

    const unit = deal.unit
    const createdByProfile = deal.createdByProfile
    const updatedByProfile = deal.updatedByProfile
    const showUpdated = updatedByProfile && updatedByProfile.id !== createdByProfile?.id

    const isWon = deal.status === 'won'
    const isReserved = deal.status === 'reserved'
    const isLost = deal.status === 'lost'

    const [reservedConfirmOpen, setReservedConfirmOpen] = useState(false)
    const [pendingStatus, setPendingStatus] = useState(null)

    const performStatusUpdate = async (newStatus) => {
        setChangingStatus(true)
        try {
            const res = await fetch(`/api/deals/${deal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            toast.success(`Deal marked as ${DEAL_STATUSES.find(s => s.value === newStatus)?.label || newStatus}`)
            onRefresh()
            setReservedConfirmOpen(false)
        } catch (e) {
            toast.error(e.message || 'Failed to update status')
        } finally {
            setChangingStatus(false)
        }
    }

    const handleStatusChange = async (newStatus) => {
        if (newStatus === 'lost') { setLostOpen(true); return }
        if (newStatus === 'reserved') {
            setPendingStatus(newStatus)
            setReservedConfirmOpen(true)
            return
        }
        performStatusUpdate(newStatus)
    }

    const handleDelete = async () => {
        if (!confirm('Delete this deal? This cannot be undone.')) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed')
            toast.success('Deal deleted')
            onRefresh()
        } catch {
            toast.error('Failed to delete deal')
        } finally {
            setDeleting(false)
        }
    }

    const accentColor = STATUS_META[deal.status]?.accent || 'bg-gray-300'

    return (
        <>
            <div className={cn(
                'rounded-xl border bg-white p-4 space-y-3 transition-all hover:shadow-sm relative overflow-hidden',
                isLost && 'opacity-55',
            )}>
                {/* Left accent bar */}
                <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl', accentColor)} />

                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                    {/* Unit info */}
                    <div className="min-w-0 flex-1">
                        {unit ? (
                            <>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-sm text-gray-900">Unit {unit.unit_number}</span>
                                    {unit.tower?.name && (
                                        <span className="text-[11px] text-gray-400 font-medium">· {unit.tower.name}</span>
                                    )}
                                    {unit.facing && (
                                        <span className="text-[10px] text-gray-400">· {unit.facing}</span>
                                    )}
                                </div>
                                {unit.project?.name && (
                                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{unit.project.name}</p>
                                )}
                            </>
                        ) : (
                            <p className="font-bold text-sm text-gray-900">{deal.project?.name || deal.name}</p>
                        )}
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {canManage ? (
                            <StatusChanger deal={deal} onStatusChange={handleStatusChange} disabled={changingStatus} />
                        ) : (
                            <StatusPill status={deal.status} />
                        )}
                        {canManage && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 text-gray-300 hover:text-gray-600"
                                onClick={() => setEditOpen(true)}
                            >
                                <Pencil className="w-3 h-3" />
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 text-gray-300 hover:text-red-500"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Unit stats grid */}
                {unit && (
                    <div className="flex items-center gap-4 flex-wrap px-1">
                        {unit.bedrooms && (
                            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <BedDouble className="w-3.5 h-3.5 text-violet-400" />
                                <span>{unit.bedrooms} BHK</span>
                            </span>
                        )}
                        {unit.floor_number != null && (
                            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <Layers className="w-3.5 h-3.5 text-blue-400" />
                                <span>Floor {unit.floor_number === 0 ? 'G' : unit.floor_number}</span>
                            </span>
                        )}
                        {unit.carpet_area && (
                            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{unit.carpet_area} sqft</span>
                            </span>
                        )}
                    </div>
                )}

                {/* Deal financial row */}
                {(deal.amount > 0 || unit?.total_price || unit?.base_price) && (
                    <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-2.5">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {deal.amount > 0 ? 'Deal Value' : 'Listed Price'}
                            </span>
                            <span className={cn(
                                "text-sm font-extrabold leading-none mt-1",
                                deal.amount > 0 ? "text-slate-900" : "text-slate-500"
                            )}>
                                {formatCurrency(deal.amount || unit?.total_price || unit?.base_price)}
                            </span>
                        </div>
                        {unit && (
                            <div className="flex flex-col items-end">
                                {(() => {
                                    const listedPrice = Number(unit.total_price || unit.base_price || 0)
                                    if (listedPrice <= 0) return null
                                    
                                    if (!deal.amount || Math.abs(deal.amount - listedPrice) < 1) {
                                        return <span className="text-[9px] font-bold text-slate-400 uppercase">Listed Price</span>
                                    }

                                    const diff = deal.amount - listedPrice
                                    const pct = Math.abs(diff / listedPrice * 100).toFixed(1)
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

                {/* Won badge — small inline element */}
                {isWon && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        <CheckCheck className="w-3 h-3" />
                        Deal Won
                        {deal.won_at && <span className="font-normal text-emerald-500">· {formatRelativeTime(deal.won_at)}</span>}
                    </div>
                )}

                {/* Notes */}
                {deal.notes && (
                    <div className="flex items-start gap-2 text-gray-500 bg-amber-50/30 border border-amber-100/50 rounded-lg px-2.5 py-2">
                        <span className="text-[11px] leading-relaxed italic">"{deal.notes}"</span>
                    </div>
                )}

                {/* Lost reason */}
                {isLost && deal.lost_reason && (
                    <div className="flex items-start gap-1.5 text-[11px] text-red-500 bg-red-50 rounded-xl px-2.5 py-1.5">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{deal.lost_reason}</span>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {createdByProfile && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                <AvatarChip profile={createdByProfile} />
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
                                    <AvatarChip profile={updatedByProfile} />
                                    {deal.updated_at && (
                                        <span className="cursor-default" title={formatDateTime(deal.updated_at)}>
                                            {formatRelativeTime(deal.updated_at)}
                                        </span>
                                    )}
                                </span>
                            </>
                        )}
                    </div>

                    {unit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-2 gap-1 text-gray-400 hover:text-gray-700"
                            onClick={() => setUnitSheetOpen(true)}
                        >
                            <Building className="w-3 h-3" />View Unit
                        </Button>
                    )}
                </div>
            </div>

            <EditDealDialog deal={deal} isOpen={editOpen} onClose={() => setEditOpen(false)} onSuccess={onRefresh} />
            <LostReasonDialog deal={deal} isOpen={lostOpen} onClose={() => setLostOpen(false)} onSuccess={onRefresh} />
            <ConfirmationDialog 
                isOpen={reservedConfirmOpen}
                onClose={() => setReservedConfirmOpen(false)}
                onConfirm={() => performStatusUpdate(pendingStatus)}
                loading={changingStatus}
                title="Reserve Unit?"
                message="This will move any existing reserved deal for this unit to Negotiation. Are you sure you want to proceed?"
                confirmText="Reserve Unit"
            />
            {unit && (
                <UnitDetailSheet
                    unit={unit}
                    unitId={unit.id}
                    open={unitSheetOpen}
                    onClose={() => setUnitSheetOpen(false)}
                />
            )}
        </>
    )
}

// ── Main tab ─────────────────────────────────────────────────────────────────
export default function LeadDealsTab({ leadId, lead, initialDeals }) {
    const [addOpen, setAddOpen] = useState(false)
    const canManage = usePermission('manage_deals')
    const canDelete = usePermission('delete_deals')
    const qc = useQueryClient()
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['lead-deals', leadId],
        queryFn: async () => {
            const res = await fetch(`/api/leads/${leadId}/deals`)
            if (!res.ok) throw new Error('Failed to load deals')
            return res.json()
        },
        initialData: initialDeals ? { deals: initialDeals } : undefined,
        staleTime: 30_000,
    })

    const deals = data?.deals || []
    const activeDeals = deals.filter(d => d.status !== 'lost')
    const lostDeals = deals.filter(d => d.status === 'lost')

    const dealsByProject = activeDeals.reduce((acc, deal) => {
        const project = deal.project || deal.unit?.project
        const key = project?.id || 'none'
        const label = project?.name || 'No Project'
        if (!acc[key]) acc[key] = { label, deals: [] }
        acc[key].deals.push(deal)
        return acc
    }, {})

    const handleRefresh = () => {
        refetch()
        qc.invalidateQueries({ queryKey: ['lead', leadId] })
    }

    const wonDeals = deals.filter(d => d.status === 'won')
    const totalAmount = activeDeals.reduce((sum, d) => sum + (d.amount || 0), 0)

    const statsData = {
        total: activeDeals.length,
        won: wonDeals.length,
        lost: lostDeals.length,
        value: totalAmount,
    }

    if (isLoading) {
        return (
            <div className="space-y-4 py-2 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse border" />)}
                </div>
                {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
        )
    }

    return (
        <div className="space-y-6 w-full">
            {/* Header Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Active Deals', value: statsData.total, icon: Handshake, color: 'blue' },
                    { label: 'Won', value: statsData.won, icon: CheckCheck, color: 'emerald' },
                    { label: 'Lost', value: statsData.lost, icon: XCircle, color: 'red' },
                    { label: 'Active Value', value: formatCurrency(statsData.value), icon: IndianRupee, color: 'orange' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="border-0 shadow-sm ring-1 ring-gray-100 bg-white">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={cn("p-2.5 rounded-xl", 
                                color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                                color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 
                                color === 'red' ? 'bg-red-50 text-red-600' :
                                'bg-orange-50 text-orange-600'
                            )}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{label}</p>
                                <p className={cn(
                                    "text-base font-black mt-0.5 truncate max-w-full",
                                    label === 'Lost' && value > 0 ? 'text-red-600' : 'text-gray-900'
                                )}>{value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Header Actions */}
            <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm ring-1 ring-slate-100">
                <div className="px-2 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Deals List</h3>
                </div>
                {canManage && (
                    <Button size="sm" onClick={() => setAddOpen(true)} className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 font-bold shadow-md active:scale-95 transition-all text-xs shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                        New Deal
                    </Button>
                )}
            </div>

            {/* Active deals grouped by project */}
            {activeDeals.length > 0 ? (
                <div className="space-y-5">
                    {Object.entries(dealsByProject).map(([key, group]) => (
                        <div key={key} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide truncate">{group.label}</p>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">{group.deals.length}</Badge>
                            </div>
                            <div className="space-y-2">
                                {group.deals.map(deal => (
                                    <DealCard key={deal.id} deal={deal} onRefresh={handleRefresh} canManage={canManage} canDelete={canDelete} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-gray-50/50">
                    <Building className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-500">No deals yet</p>
                    <p className="text-xs text-gray-400 mt-1">Link this lead to a unit to start tracking interest</p>
                    {canManage && (
                        <Button size="sm" variant="outline" className="mt-4 h-7 text-xs gap-1" onClick={() => setAddOpen(true)}>
                            <Plus className="w-3.5 h-3.5" />Add Deal
                        </Button>
                    )}
                </div>
            )}

            {/* Lost deals */}
            {lostDeals.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Lost ({lostDeals.length})</p>
                    {lostDeals.map(deal => (
                        <DealCard key={deal.id} deal={deal} onRefresh={handleRefresh} canManage={canManage} canDelete={canDelete} />
                    ))}
                </div>
            )}

            <AddDealDialog
                leadId={leadId}
                leadName={lead?.name}
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                onSuccess={handleRefresh}
                defaultProject={lead?.project_id ? { id: lead.project_id, name: lead.project?.name } : null}
            />
        </div>
    )
}
