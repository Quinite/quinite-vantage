'use client'

import { format } from 'date-fns'
import { Calendar, Clock, User, Phone, MapPin, Building, Home, CheckCircle2, XCircle } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { VISIT_STATUS_COLORS, VISIT_STATUS_LABELS, OUTCOME_LABELS } from '@/lib/site-visit-stages'
import { useRouter } from 'next/navigation'
import { getDefaultAvatar } from '@/lib/avatar-utils'

import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'

export default function SiteVisitsTable({ visits, sortBy = 'date_asc', onSortChange }) {
    const router = useRouter()

    const SortHeader = ({ label, field, className }) => {
        const isActive = sortBy.startsWith(field)
        const isDesc = sortBy.endsWith('desc')
        
        return (
            <TableHead 
                className={cn(
                    "font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-primary transition-colors select-none group/header",
                    isActive && "text-primary bg-primary/5",
                    className
                )}
                onClick={() => {
                    if (!onSortChange) return
                    if (isActive) {
                        onSortChange(isDesc ? `${field}_asc` : `${field}_desc`)
                    } else {
                        onSortChange(`${field}_desc`)
                    }
                }}
            >
                <div className="flex items-center gap-1.5">
                    {label}
                    <div className="flex flex-col">
                        {isActive ? (
                            isDesc ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                        ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover/header:opacity-50 transition-opacity" />
                        )}
                    </div>
                </div>
            </TableHead>
        )
    }

    if (!visits || visits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                <MapPin className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">No site visits found.</p>
                <p className="text-xs">Adjust your date range or filters.</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30">
                        <SortHeader label="Date & Time" field="date" />
                        <SortHeader label="Lead Details" field="name" />
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Location</TableHead>
                        <SortHeader label="Status" field="status" />
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Outcome</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Assigned Agent</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Notes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {visits.map(visit => {
                        const d = new Date(visit.scheduled_at)
                        const colors = VISIT_STATUS_COLORS[visit.status] ?? VISIT_STATUS_COLORS.scheduled
                        const isPast = d < new Date() && visit.status === 'scheduled'

                        return (
                            <TableRow 
                                key={visit.id}
                                className="group cursor-pointer hover:bg-muted/40 transition-colors"
                                onClick={() => router.push(`/dashboard/admin/crm/leads/${visit.lead_id}`)}
                            >
                                <TableCell className="whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            {format(d, 'MMM d, yyyy')}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3.5 h-3.5" />
                                            {format(d, 'h:mm a')}
                                            {isPast && <span className="text-amber-600 font-medium ml-1 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />Overdue</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="h-8 w-8 shrink-0 border border-slate-100">
                                            <AvatarImage src={visit.leads?.avatar_url || getDefaultAvatar(visit.leads?.email || visit.leads?.name)} />
                                            <AvatarFallback className="text-[10px] font-bold">
                                                {visit.leads?.name?.charAt(0) || 'L'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                                {visit.leads?.name || 'Unknown Lead'}
                                            </span>
                                            {visit.leads?.phone && (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                    <Phone className="w-3 h-3" />
                                                    {visit.leads.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {(visit.projects?.name || visit.units?.unit_number) ? (
                                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                                            {visit.projects?.name && (
                                                <span className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                                    <Building className="w-3.5 h-3.5 text-slate-400" />
                                                    {visit.projects.name}
                                                </span>
                                            )}
                                            {visit.units?.unit_number && (
                                                <span className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                                    <Home className="w-3.5 h-3.5 text-slate-400" />
                                                    Unit {visit.units.unit_number}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Not specified</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn('text-[11px] font-medium border shadow-none whitespace-nowrap', colors.bg, colors.text, colors.border)}>
                                        {VISIT_STATUS_LABELS[visit.status] || visit.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {visit.outcome ? (
                                        <Badge variant="outline" className={cn(
                                            'text-[10px] h-5 px-1.5 whitespace-nowrap',
                                            visit.outcome === 'interested' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            visit.outcome === 'not_interested' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                            'bg-slate-50 text-slate-700 border-slate-200'
                                        )}>
                                            {OUTCOME_LABELS?.[visit.outcome] || visit.outcome}
                                        </Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground opacity-50">—</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {visit.assigned_agent ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6 border shadow-sm">
                                                <AvatarImage src={visit.assigned_agent.avatar_url} />
                                                <AvatarFallback className="text-[9px] font-bold">
                                                    {visit.assigned_agent.full_name?.charAt(0) || 'A'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm text-muted-foreground font-medium">
                                                {visit.assigned_agent.full_name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                    )}
                                </TableCell>
                                <TableCell className="max-w-[200px]">
                                    <div className="text-xs text-muted-foreground truncate" title={visit.visit_notes || ''}>
                                        {visit.visit_notes || <span className="opacity-50">—</span>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
