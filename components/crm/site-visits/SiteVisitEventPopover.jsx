'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import {
    X, Clock, Building2, FileText, CheckCircle,
    XCircle, Edit2, Trash2, ExternalLink, MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { VISIT_STATUS_COLORS, VISIT_STATUS_LABELS, OUTCOME_LABELS } from '@/lib/site-visit-stages'
import { useUpdateSiteVisit, useDeleteSiteVisit } from '@/hooks/useSiteVisits'
import { toast } from 'react-hot-toast'

const STATUS_TOP_BORDER = {
    scheduled: 'border-t-blue-400',
    completed: 'border-t-emerald-400',
    no_show:   'border-t-red-400',
    cancelled: 'border-t-zinc-300',
}

const OUTCOMES = [
    { value: 'interested',       label: 'Interested',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
    { value: 'not_interested',   label: 'Not Interested',   cls: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' },
    { value: 'follow_up_needed', label: 'Follow-up Needed', cls: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
]

export default function SiteVisitEventPopover({ visit, style, onClose, onEditClick }) {
    const ref = useRef(null)
    const [showOutcomePicker, setShowOutcomePicker] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const leadId = visit?.leads?.id
    const updateMutation = useUpdateSiteVisit(leadId)
    const deleteMutation = useDeleteSiteVisit(leadId)

    useEffect(() => {
        function handler(e) {
            if (ref.current && !ref.current.contains(e.target)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    useEffect(() => {
        function handler(e) { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    if (!visit) return null

    const colors    = VISIT_STATUS_COLORS[visit.status] ?? VISIT_STATUS_COLORS.scheduled
    const topBorder = STATUS_TOP_BORDER[visit.status]   ?? STATUS_TOP_BORDER.scheduled

    async function handleMarkNoShow() {
        try {
            await updateMutation.mutateAsync({ visitId: visit.id, status: 'no_show' })
            toast.success('Marked as no show')
            onClose()
        } catch { toast.error('Failed to update') }
    }

    async function handleMarkComplete(outcome) {
        try {
            await updateMutation.mutateAsync({ visitId: visit.id, status: 'completed', outcome })
            toast.success('Visit marked complete')
            onClose()
        } catch { toast.error('Failed to update') }
    }

    async function handleDelete() {
        try {
            await deleteMutation.mutateAsync(visit.id)
            toast.success('Visit deleted')
            onClose()
        } catch { toast.error('Failed to delete') }
    }

    const agentName     = visit.profiles?.full_name ?? visit.assigned_agent?.full_name ?? null
    const agentInitials = agentName
        ? agentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    const canAct   = visit.status === 'scheduled'
    const isPast   = new Date(visit.scheduled_at) <= new Date()
    const notYetMsg = `Available after ${format(new Date(visit.scheduled_at), 'd MMM · h:mm a')}`

    return (
        <div
            ref={ref}
            style={{ ...style, transform: 'translateX(-50%) translateY(-100%)', zIndex: 50 }}
            className={cn(
                'absolute w-80 bg-background rounded-xl border border-border/80 shadow-xl',
                'border-t-4', topBorder,
                'animate-in fade-in-0 zoom-in-95 duration-150'
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between p-4 pb-3">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{visit.leads?.name ?? 'Unknown Lead'}</p>
                    {visit.leads?.phone && (
                        <p className="text-xs text-muted-foreground mt-0.5">{visit.leads.phone}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', colors.bg, colors.text, colors.border)}>
                        {VISIT_STATUS_LABELS[visit.status]}
                    </span>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="px-4 pb-3 space-y-2.5 border-t border-border/50 pt-3">
                {/* Time */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                    <span>{format(new Date(visit.scheduled_at), "EEEE, d MMM · h:mm a")}</span>
                </div>

                {/* Project + Unit */}
                {(visit.projects?.name || visit.units?.unit_number) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                        <span className="truncate">
                            {visit.projects?.name}
                            {visit.units?.unit_number && (
                                <span className="text-foreground/60"> · Unit {visit.units.unit_number}</span>
                            )}
                        </span>
                    </div>
                )}

                {/* Agent */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[8px] font-bold shrink-0">
                        {agentInitials}
                    </div>
                    <span>{agentName ?? 'Unassigned'}</span>
                </div>

                {/* Pipeline stage */}
                {visit.pipeline_stages?.name && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium">
                            {visit.pipeline_stages.name}
                        </span>
                    </div>
                )}

                {/* Outcome (if completed) */}
                {visit.status === 'completed' && visit.outcome && (
                    <div className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span className="font-medium text-emerald-700">{OUTCOME_LABELS[visit.outcome] ?? visit.outcome}</span>
                    </div>
                )}

                {/* Notes */}
                {visit.visit_notes && (
                    <div className="flex items-center gap-2 text-xs">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-400 mt-0.5" />
                        <p className="text-muted-foreground bg-muted/60 rounded-md px-2 py-1.5 leading-relaxed flex-1">
                            {visit.visit_notes}
                        </p>
                    </div>
                )}
            </div>

            {/* Outcome Picker */}
            {showOutcomePicker && (
                <div className="px-4 pb-3 border-t border-border/50 pt-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Outcome</p>
                    <div className="flex flex-col gap-1.5">
                        {OUTCOMES.map(o => (
                            <button
                                key={o.value}
                                disabled={updateMutation.isPending}
                                onClick={() => handleMarkComplete(o.value)}
                                className={cn('text-xs font-medium px-3 py-2 rounded-lg border transition-all text-left', o.cls)}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowOutcomePicker(false)}
                        className="text-[10px] text-muted-foreground mt-2 hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Delete Confirm */}
            {confirmDelete && (
                <div className="px-4 pb-3 border-t border-border/50 pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Delete this visit?</p>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs flex-1"
                            disabled={deleteMutation.isPending}
                            onClick={handleDelete}
                        >
                            Delete
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setConfirmDelete(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            {!showOutcomePicker && !confirmDelete && (
                <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-2">
                    <Button
                        className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                        onClick={() => window.open(`/dashboard/admin/crm/leads/${leadId}`, '_blank')}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Lead
                    </Button>

                    {canAct && (
                        <TooltipProvider delayDuration={200}>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        disabled={!isPast || updateMutation.isPending}
                                        onClick={() => isPast && setShowOutcomePicker(true)}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-1 h-8 text-[11px] font-medium rounded-lg border transition-all',
                                            isPast
                                                ? 'border-border/60 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
                                                : 'border-border/40 text-emerald-600/40 cursor-not-allowed'
                                        )}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Complete
                                    </button>
                                </TooltipTrigger>
                                {!isPast && (
                                    <TooltipContent side="top">
                                        {notYetMsg}
                                    </TooltipContent>
                                )}
                            </Tooltip>

                            {visit.status !== 'no_show' && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            disabled={!isPast || updateMutation.isPending}
                                            onClick={() => isPast && handleMarkNoShow()}
                                            className={cn(
                                                'flex-1 flex items-center justify-center gap-1 h-8 text-[11px] font-medium rounded-lg border transition-all',
                                                isPast
                                                    ? 'border-border/60 text-red-500 hover:bg-red-50 hover:border-red-200'
                                                    : 'border-border/40 text-red-500/40 cursor-not-allowed'
                                            )}
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            No Show
                                        </button>
                                    </TooltipTrigger>
                                    {!isPast && (
                                        <TooltipContent side="top">
                                            {notYetMsg}
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            )}

                            <button
                                title="Edit"
                                onClick={() => { onEditClick(visit); onClose() }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                                title="Delete"
                                onClick={() => setConfirmDelete(true)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        </TooltipProvider>
                    )}
                </div>
            )}
        </div>
    )
}
