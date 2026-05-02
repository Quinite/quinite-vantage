'use client'

import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Phone, AlertTriangle, Clock, Flame, Timer, Zap, Snowflake, PhoneMissed } from 'lucide-react'
import { getDefaultAvatar } from '@/lib/avatar-utils'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

function getScoreStyle(score) {
    if (score >= 70) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
}



function LeadCardInner({ lead }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead.id, data: { ...lead, type: 'Lead' } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms ease',
        opacity: isDragging ? 0.45 : 1,
        filter: isDragging ? 'blur(0px)' : undefined,
        pointerEvents: isDragging ? 'none' : undefined,
        zIndex: isDragging ? 999 : undefined,
    }

    const queryClient = useQueryClient()

    const prefetchLeadData = () => {
        if (!lead.id) return
        queryClient.prefetchQuery({
            queryKey: ['lead', lead.id],
            queryFn: () => fetch(`/api/leads/${lead.id}`).then(r => r.json()).then(d => d.lead),
            staleTime: 5 * 60 * 1000,
        })
    }

    const handleClick = () => {
        if (!isDragging && lead.onClick) lead.onClick(lead)
    }

    const upcomingVisit = lead.upcomingVisit ?? null

    const hasCallbackPending = lead.waiting_status === 'callback_scheduled'
    const isStale = lead.stage?.stale_days && lead.days_in_current_stage >= lead.stage.stale_days
    const daysLabel = lead.days_in_current_stage > 0 ? `${lead.days_in_current_stage}d` : null

    // Left border priority: abuse > stale > callback
    const borderClass = lead.abuse_flag
        ? 'border-l-[3px] border-l-red-500'
        : isStale
        ? 'border-l-[3px] border-l-amber-400'
        : hasCallbackPending
        ? 'border-l-[3px] border-l-blue-400'
        : ''

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onMouseEnter={prefetchLeadData}
            onClickCapture={handleClick}
            className={`
                group relative bg-card rounded-xl border border-border/60 shadow-sm
                cursor-grab active:cursor-grabbing select-none
                hover:shadow-md hover:border-border transition-all duration-150
                ${borderClass}
            `}
        >
            <div className="p-3 space-y-2.5">
                {/* Abuse / Callback banners */}
                {lead.abuse_flag && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">Do Not Call</span>
                    </div>
                )}
                {!lead.abuse_flag && hasCallbackPending && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                        <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Callback Scheduled</span>
                    </div>
                )}

                {/* Header row: avatar + name + score */}
                <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                        <AvatarImage src={lead.avatar_url || getDefaultAvatar(lead.email || lead.name)} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[11px]">
                            {lead.name?.substring(0, 2).toUpperCase() || 'NA'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">

                            <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                                {lead.name}
                            </p>
                        </div>
                        {lead.project?.name && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lead.project.name}</p>
                        )}
                    </div>
                    {lead.score > 0 && (
                        <Badge className={`shrink-0 text-[10px] font-bold h-5 px-1.5 border-0 rounded-md ${getScoreStyle(lead.score)}`}>
                            {lead.score}
                        </Badge>
                    )}
                </div>

                {/* Phone */}
                {lead.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Phone className="w-3 h-3 shrink-0 opacity-60" />
                        <span className="truncate">{lead.phone}</span>
                    </div>
                )}

                {/* Upcoming site visit pill */}
                {upcomingVisit && (
                    <div className="rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-2 py-1.5 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-violet-500 shrink-0" />
                            <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                                {format(new Date(upcomingVisit.scheduled_at), 'EEE, d MMM · h:mm a')}
                            </span>
                        </div>
                        {upcomingVisit.assigned_agent?.full_name && (
                            <p className="text-[9px] text-violet-500 dark:text-violet-400 pl-4 truncate">
                                with {upcomingVisit.assigned_agent.full_name}
                            </p>
                        )}
                    </div>
                )}

                {/* Footer: tags + metadata row */}
                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {lead.source && (
                            <span className="text-[9px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 shrink-0">
                                {lead.source}
                            </span>
                        )}
                        {lead.total_calls > 0 && (
                            <span className="text-[9px] text-muted-foreground shrink-0">
                                {lead.total_calls}× called
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Stale timer */}
                        {isStale && daysLabel && (
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                                <Timer className="w-2.5 h-2.5" />
                                {daysLabel}
                            </span>
                        )}
                        {/* Days in stage (non-stale) */}
                        {!isStale && daysLabel && (
                            <span className="text-[9px] text-muted-foreground">{daysLabel}</span>
                        )}
                        {/* Assigned agent */}
                        {lead.assigned_to_user && (
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Avatar className="h-5 w-5 border border-border/50 cursor-default bg-secondary">
                                            <AvatarFallback className="text-[8px] font-bold text-secondary-foreground bg-secondary">
                                                {lead.assigned_to_user.full_name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                        {lead.assigned_to_user.full_name || lead.assigned_to_user.email}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {lead.interest_level === 'high' && (
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Flame className="w-3 h-3 text-orange-500 shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                        High Interest
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {lead.interest_level === 'medium' && (
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                        Medium Interest
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {lead.interest_level === 'low' && (
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Snowflake className="w-3 h-3 text-blue-300 shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                        Low Interest
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {lead.call_failed_at && (
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                                            <PhoneMissed className="w-2.5 h-2.5" />
                                            Call Failed
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                        All call attempts exhausted
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export const LeadCard = memo(LeadCardInner, (prev, next) => {
    return (
        prev.lead.id === next.lead.id &&
        prev.lead.stage_id === next.lead.stage_id &&
        prev.lead.score === next.lead.score &&
        prev.lead.interest_level === next.lead.interest_level &&
        prev.lead.days_in_current_stage === next.lead.days_in_current_stage &&
        prev.lead.assigned_to === next.lead.assigned_to &&
        prev.lead.upcomingVisit?.id === next.lead.upcomingVisit?.id &&
        prev.lead.call_failed_at === next.lead.call_failed_at
    )
})
LeadCard.displayName = 'LeadCard'
