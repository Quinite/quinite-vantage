'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    CheckSquare,
    CheckCircle2,
    Calendar,
    Mail,
    Phone,
    Zap,
    ExternalLink,
    Plus,
    AlertTriangle,
    AlertCircle,
    Clock,
    CalendarClock,
    User,
    Pencil,
    Check,
    X,
    FileText,
    ChevronDown,
    Search,
    ListChecks,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
    format,
    isToday,
    isPast,
    isFuture,
    parseISO,
    differenceInDays,
} from 'date-fns'
import { usePermissions } from '@/contexts/PermissionContext'
import { useRouter } from 'next/navigation'
import TaskFormFields, { taskToFormData, formDataToPayload, EMPTY_FORM } from '@/components/crm/TaskFormFields'

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
    high:   { label: 'High',   color: 'red',   icon: AlertCircle, bg: 'bg-red-50',     text: 'text-red-700', border: 'border-red-200' },
    medium: { label: 'Medium', color: 'amber', icon: Clock,       bg: 'bg-amber-50',   text: 'text-amber-700', border: 'border-amber-200' },
    low:    { label: 'Low',    color: 'blue',  icon: Calendar,    bg: 'bg-blue-50',    text: 'text-blue-700', border: 'border-blue-200' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIsOverdue(task) {
    return (
        task.status === 'pending' &&
        task.due_date &&
        isPast(parseISO(task.due_date)) &&
        !isToday(parseISO(task.due_date))
    )
}

function parseDue(due_date) {
    if (!due_date) return null
    const d = parseISO(due_date)
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
    return { d, hasTime }
}

function DueDateLabel({ task, compact = false }) {
    if (!task.due_date) return null
    const parsed = parseDue(task.due_date)
    if (!parsed) return null
    const { d, hasTime } = parsed
    const overdue = getIsOverdue(task)
    const today = isToday(d)
    const days = differenceInDays(d, new Date())
    const dateStr = hasTime ? format(d, 'MMM d, h:mm a') : format(d, 'MMM d, yyyy')

    if (overdue) {
        const daysAgo = Math.abs(differenceInDays(d, new Date()))
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {compact ? '' : (daysAgo === 0 ? 'Overdue' : `${daysAgo}d overdue`)}
                <span className={compact ? '' : 'text-red-400 font-normal'}>{compact ? dateStr : `· ${dateStr}`}</span>
            </span>
        )
    }
    if (today) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                <Clock className="w-3 h-3 shrink-0" />
                {compact ? format(d, hasTime ? 'h:mm a' : 'Today') : 'Due today'}
                {hasTime && !compact && <span className="text-blue-400 font-normal">· {format(d, 'h:mm a')}</span>}
            </span>
        )
    }
    if (days === 1) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                <CalendarClock className="w-3 h-3 shrink-0" />
                {compact ? 'Tomorrow' : 'Due tomorrow'}
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            {dateStr}
        </span>
    )
}

// Compact pill badge for due dates — same design as LeadTasksManager
function DueDateBadge({ task }) {
    if (!task.due_date) return null
    const d = parseISO(task.due_date)
    const overdue = getIsOverdue(task)
    const today   = isToday(d)
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0

    if (overdue) {
        const daysAgo = Math.abs(differenceInDays(d, new Date()))
        const fullDate = hasTime ? format(d, 'MMM d, h:mm a') : format(d, 'MMM d, yyyy')
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 cursor-default">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {daysAgo === 0 ? 'Today' : `${daysAgo}d overdue`}
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{fullDate}</TooltipContent>
            </Tooltip>
        )
    }
    if (today) {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                <Clock className="w-3 h-3 shrink-0" />
                {hasTime ? format(d, 'h:mm a') : 'Today'}
            </span>
        )
    }
    if (differenceInDays(d, new Date()) === 1) {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <CalendarClock className="w-3 h-3 shrink-0" />
                Tomorrow
            </span>
        )
    }
    const label = hasTime ? format(d, 'MMM d · h:mm a') : format(d, 'MMM d')
    return (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 border border-border rounded-full px-2 py-0.5">
            <Calendar className="w-3 h-3 shrink-0" />
            {label}
        </span>
    )
}

function AssigneeBadge({ assignee }) {
    if (!assignee) return null
    const initials = (assignee.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    
    return (
        <div className="flex items-center gap-2 px-1.5 py-0.5 rounded-full border border-slate-100 bg-slate-50/50 group/assignee max-w-full overflow-hidden">
            <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 overflow-hidden text-[8px]">
                {assignee.avatar_url
                    ? <img src={assignee.avatar_url} alt={assignee.full_name} className="w-full h-full object-cover" />
                    : initials
                }
            </div>
            <span className="text-[11px] font-medium text-slate-600 truncate tracking-tight">{assignee.full_name}</span>
        </div>
    )
}

// ─── Refined Task Row ─────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onEditClick }) {
    const isOverdue   = getIsOverdue(task)
    const isCompleted = task.status === 'completed'
    const pCfg        = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
    const stageColor  = task.lead?.stage?.color || '#94a3b8'
    const leadInitial = task.lead?.name?.[0]?.toUpperCase() || '?'

    return (
        <div 
            onClick={() => onEditClick(task)}
            className={cn(
                "group relative bg-white rounded-xl shadow-sm ring-1 ring-slate-100/80 hover:ring-indigo-200 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden",
                isCompleted && "opacity-60 shadow-none ring-slate-50"
            )}
        >
            {/* Priority Full-Height Accent Bar */}
            {!isCompleted && (
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", 
                    task.priority === 'high' ? 'bg-red-500' : 
                    task.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                )} />
            )}

            <div className="flex items-center px-4 py-3 gap-4">
                {/* 1. Checkbox & Title */}
                <div className="flex items-center gap-3 flex-[2] min-w-0">
                    <div onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => onToggle(task)}
                            className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                                isCompleted
                                    ? "bg-indigo-600 border-indigo-600"
                                    : "border-slate-200 hover:border-indigo-500 text-transparent hover:text-indigo-500"
                            )}
                        >
                            <CheckCircle2 className={cn("w-3 h-3", isCompleted ? "text-white" : "opacity-0 hover:opacity-100")} />
                        </button>
                    </div>
                    <div className="min-w-0">
                        <p className={cn(
                            "text-sm font-semibold truncate leading-tight transition-colors",
                            isCompleted ? "line-through text-slate-400" : "text-slate-900 group-hover:text-indigo-600"
                        )}>
                            {task.title}
                        </p>
                        {task.description && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{task.description}</p>
                        )}
                    </div>
                </div>

                {/* 2. Lead Badge (Specifically for global view) */}
                <div className="flex-[1] hidden lg:block" onClick={e => e.stopPropagation()}>
                    {task.lead && (
                        <LeadHoverCard lead={task.lead} leadId={task.lead_id}>
                            <Link 
                                href={`/dashboard/admin/crm/leads/${task.lead_id}`}
                                className="inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded-full border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all group/lead"
                            >
                                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0"
                                     style={{ background: stageColor }}>
                                    {leadInitial}
                                </div>
                                <span className="text-[11px] font-bold truncate tracking-tight">{task.lead.name}</span>
                            </Link>
                        </LeadHoverCard>
                    )}
                </div>

                {/* 3. Priority */}
                <div className="w-24 hidden md:block">
                    {!isCompleted && (
                        <Badge variant="outline" className={cn(
                            "text-[10px] h-5 px-2 font-bold uppercase tracking-wider border-none",
                            pCfg.bg, pCfg.text
                        )}>
                            {pCfg.label}
                        </Badge>
                    )}
                </div>

                {/* 4. Due Date */}
                <div className="w-32">
                    <DueDateBadge task={task} />
                </div>

                {/* 5. Assignee */}
                <div className="w-40 hidden sm:flex">
                    <AssigneeBadge assignee={task.assignee} />
                </div>

                {/* 6. Action Visual */}
                <div className="w-8 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400">
                        <Pencil className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function LeadHoverCard({ lead, leadId, children }) {
    if (!lead) return children
    const initial = (lead.name || '?')[0].toUpperCase()
    const stageColor = lead.stage?.color || '#94a3b8'
    return (
        <HoverCard openDelay={300} closeDelay={100}>
            <HoverCardTrigger asChild>{children}</HoverCardTrigger>
            <HoverCardContent className="w-72 p-4" side="top" align="start">
                <div className="flex items-start gap-3">
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                        style={{ background: stageColor }}
                    >
                        {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{lead.name}</p>
                        {lead.stage && (
                            <span
                                className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{ background: stageColor + '20', color: stageColor, border: `1px solid ${stageColor}40` }}
                            >
                                {lead.stage.name}
                            </span>
                        )}
                        <div className="mt-2 space-y-1">
                            {lead.email && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                    <Mail className="w-3 h-3 shrink-0" />{lead.email}
                                </p>
                            )}
                            {(lead.phone || lead.mobile) && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Phone className="w-3 h-3 shrink-0" />{lead.phone || lead.mobile}
                                </p>
                            )}
                            {lead.interest_level && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                                    <Zap className="w-3 h-3 shrink-0" />{lead.interest_level} interest
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-3 pt-2.5 border-t flex items-center justify-between">
                    {typeof lead.score === 'number' && (
                        <span className="text-xs text-muted-foreground">
                            Score: <span className="font-medium text-foreground">{lead.score}</span>
                        </span>
                    )}
                    <Link
                        href={`/dashboard/admin/crm/leads/${leadId}`}
                        className="ml-auto text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                        View profile <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
            </HoverCardContent>
        </HoverCard>
    )
}

// ─── Task Detail Sheet ────────────────────────────────────────────────────────

function TaskDetailSheet({ task, open, onClose, onToggle, onUpdated, teamMembers, canAssignOthers }) {
    const [editing, setEditing] = useState(false)
    const [saving, setSaving]   = useState(false)
    const [form, setForm] = useState(() => taskToFormData(task))

    // Reset form when task changes
    useEffect(() => {
        if (task) {
            setForm(taskToFormData(task))
            setEditing(false)
        }
    }, [task?.id])

    const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }))

    const handleSave = async () => {
        if (!form.title.trim()) { toast.error('Title is required'); return }
        setSaving(true)
        try {
            const res = await fetch(`/api/leads/${task.lead_id}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formDataToPayload(form)),
            })
            if (!res.ok) throw new Error()
            toast.success('Task updated')
            setEditing(false)
            onUpdated()
        } catch {
            toast.error('Failed to update')
        } finally {
            setSaving(false)
        }
    }

    if (!task) return null
    const isCompleted = task.status === 'completed'
    const isOverdue = getIsOverdue(task)
    const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
    const stageColor = task.lead?.stage?.color || '#94a3b8'
    const leadInitial = task.lead?.name?.[0]?.toUpperCase() || '?'

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col" side="right" hideClose>

                {/* Header row: title/input · actions · close — all on one line */}
                <div className="flex items-center gap-2 px-4 py-3.5 border-b">
                    {/* Title / editable input */}
                    <div className="flex-1 min-w-0">
                        {editing ? (
                            <Input
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                className="h-8 text-sm font-semibold"
                                autoFocus
                            />
                        ) : (
                            <h2 className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                            </h2>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                        {!editing ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => setEditing(true)}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">Edit</TooltipContent>
                            </Tooltip>
                        ) : (
                            <>
                                <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
                                    <Check className="w-3 h-3" />{saving ? 'Saving…' : 'Save'}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground" onClick={() => setEditing(false)}>
                                    Cancel
                                </Button>
                            </>
                        )}

                        {/* Close */}
                        <SheetClose asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                            </Button>
                        </SheetClose>
                    </div>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
                    <SheetTitle className="sr-only">{task.title}</SheetTitle>
                    <SheetDescription className="sr-only">Task details</SheetDescription>
                    <Badge variant="outline" className={`text-[10px] h-4 px-1.5 font-medium ${pCfg.badge}`}>
                        {pCfg.label}
                    </Badge>
                    {isCompleted ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                            Completed
                        </Badge>
                    ) : isOverdue ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-red-50 text-red-700 border-red-200">
                            Overdue
                        </Badge>
                    ) : null}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

                    {editing ? (
                        /* ── Edit mode: render shared form fields ── */
                        <TaskFormFields
                            formData={form}
                            onChange={handleChange}
                            teamMembers={teamMembers}
                            canAssignOthers={canAssignOthers}
                            compact
                        />
                    ) : (
                        <>
                            {/* Description (read) */}
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
                                {task.description ? (
                                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{task.description}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No description</p>
                                )}
                            </div>

                            {/* Due Date + Priority (read) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Due Date</p>
                                    {task.due_date ? (
                                        <DueDateLabel task={task} />
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Not set</span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Priority</p>
                                    <Badge variant="outline" className={`text-xs ${pCfg.badge}`}>{pCfg.label}</Badge>
                                </div>
                            </div>

                            {/* Assignee (read) */}
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Assigned To</p>
                                {task.assignee ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 overflow-hidden ring-1 ring-white">
                                            {task.assignee.avatar_url
                                                ? <img src={task.assignee.avatar_url} alt={task.assignee.full_name} className="w-full h-full object-cover" />
                                                : (task.assignee.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                                            }
                                        </div>
                                        <span className="text-sm font-medium">{task.assignee.full_name}</span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">Unassigned</span>
                                )}
                            </div>
                        </>
                    )}

                    {/* Lead */}
                    {task.lead && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Lead</p>
                            <div className="flex items-center gap-2.5 p-3 rounded-lg border bg-muted/30">
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                                    style={{ background: stageColor }}
                                >
                                    {leadInitial}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{task.lead.name}</p>
                                    {task.lead.stage && (
                                        <span className="text-xs text-muted-foreground">{task.lead.stage.name}</span>
                                    )}
                                </div>
                                <Link
                                    href={`/dashboard/admin/crm/leads/${task.lead_id}`}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Meta */}
                    <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
                        {task.created_at && (
                            <p>Created {format(parseISO(task.created_at), 'MMM d, yyyy')}</p>
                        )}
                        {task.completed_at && (
                            <p>Completed {format(parseISO(task.completed_at), 'MMM d, yyyy · h:mm a')}</p>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TasksPageView() {
    const router = useRouter()
    const { hasAnyPermission, loading: permLoading } = usePermissions()

    const [tasks, setTasks]             = useState([])
    const [loading, setLoading]         = useState(true)
    const [createOpen, setCreateOpen]   = useState(false)
    const [detailTask, setDetailTask]   = useState(null)
    const [submitting, setSubmitting]   = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterPriority, setFilterPriority] = useState('all')
    const [collapsedGroups, setCollapsedGroups] = useState(new Set(['done']))
    const [leadSearch, setLeadSearch]   = useState('')
    const [leadResults, setLeadResults] = useState([])
    const [selectedLead, setSelectedLead] = useState(null)
    const [teamMembers, setTeamMembers] = useState([])
    const [formData, setFormData] = useState(EMPTY_FORM)

    const canViewLeads = !permLoading &&
        hasAnyPermission(['view_own_leads', 'view_team_leads', 'view_all_leads'])
    const canAssignOthers = !permLoading &&
        hasAnyPermission(['view_team_leads', 'view_all_leads'])

    useEffect(() => {
        if (!permLoading && !canViewLeads) {
            toast.error("You don't have permission to view tasks")
            router.replace('/dashboard/admin/crm/dashboard')
        }
    }, [permLoading, canViewLeads])

    useEffect(() => {
        if (canViewLeads) fetchTasks()
    }, [canViewLeads])

    useEffect(() => {
        if (createOpen && canAssignOthers && teamMembers.length === 0) {
            fetch('/api/admin/users')
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d?.users) setTeamMembers(d.users) })
                .catch(() => {})
        }
    }, [createOpen, canAssignOthers])

    useEffect(() => {
        if (!leadSearch || leadSearch.length < 2) { setLeadResults([]); return }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/leads?search=${encodeURIComponent(leadSearch)}&limit=10`)
                if (!res.ok) return
                const data = await res.json()
                setLeadResults(data.leads || [])
            } catch {}
        }, 300)
        return () => clearTimeout(timer)
    }, [leadSearch])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/tasks`) // Fetch all to allow smart client-side grouping
            if (!res.ok) throw new Error()
            const data = await res.json()
            setTasks(data.tasks || [])
        } catch {
            toast.error('Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    // Smart Sorting Engine
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'completed' ? 1 : -1
        const aOver = getIsOverdue(a) && a.status !== 'completed'
        const bOver = getIsOverdue(b) && b.status !== 'completed'
        if (aOver !== bOver) return aOver ? -1 : 1
        if (a.due_date && b.due_date) {
            const dateDiff = parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
            if (dateDiff !== 0) return dateDiff
        } else if (a.due_date || b.due_date) {
            return a.due_date ? -1 : 1
        }
        const pOrder = { high: 0, medium: 1, low: 2 }
        if (a.priority !== b.priority) return pOrder[a.priority] - pOrder[b.priority]
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const filteredTasks = sortedTasks.filter(t => {
        const matchesPriority = filterPriority === 'all' ? true : t.priority === filterPriority
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             t.lead?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                             
        return matchesPriority && matchesSearch
    })

    const toggleGroup = (groupId) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev)
            if (next.has(groupId)) next.delete(groupId)
            else next.add(groupId)
            return next
        })
    }

    // Grouping Categorization
    const groups = [
        { id: 'overdue',  label: 'Overdue',      icon: AlertCircle, color: 'text-red-600',   bg: 'bg-red-50',     tasks: filteredTasks.filter(t => t.status !== 'completed' && getIsOverdue(t)) },
        { id: 'today',    label: 'Due Today',    icon: Clock,       color: 'text-indigo-600',bg: 'bg-indigo-50',  tasks: filteredTasks.filter(t => t.status !== 'completed' && !getIsOverdue(t) && t.due_date && isToday(parseISO(t.due_date))) },
        { id: 'upcoming', label: 'Upcoming',     icon: Calendar,    color: 'text-slate-600', bg: 'bg-slate-50',   tasks: filteredTasks.filter(t => t.status !== 'completed' && !getIsOverdue(t) && t.due_date && !isToday(parseISO(t.due_date))) },
        { id: 'later',    label: 'No Due Date',  icon: ListChecks,  color: 'text-slate-400', bg: 'bg-slate-100/50',tasks: filteredTasks.filter(t => t.status !== 'completed' && !t.due_date) },
        { id: 'done',     label: 'Completed',    icon: CheckCircle2,color: 'text-emerald-600',bg: 'bg-emerald-50', tasks: filteredTasks.filter(t => t.status === 'completed') }
    ]

    const handleToggle = async (task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
        try {
            const res = await fetch(`/api/leads/${task.lead_id}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) throw new Error()
            toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened')
            fetchTasks()
        } catch {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
            toast.error('Failed to update task')
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!selectedLead) { toast.error('Select a lead first'); return }
        try {
            setSubmitting(true)
            const res = await fetch(`/api/leads/${selectedLead.id}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formDataToPayload(formData)),
            })
            if (!res.ok) throw new Error()
            toast.success('Task created')
            setCreateOpen(false)
            resetForm()
            fetchTasks()
        } catch {
            toast.error('Failed to create task')
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setSelectedLead(null)
        setLeadSearch('')
        setLeadResults([])
        setFormData(EMPTY_FORM)
    }

    const overdueCount = tasks.filter(t => t.status !== 'completed' && getIsOverdue(t)).length
    const pendingCount = tasks.filter(t => t.status !== 'completed').length
    const highPriorityCount = tasks.filter(t => t.status !== 'completed' && t.priority === 'high').length
    const completedCount = tasks.filter(t => t.status === 'completed').length

    if (permLoading || (loading && tasks.length === 0)) {
        return (
            <div className="flex-1 space-y-6 p-8 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
            </div>
        )
    }


    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex-1 space-y-6 p-8 pt-6 min-h-0 overflow-y-auto bg-slate-50/30">
                {/* Header Analytics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Pending', value: pendingCount, icon: Clock, color: 'blue' },
                        { label: 'Overdue', value: overdueCount, icon: AlertCircle, color: 'red' },
                        { label: 'High Priority', value: highPriorityCount, icon: Zap, color: 'rose' },
                        { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'emerald' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <Card key={label} className="border-0 shadow-sm ring-1 ring-gray-100 bg-white">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={cn("p-2.5 rounded-xl", 
                                    color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                                    color === 'red' ? 'bg-red-50 text-red-600' : 
                                    color === 'rose' ? 'bg-rose-50 text-rose-600' :
                                    'bg-emerald-50 text-emerald-600'
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{label}</p>
                                    <p className={cn(
                                        "text-base font-black mt-0.5",
                                        label === 'Overdue' && value > 0 ? 'text-red-600' : 'text-gray-900'
                                    )}>{value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filter & Action Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 rounded-xl shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <div className="relative flex-1 max-w-sm group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <Input 
                                placeholder="Search tasks or lead name..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs border-slate-100 bg-slate-50/50 rounded-lg focus-visible:ring-indigo-500/20 transition-all focus-visible:bg-white"
                            />
                        </div>
                        <div className="h-6 w-[1px] bg-slate-100 mx-1 hidden sm:block" />
                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                            <SelectTrigger className="w-[140px] h-9 border-slate-100 bg-slate-50/50 rounded-lg text-xs font-semibold focus:ring-indigo-500/20">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-slate-400" />
                                    <SelectValue placeholder="Priority" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="high">High Priority</SelectItem>
                                <SelectItem value="medium">Medium Priority</SelectItem>
                                <SelectItem value="low">Low Priority</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <Button onClick={() => setCreateOpen(true)} size="sm" className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 font-bold shadow-md transition-all active:scale-95 shrink-0">
                        <Plus className="w-4 h-4" /> Add Task
                    </Button>
                </div>

                {/* Task Content Area */}
                <div className="space-y-8">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-200" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">No tasks found</h4>
                            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Try adjusting your filters or search query.</p>
                        </div>
                    ) : (
                        groups.filter(g => g.tasks.length > 0).map(group => {
                            const isCollapsed = collapsedGroups.has(group.id)
                            return (
                                <div key={group.id} className="space-y-4">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button 
                                                onClick={() => toggleGroup(group.id)}
                                                className="flex items-center gap-2.5 px-1 w-full group/header focus:outline-none"
                                            >
                                                <div className={cn("p-1.5 rounded-lg transition-colors", group.bg)}>
                                                    <group.icon className={cn("w-4 h-4", group.color)} />
                                                </div>
                                                <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-500 group-hover/header:text-slate-900 transition-colors">
                                                    {group.label} 
                                                    <span className="ml-2 font-medium text-slate-400">({group.tasks.length})</span>
                                                </h3>
                                                <div className="h-px bg-slate-100 flex-1 ml-2" />
                                                <ChevronDown className={cn(
                                                    "w-4 h-4 text-slate-300 transition-transform duration-300",
                                                    isCollapsed ? "-rotate-90" : "rotate-0"
                                                )} />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-[10px] font-bold uppercase tracking-wider py-1 px-2 border-slate-200">
                                            {isCollapsed ? 'Expand Group' : 'Collapse Group'}
                                        </TooltipContent>
                                    </Tooltip>
                                    
                                    {!isCollapsed && (
                                        <div className="grid grid-cols-1 gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {group.tasks.map(task => (
                                                <TaskRow 
                                                    key={task.id} 
                                                    task={task} 
                                                    onToggle={handleToggle}
                                                    onEditClick={setDetailTask}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ─── Task Detail Sheet ──────────────────────────────────── */}
            <TaskDetailSheet
                task={detailTask}
                open={!!detailTask}
                onClose={() => setDetailTask(null)}
                onToggle={handleToggle}
                onUpdated={() => { fetchTasks(); setDetailTask(null) }}
                teamMembers={teamMembers}
                canAssignOthers={canAssignOthers}
            />

            {/* ─── Create Task Dialog ─────────────────────────────────── */}
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Task</DialogTitle>
                        <DialogDescription>Select a lead, fill in the details.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-4">
                        {/* Lead */}
                        <div className="space-y-1.5">
                            <Label>Lead <span className="text-red-500">*</span></Label>
                            {selectedLead ? (
                                <div className="flex items-center justify-between px-3 py-2 rounded-lg border bg-blue-50 border-blue-200">
                                    <span className="text-sm font-medium text-blue-700">{selectedLead.name}</span>
                                    <button type="button" onClick={resetForm} className="text-xs text-blue-500 hover:text-blue-700">Change</button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        placeholder="Search leads..."
                                        value={leadSearch}
                                        onChange={e => setLeadSearch(e.target.value)}
                                        autoComplete="off"
                                    />
                                    {leadResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-20 mt-1 border rounded-lg shadow-lg bg-popover divide-y max-h-44 overflow-y-auto">
                                            {leadResults.map(lead => (
                                                <button
                                                    key={lead.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedLead({ id: lead.id, name: lead.name || 'Unknown' })
                                                        setLeadSearch('')
                                                        setLeadResults([])
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                                                >
                                                    {lead.name || 'Unknown'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <TaskFormFields
                            formData={formData}
                            onChange={(field, value) => setFormData(f => ({ ...f, [field]: value }))}
                            teamMembers={teamMembers}
                            canAssignOthers={canAssignOthers}
                        />

                        <div className="flex items-center justify-end gap-3 pt-6 border-t mt-4">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setCreateOpen(false)}
                                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={submitting || !selectedLead} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 px-6 font-semibold"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Task'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}
