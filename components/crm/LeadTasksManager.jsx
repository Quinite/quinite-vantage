'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
    X,
    Check,
    User,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
    format,
    isPast,
    isToday,
    isFuture,
    parseISO,
    differenceInDays,
} from 'date-fns'
import { usePermissions } from '@/contexts/PermissionContext'

// ─── Helpers ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
    high:   { label: 'High',   dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200' },
    medium: { label: 'Medium', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    low:    { label: 'Low',    dot: 'bg-emerald-500',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

function getIsOverdue(task) {
    return (
        task.status === 'pending' &&
        task.due_date &&
        isPast(parseISO(task.due_date)) &&
        !isToday(parseISO(task.due_date))
    )
}

function DueDateChip({ task }) {
    if (!task.due_date) return null
    const d = parseISO(task.due_date)
    const overdue = getIsOverdue(task)
    const today = isToday(d)
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
    const dateStr = hasTime ? format(d, 'MMM d, h:mm a') : format(d, 'MMM d, yyyy')

    if (overdue) {
        const daysAgo = Math.abs(differenceInDays(d, new Date()))
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
                <AlertTriangle className="w-3 h-3" />
                {daysAgo === 0 ? 'Overdue' : `${daysAgo}d overdue`}
                <span className="text-red-400 font-normal">· {dateStr}</span>
            </span>
        )
    }
    if (today) {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
                <Clock className="w-3 h-3" /> Due today
                {hasTime && <span className="text-blue-400 font-normal">· {format(d, 'h:mm a')}</span>}
            </span>
        )
    }
    if (differenceInDays(d, new Date()) === 1) {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <CalendarClock className="w-3 h-3" /> Tomorrow
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3" /> {dateStr}
        </span>
    )
}

function AssigneeChip({ assignee }) {
    if (!assignee) return null
    const initials = (assignee.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[8px] font-bold flex items-center justify-center overflow-hidden">
                        {assignee.avatar_url
                            ? <img src={assignee.avatar_url} alt="" className="w-full h-full object-cover" />
                            : initials
                        }
                    </div>
                    {assignee.full_name?.split(' ')[0]}
                </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{assignee.full_name}</TooltipContent>
        </Tooltip>
    )
}

// ─── Edit Form (inline) ──────────────────────────────────────────────────────

function TaskEditForm({ task, onSave, onCancel, teamMembers }) {
    const [formData, setFormData] = useState({
        title:       task.title || '',
        description: task.description || '',
        due_date:    task.due_date
                        ? format(parseISO(task.due_date), "yyyy-MM-dd'T'HH:mm")
                        : '',
        priority:    task.priority || 'medium',
        assigned_to: task.assigned_to || 'none',
    })
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!formData.title.trim()) { toast.error('Title is required'); return }
        setSaving(true)
        try {
            const payload = {
                title:       formData.title,
                description: formData.description || null,
                due_date:    formData.due_date || null,
                priority:    formData.priority,
                assigned_to: formData.assigned_to === 'none' ? null : formData.assigned_to,
            }
            const res = await fetch(`/api/leads/${task.lead_id}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error()
            toast.success('Task updated')
            onSave()
        } catch {
            toast.error('Failed to update task')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mt-2 space-y-3 pb-1">
            <Input
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
                className="h-8 text-sm"
                autoFocus
            />
            <Textarea
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={2}
                className="text-sm resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Due Date & Time</Label>
                    <Input
                        type="datetime-local"
                        value={formData.due_date}
                        onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))}
                        className="h-8 text-xs"
                    />
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Priority</Label>
                    <Select
                        value={formData.priority}
                        onValueChange={v => setFormData(f => ({ ...f, priority: v }))}
                    >
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {teamMembers.length > 0 && (
                <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Assign To</Label>
                    <Select
                        value={formData.assigned_to}
                        onValueChange={v => setFormData(f => ({ ...f, assigned_to: v }))}
                    >
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {teamMembers.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.full_name || m.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1">
                    <Check className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-xs">
                    Cancel
                </Button>
            </div>
        </div>
    )
}

// ─── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete, onEdit, teamMembers }) {
    const [editing, setEditing]     = useState(false)
    const [confirmDel, setConfirmDel] = useState(false)
    const isCompleted = task.status === 'completed'
    const isOverdue   = getIsOverdue(task)
    const pCfg        = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

    return (
        <div
            className={`
                group rounded-xl border bg-background transition-all duration-150
                ${isOverdue && !isCompleted
                    ? 'border-l-2 border-l-red-500'
                    : isCompleted
                        ? 'border-border/40 opacity-55'
                        : 'border-border hover:border-border/70 hover:shadow-sm'
                }
            `}
        >
            <div className="flex items-start gap-3 px-3.5 py-3">
                <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => onToggle(task)}
                    className="mt-0.5 shrink-0"
                />

                {/* Main content */}
                <div className="flex-1 min-w-0">
                    {editing ? (
                        <TaskEditForm
                            task={task}
                            teamMembers={teamMembers}
                            onSave={() => { setEditing(false); onEdit() }}
                            onCancel={() => setEditing(false)}
                        />
                    ) : (
                        <>
                            <p className={`text-sm font-medium leading-snug ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                            </p>
                            {task.description && !isCompleted && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {task.description}
                                </p>
                            )}
                            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] h-4 px-1.5 py-0 font-medium ${pCfg.badge}`}
                                >
                                    {pCfg.label}
                                </Badge>
                                {!isCompleted && <DueDateChip task={task} />}
                                {isCompleted && task.completed_at && (
                                    <span className="text-[11px] text-muted-foreground">
                                        Completed {format(parseISO(task.completed_at), 'MMM d')}
                                    </span>
                                )}
                                <AssigneeChip assignee={task.assignee} />
                            </div>
                        </>
                    )}
                </div>

                {/* Actions (show on hover, not during edit) */}
                {!editing && !isCompleted && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                            <TooltipContent className="text-xs">Edit</TooltipContent>
                        </Tooltip>

                        {!confirmDel ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                        onClick={() => setConfirmDel(true)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">Delete</TooltipContent>
                            </Tooltip>
                        ) : (
                            <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-md px-2 py-0.5">
                                <span className="text-[11px] text-red-700 font-medium mr-0.5">Delete?</span>
                                <button
                                    onClick={() => onDelete(task.id)}
                                    className="text-[11px] font-semibold text-red-600 hover:text-red-800"
                                >Yes</button>
                                <span className="text-red-300">·</span>
                                <button
                                    onClick={() => setConfirmDel(false)}
                                    className="text-[11px] text-muted-foreground hover:text-foreground"
                                >No</button>
                            </div>
                        )}
                    </div>
                )}
                {!editing && isCompleted && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => onDelete(task.id)}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Remove</TooltipContent>
                    </Tooltip>
                )}
            </div>
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LeadTasksManager({ leadId }) {
    const { hasAnyPermission, loading: permLoading } = usePermissions()
    const [tasks, setTasks]           = useState([])
    const [loading, setLoading]       = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showCompleted, setShowCompleted] = useState(false)
    const [teamMembers, setTeamMembers]     = useState([])
    const [formData, setFormData] = useState({
        title: '', description: '', due_date: '', priority: 'medium', assigned_to: 'none',
    })

    const canAssignOthers = !permLoading &&
        hasAnyPermission(['view_team_leads', 'view_all_leads', 'assign_leads'])

    useEffect(() => { fetchTasks() }, [leadId])

    useEffect(() => {
        if (dialogOpen && canAssignOthers && teamMembers.length === 0) {
            fetch('/api/admin/users')
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d?.users) setTeamMembers(d.users) })
                .catch(() => {})
        }
    }, [dialogOpen, canAssignOthers])

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
        try {
            setSubmitting(true)
            const payload = {
                title:       formData.title,
                description: formData.description || null,
                due_date:    formData.due_date || null,
                priority:    formData.priority,
                assigned_to: formData.assigned_to === 'none' ? null : formData.assigned_to,
            }
            const res = await fetch(`/api/leads/${leadId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error()
            toast.success('Task created')
            setDialogOpen(false)
            setFormData({ title: '', description: '', due_date: '', priority: 'medium', assigned_to: 'none' })
            fetchTasks()
        } catch {
            toast.error('Failed to create task')
        } finally {
            setSubmitting(false)
        }
    }

    const pending   = tasks.filter(t => t.status !== 'completed')
    const completed = tasks.filter(t => t.status === 'completed')

    // Sort pending: overdue first, then by due_date asc, then no date
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
                        onClick={() => setDialogOpen(true)}
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
                            onClick={() => setDialogOpen(true)}
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
                                onEdit={fetchTasks}
                                teamMembers={teamMembers}
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
                                        onEdit={fetchTasks}
                                        teamMembers={teamMembers}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Create Task Dialog ──────────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Add Task</DialogTitle>
                        <DialogDescription>Create a follow-up for this lead.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-3">
                        <div className="space-y-1.5">
                            <Label>Title <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                                placeholder="What needs to be done?"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-muted-foreground text-xs">Description <span className="font-normal">(optional)</span></Label>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                                placeholder="Add details..."
                                rows={2}
                                className="resize-none text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Due Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.due_date}
                                    onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))}
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={v => setFormData(f => ({ ...f, priority: v }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {canAssignOthers && teamMembers.length > 0 && (
                            <div className="space-y-1.5">
                                <Label>Assign To <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                                <Select
                                    value={formData.assigned_to}
                                    onValueChange={v => setFormData(f => ({ ...f, assigned_to: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unassigned</SelectItem>
                                        {teamMembers.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.full_name || m.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="flex gap-2 pt-1">
                            <Button type="submit" disabled={submitting} className="flex-1">
                                {submitting ? 'Creating...' : 'Create Task'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}
