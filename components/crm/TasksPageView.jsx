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
    DialogFooter,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
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
    Pencil,
    Check,
    X,
    ChevronDown,
    Search,
    ListChecks,
    Trash2,
    Building2,
    User,
    Loader2,
    MapPin,
    Star,
    LayoutList,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Filter,
    SlidersHorizontal,
    X as XIcon,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { isToday, isPast, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isSameWeek, startOfDay, endOfDay } from 'date-fns'
import { usePermissions } from '@/contexts/PermissionContext'
import { useRouter } from 'next/navigation'
import TaskFormFields, { taskToFormData, formDataToPayload, EMPTY_FORM } from '@/components/crm/TaskFormFields'
import { formatIndianDateTime, formatIndianDate } from '@/lib/formatDate'

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
    high:   { label: 'High',   bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',   bar: 'bg-red-500' },
    medium: { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-400' },
    low:    { label: 'Low',    bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200',  bar: 'bg-blue-400' },
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

function UserAvatar({ user, size = 6 }) {
    if (!user) return null
    const initials = (user.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return (
        <div className={`w-${size} h-${size} rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 overflow-hidden text-[10px] ring-1 ring-white`}>
            {user.avatar_url
                ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                : initials
            }
        </div>
    )
}

// ─── Due Date Badge ────────────────────────────────────────────────────────────

function DueDateBadge({ task }) {
    if (!task.due_date) return null
    const d = parseISO(task.due_date)
    const overdue = getIsOverdue(task)
    const today   = isToday(d)
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
    const days    = differenceInDays(d, new Date())

    if (overdue) {
        const daysAgo = Math.abs(differenceInDays(d, new Date()))
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 cursor-default">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {daysAgo === 0 ? 'Today' : `${daysAgo}d overdue`}
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{formatIndianDateTime(task.due_date)}</TooltipContent>
            </Tooltip>
        )
    }
    if (today) {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                <Clock className="w-3 h-3 shrink-0" />
                {hasTime ? formatIndianDateTime(task.due_date).split(', ')[1] : 'Today'}
            </span>
        )
    }
    if (days === 1) {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <CalendarClock className="w-3 h-3 shrink-0" />
                Tomorrow
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 border border-border rounded-full px-2 py-0.5">
            <Calendar className="w-3 h-3 shrink-0" />
            {hasTime ? formatIndianDateTime(task.due_date) : formatIndianDate(task.due_date)}
        </span>
    )
}

function AssigneeBadge({ assignee }) {
    if (!assignee) return null
    const initials = (assignee.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return (
        <div className="flex items-center gap-2 px-1.5 py-0.5 rounded-full border border-slate-100 bg-slate-50/50 max-w-full overflow-hidden">
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

// ─── Lead Hover Card ───────────────────────────────────────────────────────────

function LeadHoverCard({ lead, leadId, children }) {
    if (!lead) return children
    const initial = (lead.name || '?')[0].toUpperCase()
    const stageColor = lead.stage?.color || '#94a3b8'
    return (
        <HoverCard openDelay={300} closeDelay={100}>
            <HoverCardTrigger asChild>{children}</HoverCardTrigger>
            <HoverCardContent className="w-[250px] p-0 rounded-xl border border-slate-200/80 shadow-lg overflow-hidden" side="top" align="start">
                {/* Header */}
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white shadow-sm bg-gradient-to-br from-indigo-500 to-violet-600">
                        {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] truncate text-foreground">{lead.name}</p>
                        {lead.stage && (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold px-1.5 py-px rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColor }} />
                                {lead.stage.name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="px-3 py-2 space-y-1.5 border-t border-slate-100">
                    {lead.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-[11px] text-muted-foreground truncate">{lead.email}</span>
                        </div>
                    )}
                    {(lead.phone || lead.mobile) && (
                        <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-[11px] text-muted-foreground">{lead.phone || lead.mobile}</span>
                        </div>
                    )}
                    {lead.interest_level && (
                        <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span className="text-[11px] text-muted-foreground capitalize">{lead.interest_level} interest</span>
                        </div>
                    )}
                    {typeof lead.score === 'number' && (
                        <div className="flex items-center gap-2">
                            <Star className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-[11px] text-muted-foreground">Score: <span className="font-semibold text-foreground">{lead.score}</span></span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50">
                    <Link href={`/dashboard/admin/crm/leads/${leadId}`} className="flex items-center justify-center gap-1.5 w-full px-2 py-1 rounded-md text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                        View Profile <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
            </HoverCardContent>
        </HoverCard>
    )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onEditClick, onDeleteClick, canDelete }) {
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
            {!isCompleted && (
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", pCfg.bar)} />
            )}

            <div className="flex items-center px-4 py-3 gap-4">
                {/* Checkbox + Title */}
                <div className="flex items-center gap-3 flex-[2] min-w-0">
                    <div onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => onToggle(task)}
                            className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 focus:outline-none",
                                isCompleted
                                    ? "bg-indigo-600 border-indigo-600"
                                    : "border-slate-200 hover:border-indigo-500"
                            )}
                        >
                            <CheckCircle2 className={cn("w-3 h-3", isCompleted ? "text-white" : "text-transparent")} />
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

                {/* Lead or Project Badge */}
                <div className="flex-[1] hidden lg:block" onClick={e => e.stopPropagation()}>
                    {task.lead ? (
                        <LeadHoverCard lead={task.lead} leadId={task.lead_id}>
                            <Link
                                href={`/dashboard/admin/crm/leads/${task.lead_id}`}
                                className="inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded-full border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all"
                            >
                                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0" style={{ background: stageColor }}>
                                    {leadInitial}
                                </div>
                                <span className="text-[11px] font-bold truncate tracking-tight">{task.lead.name}</span>
                            </Link>
                        </LeadHoverCard>
                    ) : task.project ? (
                        <span className="inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded-full border border-purple-100 bg-purple-50 text-purple-700">
                            <span className="text-[11px] font-bold truncate">{task.project.name}</span>
                        </span>
                    ) : (
                        <span className="text-[11px] text-muted-foreground italic">Standalone</span>
                    )}
                </div>

                {/* Priority */}
                <div className="w-24 hidden md:block">
                    {!isCompleted && (
                        <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-bold uppercase tracking-wider border-none", pCfg.bg, pCfg.text)}>
                            {pCfg.label}
                        </Badge>
                    )}
                </div>

                {/* Due Date */}
                <div className="w-36">
                    <DueDateBadge task={task} />
                </div>

                {/* Assignee */}
                <div className="w-36 hidden sm:flex">
                    <AssigneeBadge assignee={task.assignee} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div 
                                onClick={() => onEditClick(task)}
                                className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">Edit Task</TooltipContent>
                    </Tooltip>
                    {canDelete && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => onDeleteClick(task)}
                                    className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">Delete Task</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Task Detail Sheet ─────────────────────────────────────────────────────────

function TaskDetailSheet({ task, open, onClose, onToggle, onUpdated, onDelete, teamMembers, canEdit, canDelete, canAssignOthers }) {
    const [editing, setEditing]               = useState(false)
    const [saving, setSaving]                 = useState(false)
    const [confirmDelete, setConfirmDelete]   = useState(false)
    const [deleting, setDeleting]             = useState(false)
    const [form, setForm]                     = useState(() => taskToFormData(task))
    const [selectedLeadLabel, setLeadLabel]   = useState(task?.lead?.name || null)
    const [selectedProjLabel, setProjLabel]   = useState(task?.project?.name || null)

    useEffect(() => {
        if (task) {
            setForm(taskToFormData(task))
            setLeadLabel(task.lead?.name || null)
            setProjLabel(task.project?.name || null)
            setEditing(false)
        }
    }, [task?.id])

    const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }))

    const handleSave = async () => {
        if (!form.title.trim()) { toast.error('Title is required'); return }
        setSaving(true)
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formDataToPayload(form)),
            })
            if (!res.ok) throw new Error()
            toast.success('Task updated')
            setEditing(false)
            onUpdated()
        } catch {
            toast.error('Failed to update task')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Task deleted')
            setConfirmDelete(false)
            onClose()
            onDelete(task.id)
        } catch {
            toast.error('Failed to delete task')
        } finally {
            setDeleting(false)
        }
    }

    if (!task) return null
    const isCompleted = task.status === 'completed'
    const isOverdue   = getIsOverdue(task)
    const pCfg        = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
    const stageColor  = task.lead?.stage?.color || '#94a3b8'
    const leadInitial = task.lead?.name?.[0]?.toUpperCase() || '?'

    const priorityAccent = {
        high:   'bg-red-500',
        medium: 'bg-amber-400',
        low:    'bg-blue-400',
    }[task.priority] || 'bg-slate-300'

    return (
        <>
            <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
                <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0" side="right" hideClose>
                    <SheetTitle className="sr-only">{task.title}</SheetTitle>
                    <SheetDescription className="sr-only">Task details</SheetDescription>

                    {/* Priority accent bar */}
                    <div className={cn("h-1 w-full shrink-0", priorityAccent)} />

                    {/* Header — title + action buttons only */}
                    <div className="px-5 pt-4 pb-3 border-b bg-white">
                        <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <h2 className={cn(
                                    "text-base font-semibold leading-snug",
                                    isCompleted && "line-through text-muted-foreground"
                                )}>
                                    {task.title}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    {isCompleted && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                            <CheckCircle2 className="w-3 h-3" /> Completed
                                        </span>
                                    )}
                                    {isOverdue && !isCompleted && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                                            <AlertTriangle className="w-3 h-3" /> Overdue
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                                {canEdit && !editing && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">Edit</TooltipContent>
                                    </Tooltip>
                                )}
                                {canDelete && !editing && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">Delete</TooltipContent>
                                    </Tooltip>
                                )}
                                <SheetClose asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground ml-1">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </SheetClose>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                        {editing ? (
                            <div className="px-5 py-4 space-y-4">
                                <TaskFormFields
                                    formData={form}
                                    onChange={handleChange}
                                    teamMembers={teamMembers}
                                    canAssignOthers={canAssignOthers}
                                    compact
                                    showLeadProject
                                    selectedLeadLabel={selectedLeadLabel}
                                    selectedProjectLabel={selectedProjLabel}
                                    onLeadChange={(id, name) => { setForm(f => ({ ...f, lead_id: id })); setLeadLabel(name) }}
                                    onProjectChange={(id, name) => { setForm(f => ({ ...f, project_id: id })); setProjLabel(name) }}
                                />
                                {/* Cancel / Save after lead+project fields */}
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <Button variant="outline" size="sm" className="h-8 px-3 bg-white" onClick={() => setEditing(false)} disabled={saving}>
                                        Cancel
                                    </Button>
                                    <Button size="sm" className="h-8 px-3 gap-1.5" onClick={handleSave} disabled={saving}>
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        {saving ? 'Saving…' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {/* Description */}
                                {task.description && (
                                    <div className="px-5 py-4">
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{task.description}</p>
                                    </div>
                                )}

                                {/* Details grid */}
                                <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div>
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Due Date</p>
                                        {task.due_date ? (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className={cn("w-3.5 h-3.5 shrink-0", isOverdue ? "text-red-500" : "text-slate-400")} />
                                                <span className={cn("text-sm font-medium", isOverdue ? "text-red-600" : "text-foreground")}>
                                                    {formatIndianDateTime(task.due_date)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Not set</span>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Priority</p>
                                        <span className={cn("inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md", pCfg.bg, pCfg.text)}>
                                            {pCfg.label}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
                                        <span className={cn(
                                            "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md",
                                            isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                                        )}>
                                            {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                            {isCompleted ? 'Completed' : 'Pending'}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Assigned To</p>
                                        {task.assignee ? (
                                            <div className="flex items-center gap-2">
                                                <UserAvatar user={task.assignee} size={6} />
                                                <span className="text-sm font-medium truncate">{task.assignee.full_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Unassigned</span>
                                        )}
                                    </div>
                                </div>

                                {/* Linked context */}
                                <div className="px-5 py-4">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Linked To</p>
                                    {task.lead ? (
                                        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 overflow-hidden shadow-sm">
                                            <div className="flex items-center gap-3 p-3.5">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md ring-2 ring-white" style={{ background: `linear-gradient(135deg, ${stageColor}, ${stageColor}dd)`, filter: 'saturate(1.3)' }}>
                                                    {leadInitial}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate text-foreground">{task.lead.name}</p>
                                                    {task.lead.stage && (
                                                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-700" style={{ background: stageColor + '25', borderColor: stageColor + '40' }}>
                                                            <span className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ background: stageColor }} />
                                                            {task.lead.stage.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <Link href={`/dashboard/admin/crm/leads/${task.lead_id}`} className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1">
                                                    View <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </div>
                                            {/* Lead details row */}
                                            <div className="px-3.5 pb-3 flex flex-wrap gap-x-4 gap-y-1.5">
                                                {task.lead.email && (
                                                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                        <Mail className="w-3 h-3 text-slate-400" />
                                                        <span className="truncate max-w-[140px]">{task.lead.email}</span>
                                                    </span>
                                                )}
                                                {(task.lead.phone || task.lead.mobile) && (
                                                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                        <Phone className="w-3 h-3 text-slate-400" />
                                                        {task.lead.phone || task.lead.mobile}
                                                    </span>
                                                )}
                                                {typeof task.lead.score === 'number' && (
                                                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                        <Star className="w-3 h-3 text-amber-400" />
                                                        Score: <span className="font-semibold text-foreground">{task.lead.score}</span>
                                                    </span>
                                                )}
                                                {task.lead.interest_level && (
                                                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground capitalize">
                                                        <Zap className="w-3 h-3 text-indigo-400" />
                                                        {task.lead.interest_level}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : task.project ? (
                                        <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/50 overflow-hidden shadow-sm">
                                            <div className="flex items-center gap-3 p-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
                                                    <Building2 className="w-4.5 h-4.5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate text-foreground">{task.project.name}</p>
                                                    {(task.project.city || task.project.address) && (
                                                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                            <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                                                            <span className="truncate">{task.project.city || task.project.address}</span>
                                                        </p>
                                                    )}
                                                </div>
                                                <Link href={`/dashboard/inventory`} className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center gap-1">
                                                    View <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                <ListChecks className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">Standalone Task</p>
                                                <p className="text-[11px] text-slate-400">Not linked to any lead or project</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Audit trail */}
                                <div className="px-5 py-4 bg-slate-50/60">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activity</p>
                                    <div className="space-y-3">
                                        {task.creator && (
                                            <div className="flex items-center gap-2.5">
                                                <UserAvatar user={task.creator} size={6} />
                                                <div>
                                                    <p className="text-xs font-medium text-foreground">{task.creator.full_name}</p>
                                                    <p className="text-[11px] text-muted-foreground">Created · {task.created_at ? formatIndianDateTime(task.created_at) : '—'}</p>
                                                </div>
                                            </div>
                                        )}
                                        {!task.creator && task.created_at && (
                                            <p className="text-xs text-muted-foreground">Created · {formatIndianDateTime(task.created_at)}</p>
                                        )}
                                        {task.updater && task.updated_at && (
                                            <div className="flex items-center gap-2.5">
                                                <UserAvatar user={task.updater} size={6} />
                                                <div>
                                                    <p className="text-xs font-medium text-foreground">{task.updater.full_name}</p>
                                                    <p className="text-[11px] text-muted-foreground">Last updated · {formatIndianDateTime(task.updated_at)}</p>
                                                </div>
                                            </div>
                                        )}
                                        {task.completed_at && (
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-emerald-700">Completed</p>
                                                    <p className="text-[11px] text-muted-foreground">{formatIndianDateTime(task.completed_at)}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer — Mark Complete / Reopen (view mode only) */}
                    {!editing && (
                        <div className="px-5 py-3 border-t bg-white shrink-0">
                            <Button
                                onClick={() => { onToggle(task); if (!isCompleted) onClose() }}
                                variant={isCompleted ? 'outline' : 'default'}
                                className={cn(
                                    "w-full h-9 text-sm font-medium gap-2",
                                    !isCompleted && "bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                )}
                            >
                                {isCompleted
                                    ? <><X className="w-4 h-4" /> Reopen Task</>
                                    : <><CheckCircle2 className="w-4 h-4" /> Mark as Complete</>
                                }
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete Confirm */}
            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{task?.title}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function DayCell({ date, tasks, currentMonth, onTaskClick, onToggle }) {
    const isCurrentMonth = isSameMonth(date, currentMonth)
    const isCurrentDay   = isToday(date)
    const MAX_VISIBLE = 3
    const visible = tasks.slice(0, MAX_VISIBLE)
    const overflow = tasks.length - MAX_VISIBLE
    const [showAll, setShowAll] = useState(false)
    const displayed = showAll ? tasks : visible

    return (
        <div className={cn(
            "min-h-[110px] p-1.5 rounded-xl border transition-colors flex flex-col gap-1",
            isCurrentDay
                ? "bg-indigo-50/80 border-indigo-200 ring-1 ring-indigo-300"
                : isCurrentMonth
                    ? "bg-white border-slate-100 hover:border-slate-200"
                    : "bg-slate-50/40 border-slate-50"
        )}>
            {/* Day number */}
            <div className="flex items-center justify-end px-0.5">
                <span className={cn(
                    "text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full",
                    isCurrentDay   ? "bg-indigo-600 text-white" :
                    isCurrentMonth ? "text-slate-700" : "text-slate-300"
                )}>
                    {format(date, 'd')}
                </span>
            </div>

            {/* Task chips */}
            <div className="flex flex-col gap-0.5 flex-1">
                {displayed.map(task => {
                    const overdue = getIsOverdue(task)
                    const done    = task.status === 'completed'
                    const pCfg    = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                    return (
                        <div
                            key={task.id}
                            onClick={() => onTaskClick(task)}
                            className={cn(
                                "group/chip flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate cursor-pointer transition-all hover:opacity-80 active:scale-95",
                                done    ? "bg-emerald-50 text-emerald-700 line-through opacity-70" :
                                overdue ? "bg-red-50 text-red-700 border border-red-100" :
                                          cn(pCfg.bg, pCfg.text)
                            )}
                        >
                            <button
                                onClick={e => { e.stopPropagation(); onToggle(task) }}
                                className="shrink-0 opacity-0 group-hover/chip:opacity-100 transition-opacity"
                            >
                                {done
                                    ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                    : <div className="w-2.5 h-2.5 rounded-full border border-current" />
                                }
                            </button>
                            <span className="truncate leading-tight">{task.title}</span>
                        </div>
                    )
                })}
                {!showAll && overflow > 0 && (
                    <button
                        onClick={e => { e.stopPropagation(); setShowAll(true) }}
                        className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 px-1.5 text-left transition-colors"
                    >
                        +{overflow} more
                    </button>
                )}
                {showAll && overflow > 0 && (
                    <button
                        onClick={e => { e.stopPropagation(); setShowAll(false) }}
                        className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 px-1.5 text-left transition-colors"
                    >
                        Show less
                    </button>
                )}
            </div>
        </div>
    )
}

const CAL_GRANULARITIES = [
    { id: 'month', label: 'Month' },
    { id: 'week',  label: 'Week'  },
    { id: 'day',   label: 'Day'   },
]
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function WeekTaskCard({ task, onTaskClick, onToggle }) {
    const overdue = getIsOverdue(task)
    const done    = task.status === 'completed'
    const pCfg    = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
    return (
        <div
            onClick={() => onTaskClick(task)}
            className={cn(
                "group/wc flex items-start gap-1.5 p-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all hover:opacity-90 border",
                done    ? "bg-emerald-50 text-emerald-700 border-emerald-100 line-through opacity-70" :
                overdue ? "bg-red-50 text-red-700 border-red-100" :
                          cn(pCfg.bg, pCfg.text, pCfg.border)
            )}
        >
            <button
                onClick={e => { e.stopPropagation(); onToggle(task) }}
                className="shrink-0 mt-px opacity-0 group-hover/wc:opacity-100 transition-opacity"
            >
                {done
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    : <div className="w-3 h-3 rounded-full border border-current" />
                }
            </button>
            <span className="truncate leading-tight flex-1">{task.title}</span>
            {task.due_time && (
                <span className="shrink-0 text-[9px] opacity-60 font-normal">{task.due_time}</span>
            )}
        </div>
    )
}

function TaskCalendarView({ tasks, onTaskClick, onToggle }) {
    const [granularity, setGranularity] = useState('month')
    const [anchor, setAnchor]           = useState(new Date())

    function getTasksForDay(day) {
        return tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), day))
    }

    // ── Navigation helpers ──────────────────────────────────────────────────────
    function navPrev() {
        if (granularity === 'month') setAnchor(d => subMonths(d, 1))
        else if (granularity === 'week') setAnchor(d => subWeeks(d, 1))
        else setAnchor(d => subDays(d, 1))
    }
    function navNext() {
        if (granularity === 'month') setAnchor(d => addMonths(d, 1))
        else if (granularity === 'week') setAnchor(d => addWeeks(d, 1))
        else setAnchor(d => addDays(d, 1))
    }
    function isAnchorToday() {
        if (granularity === 'month') return isSameMonth(anchor, new Date())
        if (granularity === 'week')  return isSameWeek(anchor, new Date(), { weekStartsOn: 1 })
        return isToday(anchor)
    }
    function getTitle() {
        if (granularity === 'month') return format(anchor, 'MMMM yyyy')
        if (granularity === 'week') {
            const ws = startOfWeek(anchor, { weekStartsOn: 1 })
            const we = endOfWeek(anchor,   { weekStartsOn: 1 })
            return isSameMonth(ws, we)
                ? `${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}`
                : `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`
        }
        return format(anchor, 'EEEE, MMMM d, yyyy')
    }

    // ── Month grid ──────────────────────────────────────────────────────────────
    function MonthGrid() {
        const monthStart = startOfMonth(anchor)
        const monthEnd   = endOfMonth(anchor)
        const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 })
        const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 })
        const days       = eachDayOfInterval({ start: calStart, end: calEnd })
        return (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-100">
                    {WEEKDAYS_SHORT.map(d => (
                        <div key={d} className="py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-slate-100 p-0.5">
                    {days.map(day => (
                        <DayCell
                            key={day.toISOString()}
                            date={day}
                            tasks={getTasksForDay(day)}
                            currentMonth={anchor}
                            onTaskClick={onTaskClick}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // ── Week grid ───────────────────────────────────────────────────────────────
    function WeekGrid() {
        const ws   = startOfWeek(anchor, { weekStartsOn: 1 })
        const days = eachDayOfInterval({ start: ws, end: addDays(ws, 6) })
        return (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-100">
                    {days.map(day => {
                        const today = isToday(day)
                        return (
                            <div key={day.toISOString()} className={cn(
                                "py-2.5 text-center border-r last:border-0 border-slate-100",
                                today && "bg-indigo-50/60"
                            )}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{format(day, 'EEE')}</p>
                                <span className={cn(
                                    "mt-0.5 text-sm font-black inline-flex items-center justify-center w-7 h-7 rounded-full mx-auto",
                                    today ? "bg-indigo-600 text-white" : "text-slate-700"
                                )}>{format(day, 'd')}</span>
                            </div>
                        )
                    })}
                </div>
                <div className="grid grid-cols-7 gap-px bg-slate-100 p-0.5">
                    {days.map(day => {
                        const dayTasks = getTasksForDay(day)
                        return (
                            <div key={day.toISOString()} className={cn(
                                "min-h-[160px] p-1.5 flex flex-col gap-1 bg-white rounded-lg",
                                isToday(day) && "bg-indigo-50/30"
                            )}>
                                {dayTasks.length === 0
                                    ? <p className="text-[10px] text-slate-200 text-center mt-6">No tasks</p>
                                    : dayTasks.map(t => (
                                        <WeekTaskCard key={t.id} task={t} onTaskClick={onTaskClick} onToggle={onToggle} />
                                    ))
                                }
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // ── Day view ────────────────────────────────────────────────────────────────
    function DayView() {
        const dayTasks = getTasksForDay(anchor)
        const pending   = dayTasks.filter(t => t.status !== 'completed')
        const completed = dayTasks.filter(t => t.status === 'completed')
        return (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                {dayTasks.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                            <CalendarDays className="w-6 h-6 text-slate-200" />
                        </div>
                        <p className="text-sm font-semibold text-slate-400">No tasks for this day</p>
                        <p className="text-xs text-slate-300 mt-1">Navigate to another day or add a task.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {pending.length > 0 && (
                            <div className="p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Pending · {pending.length}</p>
                                {pending.map(task => {
                                    const overdue = getIsOverdue(task)
                                    const pCfg    = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => onTaskClick(task)}
                                            className={cn(
                                                "group/dc flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm",
                                                overdue ? "bg-red-50 border-red-100" : cn(pCfg.bg, pCfg.border)
                                            )}
                                        >
                                            <button
                                                onClick={e => { e.stopPropagation(); onToggle(task) }}
                                                className={cn("shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110", overdue ? "border-red-400" : pCfg.text.replace('text-', 'border-'))}
                                            >
                                                <div className="w-0 h-0 group-hover/dc:w-2.5 group-hover/dc:h-2.5 rounded-full bg-current transition-all" />
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm font-semibold truncate", overdue ? "text-red-700" : pCfg.text)}>{task.title}</p>
                                                {task.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>}
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    {task.due_time && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />{task.due_time}
                                                        </span>
                                                    )}
                                                    {task.lead && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <User className="w-3 h-3" />{task.lead.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {task.assignee && <UserAvatar user={task.assignee} size={6} />}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {completed.length > 0 && (
                            <div className="p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Completed · {completed.length}</p>
                                {completed.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => onTaskClick(task)}
                                        className="group/dc flex items-center gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50 cursor-pointer hover:shadow-sm transition-all opacity-70"
                                    >
                                        <button
                                            onClick={e => { e.stopPropagation(); onToggle(task) }}
                                            className="shrink-0"
                                        >
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        </button>
                                        <p className="text-sm font-medium text-emerald-700 line-through truncate flex-1">{task.title}</p>
                                        {task.assignee && <UserAvatar user={task.assignee} size={6} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // ── Unscheduled ─────────────────────────────────────────────────────────────
    const unscheduled = tasks.filter(t => !t.due_date && t.status !== 'completed')

    return (
        <div className="space-y-4">
            {/* Calendar nav bar */}
            <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 shadow-sm ring-1 ring-slate-100 gap-3 flex-wrap">
                {/* Granularity toggle */}
                <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg shrink-0">
                    {CAL_GRANULARITIES.map(g => (
                        <button
                            key={g.id}
                            onClick={() => setGranularity(g.id)}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                                granularity === g.id
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>

                {/* Nav arrows + title */}
                <div className="flex items-center gap-2 flex-1 justify-center">
                    <button
                        onClick={navPrev}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-sm font-bold text-slate-800 tracking-tight min-w-[160px] text-center">
                        {getTitle()}
                    </h2>
                    <button
                        onClick={navNext}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Today button */}
                <button
                    onClick={() => setAnchor(new Date())}
                    className={cn(
                        "shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                        isAnchorToday()
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-default"
                            : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-800"
                    )}
                    disabled={isAnchorToday()}
                >
                    Today
                </button>
            </div>

            {/* Grid */}
            {granularity === 'month' && <MonthGrid />}
            {granularity === 'week'  && <WeekGrid />}
            {granularity === 'day'   && <DayView />}

            {/* Unscheduled tasks */}
            {unscheduled.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <ListChecks className="w-3.5 h-3.5" /> No Due Date
                        <span className="font-medium text-slate-300">({unscheduled.length})</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {unscheduled.map(task => {
                            const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                            return (
                                <button
                                    key={task.id}
                                    onClick={() => onTaskClick(task)}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all hover:opacity-80",
                                        pCfg.bg, pCfg.text, pCfg.border
                                    )}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                    {task.title}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TasksPageView() {
    const router = useRouter()
    const { hasPermission, loading: permLoading } = usePermissions()

    const [tasks, setTasks]           = useState([])
    const [loading, setLoading]       = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [detailTask, setDetailTask] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery]     = useState('')
    const [filterPriority, setFilterPriority] = useState('all')
    const [collapsedGroups, setCollapsedGroups] = useState(new Set(['done']))
    const [teamMembers, setTeamMembers]     = useState([])
    const [formData, setFormData]           = useState(EMPTY_FORM)
    const [selectedLeadLabel, setLeadLabel] = useState(null)
    const [selectedProjLabel, setProjLabel] = useState(null)
    const [deleteConfirmTask, setDeleteConfirmTask] = useState(null)
    const [deleting, setDeleting]           = useState(false)
    const [viewMode, setViewMode]           = useState('list')
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo]     = useState('')
    const [filterLeadId, setFilterLeadId]     = useState('all')
    const [showAdvFilters, setShowAdvFilters] = useState(false)

    const canViewTasks  = !permLoading && hasPermission('view_tasks')
    const canCreate     = !permLoading && hasPermission('create_tasks')
    const canEdit       = !permLoading && hasPermission('edit_tasks')
    const canDelete     = !permLoading && hasPermission('delete_tasks')
    const canAssignOthers = !permLoading && hasPermission('assign_tasks')

    useEffect(() => {
        if (!permLoading && !canViewTasks) {
            toast.error("You don't have permission to view tasks")
            router.replace('/dashboard/admin/crm/dashboard')
        }
    }, [permLoading, canViewTasks])

    useEffect(() => {
        if (canViewTasks) fetchTasks()
    }, [canViewTasks])

    useEffect(() => {
        if (canAssignOthers && teamMembers.length === 0) {
            fetch('/api/admin/users')
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d?.users) setTeamMembers(d.users) })
                .catch(() => {})
        }
    }, [canAssignOthers])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/tasks', { cache: 'no-store' })
            if (!res.ok) throw new Error()
            const data = await res.json()
            setTasks(data.tasks || [])
        } catch {
            toast.error('Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    // Sort: overdue first, then by due_date, then priority, then newest
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'completed' ? 1 : -1
        const aOver = getIsOverdue(a); const bOver = getIsOverdue(b)
        if (aOver !== bOver) return aOver ? -1 : 1
        if (a.due_date && b.due_date) {
            const diff = parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
            if (diff !== 0) return diff
        } else if (a.due_date || b.due_date) return a.due_date ? -1 : 1
        const pOrder = { high: 0, medium: 1, low: 2 }
        if (a.priority !== b.priority) return pOrder[a.priority] - pOrder[b.priority]
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const uniqueLeads = [...new Map(
        tasks.filter(t => t.lead).map(t => [t.lead.id, t.lead])
    ).values()].sort((a, b) => a.name.localeCompare(b.name))

    const filteredTasks = sortedTasks.filter(t => {
        const matchesPriority = filterPriority === 'all' || t.priority === filterPriority
        const q = searchQuery.toLowerCase()
        const matchesSearch = !q || t.title.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q) ||
            t.lead?.name?.toLowerCase().includes(q) ||
            t.project?.name?.toLowerCase().includes(q)
        const matchesLead = filterLeadId === 'all' || t.lead_id === filterLeadId
        const matchesDateFrom = !filterDateFrom || (t.due_date && t.due_date >= filterDateFrom)
        const matchesDateTo   = !filterDateTo   || (t.due_date && t.due_date <= filterDateTo)
        return matchesPriority && matchesSearch && matchesLead && matchesDateFrom && matchesDateTo
    })

    const activeFilterCount = [
        filterPriority !== 'all',
        filterLeadId !== 'all',
        !!filterDateFrom,
        !!filterDateTo,
    ].filter(Boolean).length

    function clearAllFilters() {
        setFilterPriority('all')
        setFilterLeadId('all')
        setFilterDateFrom('')
        setFilterDateTo('')
        setSearchQuery('')
    }

    const groups = [
        { id: 'overdue',  label: 'Overdue',     icon: AlertCircle,  color: 'text-red-600',    bg: 'bg-red-50',      tasks: filteredTasks.filter(t => t.status !== 'completed' && getIsOverdue(t)) },
        { id: 'today',    label: 'Due Today',   icon: Clock,        color: 'text-indigo-600', bg: 'bg-indigo-50',   tasks: filteredTasks.filter(t => t.status !== 'completed' && !getIsOverdue(t) && t.due_date && isToday(parseISO(t.due_date))) },
        { id: 'upcoming', label: 'Upcoming',    icon: Calendar,     color: 'text-slate-600',  bg: 'bg-slate-50',    tasks: filteredTasks.filter(t => t.status !== 'completed' && !getIsOverdue(t) && t.due_date && !isToday(parseISO(t.due_date))) },
        { id: 'later',    label: 'No Due Date', icon: ListChecks,   color: 'text-slate-400',  bg: 'bg-slate-100/50',tasks: filteredTasks.filter(t => t.status !== 'completed' && !t.due_date) },
        { id: 'done',     label: 'Completed',   icon: CheckCircle2, color: 'text-emerald-600',bg: 'bg-emerald-50',  tasks: filteredTasks.filter(t => t.status === 'completed') },
    ]

    const handleToggle = async (task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        // Optimistic update
        const updatedTask = { ...task, status: newStatus }
        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t))
        
        // Only update detail task if it's currently open
        setDetailTask(prev => prev?.id === task.id ? updatedTask : prev)

        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) throw new Error()
            const data = await res.json()
            
            if (data.task) {
                setTasks(prev => prev.map(t => t.id === task.id ? data.task : t))
                setDetailTask(prev => prev?.id === task.id ? data.task : prev)
            }

            toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened')
            if (!data.task) fetchTasks()
        } catch {
            setTasks(prev => prev.map(t => t.id === task.id ? task : t))
            setDetailTask(prev => prev?.id === task.id ? task : prev)
            toast.error('Failed to update task')
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!formData.title?.trim()) { toast.error('Title is required'); return }
        try {
            setSubmitting(true)
            const payload = formDataToPayload(formData)
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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

    const handleDeleteTask = async (taskId) => {
        setDeleting(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Task deleted')
            setTasks(prev => prev.filter(t => t.id !== taskId))
            setDeleteConfirmTask(null)
        } catch {
            toast.error('Failed to delete task')
        } finally {
            setDeleting(false)
        }
    }

    const resetForm = () => {
        setFormData(EMPTY_FORM)
        setLeadLabel(null)
        setProjLabel(null)
    }

    const overdueCount     = tasks.filter(t => t.status !== 'completed' && getIsOverdue(t)).length
    const pendingCount     = tasks.filter(t => t.status !== 'completed').length
    const highPriorityCount = tasks.filter(t => t.status !== 'completed' && t.priority === 'high').length
    const completedCount   = tasks.filter(t => t.status === 'completed').length

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

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Pending',      value: pendingCount,      icon: Clock,        color: 'blue' },
                        { label: 'Overdue',      value: overdueCount,      icon: AlertCircle,  color: 'red' },
                        { label: 'High Priority',value: highPriorityCount, icon: Zap,          color: 'rose' },
                        { label: 'Completed',    value: completedCount,    icon: CheckCircle2, color: 'emerald' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <Card key={label} className="border-0 shadow-sm ring-1 ring-gray-100 bg-white">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={cn("p-2.5 rounded-xl",
                                    color === 'blue'    ? 'bg-blue-50 text-blue-600' :
                                    color === 'red'     ? 'bg-red-50 text-red-600' :
                                    color === 'rose'    ? 'bg-rose-50 text-rose-600' :
                                    'bg-emerald-50 text-emerald-600'
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{label}</p>
                                    <p className={cn("text-base font-black mt-0.5", label === 'Overdue' && value > 0 ? 'text-red-600' : 'text-gray-900')}>{value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filter bar */}
                <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                    {/* Row 1: search + view toggle + actions */}
                    <div className="flex items-center gap-2 p-2 flex-wrap">
                        <div className="relative flex-1 min-w-[180px] max-w-sm group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <Input
                                placeholder="Search tasks, lead or project..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs border-slate-100 bg-slate-50/50 rounded-lg"
                            />
                        </div>

                        {/* Filters toggle button */}
                        <button
                            onClick={() => setShowAdvFilters(v => !v)}
                            className={cn(
                                "flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border transition-all",
                                showAdvFilters || activeFilterCount > 0
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-slate-50 text-slate-500 border-slate-100 hover:text-slate-700"
                            )}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="ml-0.5 bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        <div className="flex-1" />

                        {/* View toggle */}
                        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg shrink-0">
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                    viewMode === 'list' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <LayoutList className="w-3.5 h-3.5" /> List
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                    viewMode === 'calendar' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <CalendarDays className="w-3.5 h-3.5" /> Calendar
                            </button>
                        </div>

                        {canCreate && (
                            <Button onClick={() => setCreateOpen(true)} size="sm" className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 font-bold shadow-md shrink-0">
                                <Plus className="w-4 h-4" /> Add Task
                            </Button>
                        )}
                    </div>

                    {/* Row 2: advanced filters (collapsible) */}
                    {showAdvFilters && (
                        <div className="border-t border-slate-100 px-3 py-3 flex flex-wrap items-end gap-3 bg-white">
                            {/* Priority */}
                            <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</Label>
                                <Select value={filterPriority} onValueChange={setFilterPriority}>
                                    <SelectTrigger className="w-[140px] h-8 border-slate-200 bg-white rounded-lg text-xs font-semibold">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-3 h-3 text-slate-400" />
                                            <SelectValue placeholder="Priority" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                        <SelectItem value="all">All Priorities</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Lead */}
                            <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead</Label>
                                <Select value={filterLeadId} onValueChange={setFilterLeadId}>
                                    <SelectTrigger className="w-[180px] h-8 border-slate-200 bg-white rounded-lg text-xs font-semibold">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-slate-400" />
                                            <SelectValue placeholder="All Leads" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-xl max-h-60">
                                        <SelectItem value="all">All Leads</SelectItem>
                                        {uniqueLeads.map(lead => (
                                            <SelectItem key={lead.id} value={lead.id}>
                                                {lead.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="h-8 w-px bg-slate-200 hidden sm:block self-end" />

                            {/* Date from */}
                            <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due From</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={filterDateFrom}
                                        onChange={e => setFilterDateFrom(e.target.value)}
                                        className="h-8 pl-7 pr-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Date to */}
                            <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due To</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={filterDateTo}
                                        min={filterDateFrom || undefined}
                                        onChange={e => setFilterDateTo(e.target.value)}
                                        className="h-8 pl-7 pr-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Clear filters */}
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={clearAllFilters}
                                    className="self-end flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"
                                >
                                    <XIcon className="w-3 h-3" /> Clear all
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Calendar view */}
                {viewMode === 'calendar' && (
                    <TaskCalendarView
                        tasks={filteredTasks}
                        onTaskClick={setDetailTask}
                        onToggle={handleToggle}
                    />
                )}

                {/* Task groups */}
                {viewMode === 'list' && <div className="space-y-8">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-200" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">No tasks found</h4>
                            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search.</p>
                        </div>
                    ) : (
                        groups.filter(g => g.tasks.length > 0).map(group => {
                            const isCollapsed = collapsedGroups.has(group.id)
                            return (
                                <div key={group.id} className="space-y-4">
                                    <button
                                        onClick={() => setCollapsedGroups(prev => {
                                            const next = new Set(prev)
                                            if (next.has(group.id)) next.delete(group.id); else next.add(group.id)
                                            return next
                                        })}
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
                                        <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform duration-300", isCollapsed ? "-rotate-90" : "rotate-0")} />
                                    </button>

                                    {!isCollapsed && (
                                        <div className="grid grid-cols-1 gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {group.tasks.map(task => (
                                                <TaskRow
                                                    key={task.id}
                                                    task={task}
                                                    onToggle={handleToggle}
                                                    onEditClick={setDetailTask}
                                                    onDeleteClick={setDeleteConfirmTask}
                                                    canDelete={canDelete}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>}
            </div>

            {/* Task Detail Sheet */}
            <TaskDetailSheet
                task={detailTask}
                open={!!detailTask}
                onClose={() => setDetailTask(null)}
                onToggle={handleToggle}
                onUpdated={() => { fetchTasks(); setDetailTask(null) }}
                onDelete={(id) => setTasks(prev => prev.filter(t => t.id !== id))}
                teamMembers={teamMembers}
                canEdit={canEdit}
                canDelete={canDelete}
                canAssignOthers={canAssignOthers}
            />

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Task</DialogTitle>
                        <DialogDescription>Create a task. Optionally link it to a lead or project.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <TaskFormFields
                            formData={formData}
                            onChange={(field, value) => setFormData(f => ({ ...f, [field]: value }))}
                            teamMembers={teamMembers}
                            canAssignOthers={canAssignOthers}
                            showLeadProject
                            selectedLeadLabel={selectedLeadLabel}
                            selectedProjectLabel={selectedProjLabel}
                            onLeadChange={(id, name) => { setFormData(f => ({ ...f, lead_id: id })); setLeadLabel(name) }}
                            onProjectChange={(id, name) => { setFormData(f => ({ ...f, project_id: id })); setProjLabel(name) }}
                        />

                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="text-slate-500">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting || !formData.title?.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-semibold">
                                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Task'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Inline Delete Confirm (from row) */}
            <Dialog open={!!deleteConfirmTask} onOpenChange={(v) => { if (!v) setDeleteConfirmTask(null) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogDescription>
                            Delete &quot;{deleteConfirmTask?.title}&quot;? This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteConfirmTask(null)} disabled={deleting}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleDeleteTask(deleteConfirmTask.id)} disabled={deleting}>
                            {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}
