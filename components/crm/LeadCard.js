'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone, Mail, AlertTriangle, Clock } from 'lucide-react'
import { getDefaultAvatar } from '@/lib/avatar-utils'
import { useQueryClient } from '@tanstack/react-query'

function relativeTime(ts) {
    if (!ts) return null
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60)  return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24)  return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 30)  return `${d}d ago`
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function LeadCard({ lead }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: lead.id, data: { ...lead, type: 'Lead' } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const queryClient = useQueryClient()

    const prefetchLeadData = () => {
        if (!lead.id) return
        queryClient.prefetchQuery({
            queryKey: ['lead', lead.id],
            queryFn: () => fetch(`/api/leads/${lead.id}`).then(res => res.json()).then(d => d.lead),
            staleTime: 5 * 60 * 1000
        })
    }

    const handleClick = (e) => {
        if (!isDragging && lead.onClick) {
            lead.onClick(lead)
        }
    }

    const lastCalled = relativeTime(lead.last_contacted_at)
    const hasCallbackPending = lead.waiting_status === 'callback_scheduled'

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onMouseEnter={prefetchLeadData}
            onClickCapture={handleClick}
            className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all shadow-sm border-border bg-card group
                ${lead.abuse_flag ? 'border-l-2 border-l-red-400' : hasCallbackPending ? 'border-l-2 border-l-amber-400' : ''}
                ${isDragging ? 'shadow-xl border-primary/50 ring-2 ring-primary z-50 rotate-2 cursor-grabbing' : ''}`}
        >
            <CardContent className="p-4 space-y-3">
                {/* Abuse warning — shown at top, agent must see before calling */}
                {lead.abuse_flag && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="text-[10px] font-bold text-red-600">Do Not Call — Abusive</span>
                    </div>
                )}

                {/* Callback reminder */}
                {!lead.abuse_flag && hasCallbackPending && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="text-[10px] font-bold text-amber-700">Callback Scheduled</span>
                    </div>
                )}

                {/* Header with Avatar */}
                <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                        <AvatarImage src={lead.avatar_url || getDefaultAvatar(lead.email || lead.name)} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                            {lead.name ? lead.name.substring(0, 2).toUpperCase() : 'NA'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors" title={lead.name}>
                            {lead.name}
                        </h4>
                        {lead.project && (
                            <Badge variant="secondary" className="text-[10px] font-normal text-muted-foreground bg-muted/50 border-0 h-4 px-1.5 mt-1">
                                {lead.project.name}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                    {lead.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 opacity-70 shrink-0" />
                            <span className="truncate">{lead.phone}</span>
                        </div>
                    )}
                    {lead.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 opacity-70 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                        </div>
                    )}
                </div>

                {/* Footer: source / score / calls / last-called */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Badge
                            variant="outline"
                            className="text-[9px] h-5 px-2 font-medium text-muted-foreground bg-muted/20 border-border shrink-0"
                        >
                            {lead.source || 'Manual'}
                        </Badge>
                        {/* Total calls + last contacted */}
                        {lead.total_calls > 0 && (
                            <span className="text-[9px] text-muted-foreground shrink-0">
                                {lead.total_calls}× {lastCalled ? `· ${lastCalled}` : ''}
                            </span>
                        )}
                    </div>

                    {/* AI badges */}
                    {(lead.score > 0 || lead.interest_level) && (
                        <div className="flex items-center gap-1 shrink-0">
                            {lead.interest_level === 'high' && (
                                <span title="High Interest" className="text-xs animate-pulse">🔥</span>
                            )}
                            {lead.score > 0 && (
                                <Badge variant="secondary" className={`h-5 text-[9px] px-1.5 border-0 ${
                                    lead.score >= 80 ? 'bg-green-100 text-green-700' :
                                    lead.score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {lead.score}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
