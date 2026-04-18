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
    Clock,
    CalendarClock,
    User,
    Pencil,
    Check,
    X,
    FileText,
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
    high:   { label: 'High',   dot: 'bg-red-500',    text: 'text-red-600',   badge: 'bg-red-50 text-red-700 border-red-200' },
    medium: { label: 'Medium', dot: 'bg-amber-400',  text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    low:    { label: 'Low',    dot: 'bg-blue-400',   text: 'text-blue-600',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
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

function AssigneeAvatar({ assignee, size = 'sm' }) {
    if (!assignee) return null
    const initials = (assignee.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const cls = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-8 h-8 text-xs'
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={`${cls} rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white cursor-default`}>
                    {assignee.avatar_url
                        ? <img src={assignee.avatar_url} alt={assignee.full_name} className="w-full h-full object-cover" />
                        : initials
                    }
                </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
                {assignee.full_name || 'Assigned'}
            </TooltipContent>
        </Tooltip>
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
                                        <AssigneeAvatar assignee={task.assignee} />
                                        <span className="text-sm">{task.assignee.full_name}</span>
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
    const [filter, setFilter]           = useState('all')
    const [createOpen, setCreateOpen]   = useState(false)
    const [detailTask, setDetailTask]   = useState(null)
    const [submitting, setSubmitting]   = useState(false)
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
    }, [canViewLeads, filter])

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
            const params = new URLSearchParams()
            if (filter === 'completed') params.set('status', 'completed')
            else if (filter !== 'all') params.set('status', 'pending')
            const res = await fetch(`/api/tasks?${params}`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setTasks(data.tasks || [])
        } catch {
            toast.error('Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    const getFiltered = () =>
        tasks.filter(t => {
            if (filter === 'overdue')
                return t.status === 'pending' && t.due_date &&
                    isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
            if (filter === 'today')
                return t.status === 'pending' && t.due_date && isToday(parseISO(t.due_date))
            if (filter === 'upcoming')
                return t.status === 'pending' && t.due_date &&
                    isFuture(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
            if (filter === 'no_date')
                return t.status === 'pending' && !t.due_date
            if (filter === 'completed') return t.status === 'completed'
            return true
        })

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

    const overdueCount = tasks.filter(t =>
        t.status === 'pending' && t.due_date &&
        isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
    ).length

    const todayCount = tasks.filter(t =>
        t.status === 'pending' && t.due_date && isToday(parseISO(t.due_date))
    ).length

    const pendingCount = tasks.filter(t => t.status === 'pending').length

    const TABS = [
        { key: 'all',       label: 'All' },
        { key: 'overdue',   label: 'Overdue',   count: overdueCount, urgent: true },
        { key: 'today',     label: 'Today',     count: todayCount },
        { key: 'upcoming',  label: 'Upcoming' },
        { key: 'no_date',   label: 'No Date' },
        { key: 'completed', label: 'Completed' },
    ]

    const EMPTY_MSGS = {
        overdue:   { title: 'All clear', sub: 'No overdue tasks' },
        today:     { title: 'Nothing due today', sub: 'Enjoy your day!' },
        upcoming:  { title: 'No upcoming tasks', sub: 'Schedule for later' },
        no_date:   { title: 'No undated tasks' },
        completed: { title: 'No completed tasks' },
        all:       { title: 'No tasks yet', sub: 'Create your first task to get started' },
    }

    if (permLoading || (loading && tasks.length === 0)) {
        return (
            <div className="flex-1 space-y-5 p-8 pt-6">
                <Skeleton className="h-9 w-40" />
                <div className="flex gap-2">
                    {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
                </div>
                <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[68px] w-full rounded-xl" />)}
                </div>
            </div>
        )
    }

    const filtered = getFiltered()

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex-1 space-y-5 p-8 pt-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {pendingCount} pending{pendingCount !== 1 ? '' : ''}
                            {overdueCount > 0 && (
                                <span className="ml-2 text-red-600 font-medium">· {overdueCount} overdue</span>
                            )}
                        </p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
                        <Plus className="w-4 h-4" /> Add Task
                    </Button>
                </div>

                {/* Filter pills */}
                <div className="flex gap-1.5 flex-wrap">
                    {TABS.map(({ key, label, count, urgent }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`
                                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                                transition-all duration-150 border
                                ${filter === key
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                                }
                            `}
                        >
                            {label}
                            {count > 0 && (
                                <span className={`
                                    px-1.5 rounded-full text-[10px] font-bold leading-4
                                    ${filter === key
                                        ? 'bg-background/20 text-background'
                                        : urgent ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-700'
                                    }
                                `}>
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-14 text-center">
                            <CheckCircle2 className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
                            <p className="font-medium text-sm">{EMPTY_MSGS[filter]?.title}</p>
                            {EMPTY_MSGS[filter]?.sub && (
                                <p className="text-xs text-muted-foreground mt-1">{EMPTY_MSGS[filter].sub}</p>
                            )}
                            {filter === 'all' && (
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create first task
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(task => {
                            const isOverdue   = getIsOverdue(task)
                            const isCompleted = task.status === 'completed'
                            const pCfg        = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                            const stageColor  = task.lead?.stage?.color || '#94a3b8'
                            const leadInitial = (task.lead?.name || '?')[0].toUpperCase()

                            return (
                                <div
                                    key={task.id}
                                    className={[
                                        'group rounded-xl border bg-background transition-all duration-150 cursor-pointer',
                                        isOverdue && !isCompleted
                                            ? 'border-red-200 bg-red-50/20'
                                            : isCompleted
                                                ? 'border-border/40 opacity-60'
                                                : 'border-border hover:border-border/80 hover:shadow-sm',
                                    ].join(' ')}
                                    onClick={() => setDetailTask(task)}
                                >
                                    {/* Top row — checkbox · title */}
                                    <div className="flex items-start gap-2.5 px-3 pt-3 pb-1">
                                        <div onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleToggle(task)}
                                                className={cn(
                                                    "mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                                                    isCompleted
                                                        ? "bg-indigo-600 border-indigo-600"
                                                        : "border-gray-200 hover:border-indigo-500 text-transparent hover:text-indigo-500"
                                                )}
                                            >
                                                <CheckCircle2 className={cn("w-3.5 h-3.5", isCompleted ? "text-white" : "opacity-0 hover:opacity-100")} />
                                            </button>
                                        </div>
                                        <p className={`flex-1 min-w-0 text-sm font-medium leading-snug ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                            {task.title}
                                        </p>
                                    </div>

                                    {/* Description */}
                                    {task.description && !isCompleted && (
                                        <p className="text-xs text-muted-foreground px-3 pb-1 pl-[calc(0.75rem+1.25rem+0.625rem)] line-clamp-1">
                                            {task.description}
                                        </p>
                                    )}

                                    {/* Footer — left: date  ·  right: lead + priority + assignee */}
                                    <div className="flex items-center justify-between px-3 pb-2.5 pt-1 pl-[calc(0.75rem+1.25rem+0.625rem)]">
                                        {/* Left: date */}
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {!isCompleted && <DueDateBadge task={task} />}
                                            {isCompleted && task.completed_at && (
                                                <span className="text-[11px] text-muted-foreground">
                                                    Done {format(parseISO(task.completed_at), 'MMM d')}
                                                </span>
                                            )}
                                            {!isCompleted && !task.due_date && (
                                                <span className="text-[11px] text-muted-foreground/50">No due date</span>
                                            )}
                                        </div>

                                        {/* Right: lead · priority · assignee */}
                                        <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                                            {/* Lead pill */}
                                            {task.lead && (
                                                <LeadHoverCard lead={task.lead} leadId={task.lead_id}>
                                                    <button className="inline-flex items-center gap-1 max-w-[120px] rounded-full border border-border bg-muted/50 px-1.5 py-0.5 hover:bg-muted transition-colors">
                                                        <span
                                                            className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center text-white text-[7px] font-bold"
                                                            style={{ background: stageColor }}
                                                        >
                                                            {leadInitial}
                                                        </span>
                                                        <span className="text-[11px] font-medium text-foreground truncate">{task.lead.name}</span>
                                                    </button>
                                                </LeadHoverCard>
                                            )}

                                            <span className="text-border text-[10px]">·</span>

                                            {/* Priority dot + label */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="inline-flex items-center gap-1 cursor-default">
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pCfg.dot}`} />
                                                        <span className={`text-[11px] font-medium ${pCfg.text}`}>{pCfg.label}</span>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-xs">Priority: {pCfg.label}</TooltipContent>
                                            </Tooltip>

                                            {/* Assignee avatar */}
                                            {task.assignee && (
                                                <>
                                                    <span className="text-border text-[10px]">·</span>
                                                    <AssigneeAvatar assignee={task.assignee} />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
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

                        <div className="flex gap-2 pt-1">
                            <Button type="submit" disabled={submitting || !selectedLead} className="flex-1">
                                {submitting ? 'Creating...' : 'Create Task'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}
