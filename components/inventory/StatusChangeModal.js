'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    CheckCircle2, Clock, Search, XCircle, ShieldCheck, Loader2, AlertCircle, Building2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

const STATUS_OPTIONS = [
    { 
        value: 'available', 
        label: 'Available', 
        icon: CheckCircle2, 
        color: 'text-emerald-600', 
        activeColor: 'text-emerald-700',
        activeBg: 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-100',
        activeIconBg: 'bg-emerald-100',
        description: 'Unit is open for sale'
    },
    { 
        value: 'reserved', 
        label: 'Reserved', 
        icon: Clock, 
        color: 'text-amber-600', 
        activeColor: 'text-amber-700',
        activeBg: 'bg-amber-50 border-amber-200 ring-2 ring-amber-100',
        activeIconBg: 'bg-amber-100',
        description: 'Unit is on hold'
    },
    { 
        value: 'sold', 
        label: 'Sold', 
        icon: ShieldCheck, 
        color: 'text-rose-600', 
        activeColor: 'text-rose-700',
        activeBg: 'bg-rose-50 border-rose-200 ring-2 ring-rose-100',
        activeIconBg: 'bg-rose-100',
        description: 'Finalize sale record'
    }
]

export default function StatusChangeModal({ property: unit, isOpen, onClose, onStatusChanged }) {
    const [selectedStatus, setSelectedStatus] = useState(unit?.status || 'available')
    const [loading, setLoading] = useState(false)

    const [leadSearch, setLeadSearch] = useState('')
    const [leadResults, setLeadResults] = useState([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [selectedLead, setSelectedLead] = useState(null)
    const [confirmStep, setConfirmStep] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        
        if (unit?.lead_id) {
            setSelectedLead(unit.leads || { id: unit.lead_id, name: 'Current Customer' })
        } else {
            setSelectedLead(null)
        }
        setSelectedStatus(unit?.status || 'available')
        setConfirmStep(false)
        setLeadSearch('')
    }, [unit, isOpen])

    useEffect(() => {
        if (!leadSearch.trim() || leadSearch.length < 2) {
            setLeadResults([])
            return
        }
        const timer = setTimeout(() => searchLeads(leadSearch), 350)
        return () => clearTimeout(timer)
    }, [leadSearch])

    const searchLeads = async (query) => {
        try {
            setSearchLoading(true)
            const res = await fetch(`/api/leads?search=${encodeURIComponent(query)}&limit=8`)
            const data = await res.json()
            setLeadResults(data.leads || data.data || [])
        } catch (err) {
            console.error('Lead search error:', err)
        } finally {
            setSearchLoading(false)
        }
    }

    const handleStatusSelect = (status) => {
        setSelectedStatus(status)
        setConfirmStep(false)
        if (status === 'available') {
            setSelectedLead(null)
        }
    }

    const handleProceed = () => {
        if (selectedStatus === 'sold' && selectedStatus !== unit?.status) {
            setConfirmStep(true)
            return
        }
        handleSave()
    }

    const handleSave = async () => {
        if (!unit) {
            onClose()
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`/api/inventory/units/${unit.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: selectedStatus,
                    lead_id: selectedLead?.id || null
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update status')
            }

            toast.success(`Status updated for Unit ${unit.unit_number}`)

            if (onStatusChanged) {
                onStatusChanged(data.unit, data.projectMetrics)
            }
            onClose()
        } catch (error) {
            console.error('Status update error:', error)
            toast.error(error.message || 'Failed to update status')
        } finally {
            setLoading(false)
        }
    }

    if (!unit) return null

    const isStatusChanged = selectedStatus !== unit.status || (unit.lead_id !== (selectedLead?.id || null))
    const needsLead = selectedStatus === 'reserved' || selectedStatus === 'sold'
    const canSubmit = !loading && (isStatusChanged) && (!needsLead || selectedLead)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[380px] bg-white rounded-[1.5rem] border-0 shadow-2xl p-0 overflow-hidden outline-none">
                <DialogHeader className="p-6 pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <Building2 className="w-5 h-5 text-slate-900" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <DialogTitle className="text-base font-bold text-slate-900 leading-tight">Unit Status</DialogTitle>
                            <DialogDescription className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                #{unit.unit_number} • {unit.tower?.name || 'MAIN'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 pt-4">
                    {confirmStep ? (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                             <div className="flex flex-col items-center text-center p-6 bg-rose-50/50 rounded-2xl border border-rose-100 shadow-sm mb-5">
                                <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3 ring-2 ring-rose-100">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <h4 className="text-lg font-bold text-rose-900 leading-none">Confirm Sale</h4>
                                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mt-2 opacity-80">
                                    Final transaction record
                                </p>
                            </div>

                            {selectedLead && (
                                <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white text-base font-bold">
                                        {selectedLead.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Confirmed Buyer</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{selectedLead.name}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2.5">
                                <Button variant="ghost" onClick={() => setConfirmStep(false)} disabled={loading} className="flex-1 h-9 rounded-xl font-bold text-slate-400 hover:text-slate-900 text-xs">Back</Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-lg shadow-rose-100 transition-all active:scale-95 text-xs"
                                >
                                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Sale"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-2.5">
                                {STATUS_OPTIONS.map(option => {
                                    const Icon = option.icon
                                    const isActive = selectedStatus === option.value
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => handleStatusSelect(option.value)}
                                            className={cn(
                                                "group flex items-center gap-3.5 p-3 rounded-xl border transition-all text-left relative",
                                                isActive 
                                                    ? option.activeBg
                                                    : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50'
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm border border-transparent",
                                                isActive ? option.activeIconBg : 'bg-slate-50'
                                            )}>
                                                <Icon className={cn("w-4 h-4", isActive ? option.activeColor : 'text-slate-400')} />
                                            </div>
                                            <div className="flex-1">
                                                <p className={cn("text-[14px] font-bold leading-none mb-1", isActive ? option.activeColor : 'text-slate-900')}>
                                                    {option.label}
                                                </p>
                                                <p className="text-[11px] font-semibold text-slate-400 leading-none">
                                                    {option.description}
                                                </p>
                                            </div>
                                            <div className={cn(
                                                "w-4 h-4 rounded-full flex items-center justify-center transition-all",
                                                isActive ? 'bg-slate-900 scale-100' : 'bg-slate-100 scale-0 opacity-0'
                                            )}>
                                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {needsLead && (
                                <div className="space-y-2.5 pt-1">
                                    <div className="flex justify-between items-center px-1">
                                        <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Customer</Label>
                                        <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md uppercase">Required</span>
                                    </div>
                                    
                                    {selectedLead ? (
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 text-white shadow-xl shadow-slate-100 group relative">
                                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {selectedLead.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-[13px] font-bold truncate leading-none mb-1">{selectedLead.name}</p>
                                                <p className="text-[9px] text-white/50 font-bold truncate leading-none uppercase tracking-tighter">{selectedLead.phone || 'No Info'}</p>
                                            </div>
                                            <button onClick={() => setSelectedLead(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white">
                                                <XCircle className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                            <Input
                                                className="h-9 pl-10 rounded-xl bg-slate-50 border-slate-100 text-xs font-semibold focus:bg-white focus:ring-0 transition-all placeholder:text-slate-300"
                                                placeholder="Search customer name..."
                                                value={leadSearch}
                                                onChange={e => setLeadSearch(e.target.value)}
                                            />
                                            {searchLoading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />}

                                            {leadResults.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-100 shadow-2xl z-50 py-1.5 max-h-[160px] overflow-y-auto animate-in fade-in slide-in-from-top-1">
                                                    {leadResults.map(lead => (
                                                        <button
                                                            key={lead.id}
                                                            onClick={() => { setSelectedLead(lead); setLeadResults([]); setLeadSearch('') }}
                                                            className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 transition-colors text-left border-b border-slate-50 last:border-0"
                                                        >
                                                            <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 text-[10px] font-bold">
                                                                {lead.name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-900 truncate leading-none mb-1">{lead.name}</p>
                                                                <p className="text-[9px] text-slate-400 truncate leading-none font-bold uppercase tracking-tight">{lead.phone || lead.email}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2.5 pt-4 border-t border-slate-50">
                                <Button variant="ghost" onClick={onClose} disabled={loading} className="flex-1 h-10 rounded-xl font-bold text-slate-400 hover:text-slate-900 text-xs">
                                    Dismiss
                                </Button>
                                <Button
                                    onClick={handleProceed}
                                    disabled={!canSubmit}
                                    className={cn(
                                        "flex-1 h-10 rounded-xl transition-all font-bold text-white shadow-lg active:scale-95 text-xs",
                                        selectedStatus === 'sold' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100" : "bg-slate-900 hover:bg-slate-800 shadow-slate-100"
                                    )}
                                >
                                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Update Status"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
