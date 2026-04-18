'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Plus,
    Trash2,
    Pencil,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Calendar,
    CalendarClock,
    ChevronDown,
} from 'lucide-react'

import { toast } from 'react-hot-toast'
import {
    format,
    isPast,
    isToday,
    parseISO,
    differenceInDays,
} from 'date-fns'
import { usePermissions } from '@/contexts/PermissionContext'
import TaskFormFields, { taskToFormData, formDataToPayload, EMPTY_FORM } from '@/components/crm/TaskFormFields'

// ─── Helpers ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
    high:   { label: 'High',   dot: 'bg-red-500',    text: 'text-red-600',    ring: 'ring-red-200' },
    medium: { label: 'Medium', dot: 'bg-amber-400',  text: 'text-amber-600',  ring: 'ring-amber-200' },
    low:    { label: 'Low',    dot: 'bg-blue-400',   text: 'text-blue-600',   ring: 'ring-blue-200' },
}

function getIsOverdue(task) {
    return (
        task.status === 'pending' &&
        task.due_date &&
        isPast(parseISO(task.due_date)) &&
        !isToday(parseISO(task.due_date))
    )
}

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

function AssigneeAvatar({ assignee }) {
    if (!assignee) return null
    const initials = (assignee.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white cursor-default">
                    {assignee.avatar_url
                        ? <img src={assignee.avatar_url} alt="" className="w-full h-full object-cover" />
                        : initials
                    }
                </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{assignee.full_name}</TooltipContent>
        </Tooltip>
    )
}

// ─── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete, onEditClick }) {
    const [confirmDel, setConfirmDel] = useState(false)
    const isCompleted = task.status === 'completed'
    const isOverdue   = getIsOverdue(task)
    const pCfg        = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

    return (
        <div className={[
            'group rounded-xl border bg-background transition-all duration-150',
            isOverdue && !isCompleted
                ? 'border-red-200 bg-red-50/20'
                : isCompleted
                    ? 'border-border/40 opacity-60'
                    : 'border-border hover:border-border/80 hover:shadow-sm',
        ].join(' ')}>

            {/* Top row — checkbox · title · actions */}
            <div className="flex items-start gap-2.5 px-3 pt-3 pb-1">
                <button
                    onClick={() => onToggle(task)}
                    className={cn(
                        "mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                        isCompleted
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-gray-200 hover:border-indigo-500 text-transparent hover:text-indigo-500"
                    )}
                >
                    <CheckCircle2 className={cn("w-3.5 h-3.5", isCompleted ? "text-white" : "opacity-0 hover:opacity-100")} />
                </button>

                <p className={`flex-1 min-w-0 text-sm font-medium leading-snug ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                </p>

                {/* Actions — visible on hover */}
                <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mt-0.5">
                    {!isCompleted && !confirmDel && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => onEditClick(task)}
                                >
                                    <Pencil className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Edit</TooltipContent>
                        </Tooltip>
                    )}

                    {!confirmDel ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                    onClick={() => setConfirmDel(true)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">{isCompleted ? 'Remove' : 'Delete'}</TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-1.5 py-0.5">
                            <span className="text-[10px] text-red-700 font-medium">Delete?</span>
                            <button onClick={() => onDelete(task.id)} className="text-[10px] font-bold text-red-600 hover:text-red-800 ml-0.5">Yes</button>
                            <span className="text-red-300 text-[10px]">·</span>
                            <button onClick={() => setConfirmDel(false)} className="text-[10px] text-muted-foreground hover:text-foreground">No</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            {task.description && !isCompleted && (
                <p className="text-xs text-muted-foreground px-3 pb-1 pl-[calc(0.75rem+1.25rem+0.625rem)] line-clamp-1">
                    {task.description}
                </p>
            )}

            {/* Footer — date · priority · assignee */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1 pl-[calc(0.75rem+1.25rem+0.625rem)]">
                {/* Left: date or completed date */}
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

                {/* Right: priority pill + assignee avatar */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-default">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pCfg.dot}`} />
                                <span className={`text-[11px] font-medium ${pCfg.text}`}>{pCfg.label}</span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Priority: {pCfg.label}</TooltipContent>
                    </Tooltip>

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
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LeadTasksManager({ leadId }) {
    const { hasAnyPermission, loading: permLoading } = usePermissions()
    const [tasks, setTasks]             = useState([])
    const [loading, setLoading]         = useState(true)
    const [createOpen, setCreateOpen]   = useState(false)
    const [editTask, setEditTask]       = useState(null)   // task being edited
    const [submitting, setSubmitting]   = useState(false)
    const [showCompleted, setShowCompleted] = useState(false)
    const [teamMembers, setTeamMembers] = useState([])
    const [createForm, setCreateForm]   = useState(EMPTY_FORM)
    const [editForm, setEditForm]       = useState(EMPTY_FORM)

    const canAssignOthers = !permLoading &&
        hasAnyPermission(['view_team_leads', 'view_all_leads', 'assign_leads'])

    useEffect(() => { fetchTasks() }, [leadId])

    // Load team members when either dialog opens
    useEffect(() => {
        if ((createOpen || editTask) && canAssignOthers && teamMembers.length === 0) {
            fetch('/api/admin/users')
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d?.users) setTeamMembers(d.users) })
                .catch(() => {})
        }
    }, [createOpen, editTask, canAssignOthers])

    // Populate edit form whenever a task is selected for editing
    useEffect(() => {
        if (editTask) setEditForm(taskToFormData(editTask))
    }, [editTask?.id])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/leads/${leadId}/tasks`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setTasks(data.tasks || [])
        } catch {
            toast.error('Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = async (task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
        try {
            const res = await fetch(`/api/leads/${leadId}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) throw new Error()
            toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened', { duration: 2000 })
            fetchTasks()
        } catch {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
            toast.error('Failed to update task')
        }
    }

    const handleDelete = async (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        try {
            const res = await fetch(`/api/leads/${leadId}/tasks/${taskId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Task deleted', { duration: 2000 })
        } catch {
            toast.error('Failed to delete task')
            fetchTasks()
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!createForm.title.trim()) { toast.error('Title is required'); return }
        try {
            setSubmitting(true)
            const res = await fetch(`/api/leads/${leadId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formDataToPayload(createForm)),
            })
            if (!res.ok) throw new Error()
            toast.success('Task created')
            setCreateOpen(false)
            setCreateForm(EMPTY_FORM)
            fetchTasks()
        } catch {
            toast.error('Failed to create task')
        } finally {
            setSubmitting(false)
        }
    }

    const handleEditSave = async (e) => {
        e.preventDefault()
        if (!editForm.title.trim()) { toast.error('Title is required'); return }
        try {
            setSubmitting(true)
            const res = await fetch(`/api/leads/${leadId}/tasks/${editTask.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formDataToPayload(editForm)),
            })
            if (!res.ok) throw new Error()
            toast.success('Task updated')
            setEditTask(null)
            fetchTasks()
        } catch {
            toast.error('Failed to update task')
        } finally {
            setSubmitting(false)
        }
    }

    const pending   = tasks.filter(t => t.status !== 'completed')
    const completed = tasks.filter(t => t.status === 'completed')

    const sortedPending = [...pending].sort((a, b) => {
        const aOver = getIsOverdue(a)
        const bOver = getIsOverdue(b)
        if (aOver && !bOver) return -1
        if (!aOver && bOver) return 1
        if (!a.due_date && b.due_date) return 1
        if (a.due_date && !b.due_date) return -1
        if (a.due_date && b.due_date) return parseISO(a.due_date) - parseISO(b.due_date)
        return 0
    })

    if (loading) {
        return (
            <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-[72px] rounded-xl border border-border animate-pulse bg-muted/30" />
                ))}
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={0}>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">Tasks</span>
                        {pending.length > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-full">
                                {pending.length}
                            </span>
                        )}
                    </div>
                    <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                </div>

                {/* Pending tasks */}
                {sortedPending.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border text-center">
                        <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">All done!</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">No pending tasks for this lead</p>
                        <Button
                            variant="ghost" size="sm" className="mt-3 h-7 text-xs gap-1"
                            onClick={() => setCreateOpen(true)}
                        >
                            <Plus className="w-3 h-3" /> Add a task
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {sortedPending.map(task => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                onToggle={handleToggle}
                                onDelete={handleDelete}
                                onEditClick={setEditTask}
                            />
                        ))}
                    </div>
                )}

                {/* Completed tasks (collapsible) */}
                {completed.length > 0 && (
                    <div>
                        <button
                            onClick={() => setShowCompleted(v => !v)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                        >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCompleted ? '' : '-rotate-90'}`} />
                            {completed.length} completed task{completed.length !== 1 ? 's' : ''}
                        </button>
                        {showCompleted && (
                            <div className="space-y-1.5 mt-1.5">
                                {completed.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        onToggle={handleToggle}
                                        onDelete={handleDelete}
                                        onEditClick={setEditTask}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Create Task Dialog ──────────────────────────────────────── */}
            <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setCreateForm(EMPTY_FORM) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Add Task</DialogTitle>
                        <DialogDescription>Create a follow-up for this lead.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-3">
                        <TaskFormFields
                            formData={createForm}
                            onChange={(field, value) => setCreateForm(f => ({ ...f, [field]: value }))}
                            teamMembers={teamMembers}
                            canAssignOthers={canAssignOthers}
                        />
                        <div className="flex gap-2 pt-1">
                            <Button type="submit" disabled={submitting} className="flex-1">
                                {submitting ? 'Creating...' : 'Create Task'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ─── Edit Task Dialog ────────────────────────────────────────── */}
            <Dialog open={!!editTask} onOpenChange={open => { if (!open) setEditTask(null) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                        <DialogDescription>Update the details for this task.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSave} className="space-y-3">
                        <TaskFormFields
                            formData={editForm}
                            onChange={(field, value) => setEditForm(f => ({ ...f, [field]: value }))}
                            teamMembers={teamMembers}
                            canAssignOthers={canAssignOthers}
                        />
                        <div className="flex gap-2 pt-1">
                            <Button type="submit" disabled={submitting} className="flex-1">
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setEditTask(null)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}
