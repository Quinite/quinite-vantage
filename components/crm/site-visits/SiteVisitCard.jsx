'use client'

import { format } from 'date-fns'
import { Calendar, Clock, User, MoreVertical, Edit2, Trash2, CheckCircle2, XCircle, Building, Home, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { VISIT_STATUS_COLORS, VISIT_STATUS_LABELS, OUTCOME_LABELS } from '@/lib/site-visit-stages'

export default function SiteVisitCard({ visit, onEdit, onDelete, onMarkComplete, onMarkNoShow }) {
    const colors = VISIT_STATUS_COLORS[visit.status] ?? VISIT_STATUS_COLORS.scheduled
    const d = new Date(visit.scheduled_at)
    const isPast = d < new Date()

    return (
        <div className={cn(
            'group relative rounded-xl border p-4 transition-all duration-150 hover:shadow-md',
            colors.border,
            visit.status === 'scheduled' && isPast ? 'bg-amber-50/40' : 'bg-card'
        )}>
            {/* Top row: date/time + status badge */}
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground flex-wrap">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {format(d, 'EEE, d MMM yyyy')}
                        {visit.outcome && (
                            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full ml-1',
                                visit.outcome === 'interested'       ? 'bg-emerald-100 text-emerald-700' :
                                visit.outcome === 'not_interested'   ? 'bg-red-100 text-red-600' :
                                'bg-amber-100 text-amber-700'
                            )}>
                                {OUTCOME_LABELS[visit.outcome]}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(d, 'h:mm a')}
                        {isPast && visit.status === 'scheduled' && (
                            <span className="text-amber-600 font-medium ml-1">• Overdue</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge className={cn('text-[11px] font-medium border shadow-none z-10', colors.bg, colors.text, colors.border)}>
                        {VISIT_STATUS_LABELS[visit.status]}
                    </Badge>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 -ml-1">
                        {visit.status === 'scheduled' && (
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); onEdit?.(visit) }}>
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); onDelete?.(visit) }}>
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Project & Unit */}
            {visit.project && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                    <Building className="w-3 h-3" />
                    <span className="font-medium text-slate-700">{visit.project.name}</span>
                    {visit.unit && (
                        <>
                            <span className="text-slate-300 mx-0.5">•</span>
                            <Home className="w-3 h-3" />
                            <span className="font-medium text-slate-700">Unit {visit.unit.unit_number} {visit.unit.tower?.name ? `(${visit.unit.tower.name})` : ''}</span>
                        </>
                    )}
                </div>
            )}

            {/* Lead / Client Info */}
            {(() => {
                const l = visit.lead || visit.leads
                if (!l) return null
                return (
                    <div className="mt-3 flex items-center gap-2.5 p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                        {l.avatar_url ? (
                            <img src={l.avatar_url} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" alt="" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                                {l.name?.[0]?.toUpperCase() || 'L'}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-900 truncate uppercase tracking-tight">{l.name}</p>
                            {(l.phone || l.email) && (
                                <p className="text-[9px] text-slate-500 truncate leading-none mt-0.5">
                                    {l.phone || l.email}
                                </p>
                            )}
                        </div>
                    </div>
                )
            })()}

            {/* Notes */}
            {visit.visit_notes && (
                <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-600 italic line-clamp-2 leading-relaxed">{visit.visit_notes}</p>
                </div>
            )}

            {/* Bottom Row: Agent & Quick Actions */}
            {(visit.assigned_agent || visit.status === 'scheduled') && (
                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-50">
                    <div className="flex-1 min-w-0">
                        {visit.assigned_agent && (
                            <Badge variant="outline" className="text-[10px] font-medium text-slate-600 bg-slate-50 border-slate-200 shadow-none px-2 py-0.5 rounded-md truncate max-w-full">
                                <User className="w-3 h-3 mr-1.5 text-slate-400 shrink-0" />
                                <span className="truncate">{visit.assigned_agent.full_name}</span>
                            </Badge>
                        )}
                    </div>
                    
                    {visit.status === 'scheduled' && (
                        <div className="flex items-center gap-2 shrink-0">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="sm" 
                                                disabled={!isPast}
                                                onClick={(e) => { e.stopPropagation(); onMarkNoShow?.(visit) }}
                                                className="h-7 text-[11px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 px-2.5 disabled:opacity-50"
                                            >
                                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                                No Show
                                            </Button>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                disabled={!isPast}
                                                onClick={(e) => { e.stopPropagation(); onMarkComplete?.(visit) }}
                                                className="h-7 text-[11px] font-medium border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 px-3 shadow-sm disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                                Mark Complete
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                    {!isPast && (
                                        <TooltipContent>
                                            <p className="text-xs">You can log the outcome after the visit time has passed.</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}
