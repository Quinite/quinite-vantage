'use client'

import { format } from 'date-fns'
import { Calendar, Clock, User, MoreVertical, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {format(d, 'EEE, d MMM yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(d, 'h:mm a')}
                        {isPast && visit.status === 'scheduled' && (
                            <span className="text-amber-600 font-medium ml-1">• Overdue</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <Badge className={cn('text-[11px] font-medium border shadow-none', colors.bg, colors.text, colors.border)}>
                        {VISIT_STATUS_LABELS[visit.status]}
                    </Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {visit.status === 'scheduled' && (
                                <>
                                    <DropdownMenuItem onClick={() => onMarkComplete?.(visit)}>
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                        Mark Completed
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onMarkNoShow?.(visit)}>
                                        <XCircle className="w-3.5 h-3.5 mr-2 text-red-500" />
                                        Mark No Show
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onEdit?.(visit)}>
                                        <Edit2 className="w-3.5 h-3.5 mr-2" />
                                        Edit
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuItem onClick={() => onDelete?.(visit)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Agent */}
            {visit.assigned_agent && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{visit.assigned_agent.full_name}</span>
                </div>
            )}

            {/* Outcome */}
            {visit.outcome && (
                <div className="mt-2">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                        visit.outcome === 'interested'       ? 'bg-emerald-100 text-emerald-700' :
                        visit.outcome === 'not_interested'   ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-700'
                    )}>
                        {OUTCOME_LABELS[visit.outcome]}
                    </span>
                </div>
            )}

            {/* Notes */}
            {visit.visit_notes && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{visit.visit_notes}</p>
            )}

        </div>
    )
}
