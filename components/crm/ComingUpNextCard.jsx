'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Calendar,
    Plus,
    CheckCircle2,
    Trash2,
    AlertTriangle,
    Clock,
    CalendarClock,
    Loader2,
    Building2,
} from 'lucide-react'
import TaskUnitBadge from './TaskUnitBadge'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { isPast, isToday, parseISO, differenceInDays } from 'date-fns'
import { formatIndianDateTime, formatIndianDate } from '@/lib/formatDate'
import TaskFormFields, { formDataToPayload, EMPTY_FORM } from '@/components/crm/TaskFormFields'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
    high:   { label: 'High',   dot: 'bg-red-500',   text: 'text-red-600',   badge: 'bg-red-50 text-red-700 border-red-200 ring-red-100' },
    medium: { label: 'Medium', dot: 'bg-amber-400', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100' },
    low:    { label: 'Low',    dot: 'bg-blue-400',  text: 'text-blue-600',  badge: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-100' },
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
    const today = isToday(d)
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0

    if (overdue) {
        const daysAgo = Math.abs(differenceInDays(d, new Date()))
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-px">
                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                {daysAgo === 0 ? 'Today' : `${daysAgo}d overdue`}
            </span>
        )
    }
    if (today) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-px">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                {hasTime ? formatIndianDateTime(task.due_date).split(', ')[1] : 'Today'}
            </span>
        )
    }
    if (differenceInDays(d, new Date()) === 1) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-px">
                <CalendarClock className="w-2.5 h-2.5 shrink-0" />
                Tomorrow
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 border border-border rounded-full px-1.5 py-px">
            <Calendar className="w-2.5 h-2.5 shrink-0" />
            {hasTime ? formatIndianDateTime(task.due_date) : formatIndianDate(task.due_date)}
        </span>
    )
}

// ─── Task Row ────────────────────────────────────────────────────────────────

function OverviewTaskRow({ task, onToggle, onDelete }) {
    const isCompleted = task.status === 'completed'
    const isOverdue = getIsOverdue(task)
    const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

    return (
        <div className={cn(
            'group relative flex items-center gap-3 p-2.5 rounded-xl bg-white transition-all duration-200',
            isOverdue && !isCompleted
                ? 'shadow-[0_0_0_1px_rgba(239,68,68,0.1)]'
                : 'shadow-sm hover:shadow-md',
            isCompleted && 'opacity-60'
        )}>
            {/* Priority accent bar */}
            {!isCompleted && (
                <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', pCfg.dot)} />
            )}

            {/* Checkbox */}
            <button
                onClick={() => onToggle(task.id, task.status)}
                className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 focus:outline-none",
                    isCompleted
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-slate-300 hover:border-indigo-500"
                )}
            >
                <CheckCircle2 className={cn("w-3 h-3", isCompleted ? "text-white" : "text-transparent")} />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                        "text-sm font-semibold leading-tight truncate",
                        isCompleted ? "line-through text-slate-400" : "text-slate-900"
                    )}>
                        {task.title}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                        {!isCompleted && (
                            <Badge variant="outline" className={cn(
                                "text-[8px] font-bold uppercase tracking-tight px-1.5 py-px border shadow-sm ring-1 ring-inset h-auto",
                                pCfg.badge
                            )}>
                                {pCfg.label}
                            </Badge>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-0.5 rounded"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {task.description && !isCompleted && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                )}

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.project && (
                        <span className="text-[9px] font-bold uppercase tracking-tight text-indigo-500 bg-indigo-50/50 px-1.5 py-px rounded border border-indigo-100 shrink-0">
                            {task.project.name}
                        </span>
                    )}
                    {task.unit && <TaskUnitBadge unit={task.unit} project={task.project} />}
                </div>

                {/* Footer: due date + assignee */}
                <div className="flex items-center gap-3 mt-1.5">
                    {!isCompleted && <DueDateBadge task={task} />}
                    {isCompleted && task.completed_at && (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100/50 px-1.5 py-px rounded-full border border-slate-100">
                            {formatIndianDate(task.completed_at)}
                        </span>
                    )}
                    {task.assignee && (
                        <div className="flex items-center gap-1.5 ml-auto">
                            <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 overflow-hidden text-[7px]">
                                {(task.assignee.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className={cn("text-[10px] font-medium truncate max-w-[80px]", isCompleted ? "text-slate-400" : "text-slate-600")}>
                                {task.assignee.full_name}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ComingUpNextCard({ leadId, leadName, onShowAll }) {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [teamMembers, setTeamMembers] = useState([])
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [selectedUnitLabel, setSelectedUnitLabel] = useState(null)
    const [selectedProjectLabel, setSelectedProjectLabel] = useState(null)

    useEffect(() => {
        if (leadId) fetchTasks()
    }, [leadId])

    useEffect(() => {
        if (isDialogOpen && teamMembers.length === 0) {
            fetch('/api/admin/users')
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d?.users) setTeamMembers(d.users) })
                .catch(() => {})
        }
    }, [isDialogOpen])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/leads/${leadId}/tasks`)
            if (!res.ok) throw new Error('Failed to fetch tasks')
            const data = await res.json()
            setTasks(data.tasks || [])
        } catch (error) {
            console.error('Error fetching tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddTask = async () => {
        if (!formData.title.trim()) {
            toast.error('Please enter a task title')
            return
        }

        try {
            setSaving(true)
            const res = await fetch(`/api/leads/${leadId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formDataToPayload(formData)),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to create task')
            }

            toast.success('Task created successfully')
            setIsDialogOpen(false)
            setFormData(EMPTY_FORM)
            setSelectedUnitLabel(null)
            setSelectedProjectLabel(null)
            fetchTasks()
        } catch (error) {
            console.error('Error creating task:', error)
            toast.error(error.message || 'Failed to create task')
        } finally {
            setSaving(false)
        }
    }

    const toggleTaskStatus = async (taskId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
            const res = await fetch(`/api/leads/${leadId}/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })

            if (!res.ok) throw new Error('Failed to update task')

            setTasks(tasks.map(t =>
                t.id === taskId ? { ...t, status: newStatus } : t
            ))
            toast.success(`Task marked as ${newStatus}`)
        } catch (error) {
            console.error('Error updating task:', error)
            toast.error('Failed to update task')
        }
    }

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Are you sure you want to delete this task?')) return

        try {
            const res = await fetch(`/api/leads/${leadId}/tasks/${taskId}`, {
                method: 'DELETE'
            })

            if (!res.ok) throw new Error('Failed to delete task')

            setTasks(tasks.filter(t => t.id !== taskId))
            toast.success('Task deleted')
        } catch (error) {
            console.error('Error deleting task:', error)
            toast.error('Failed to delete task')
        }
    }

    if (loading) {
        return (
            <Card className="h-full border-0 shadow-sm ring-1 ring-gray-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-50 rounded-md">
                                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                            </div>
                            <CardTitle className="text-sm font-semibold text-gray-900">Tasks</CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Sort: pending first, overdue on top, then by due date
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'completed' ? 1 : -1
        const aOver = getIsOverdue(a)
        const bOver = getIsOverdue(b)
        if (aOver !== bOver) return aOver ? -1 : 1
        if (a.due_date && b.due_date) return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
        if (a.due_date || b.due_date) return a.due_date ? -1 : 1
        return 0
    })

    const pendingCount = tasks.filter(t => t.status !== 'completed').length

    return (
        <Card className="h-full border-0 shadow-sm ring-1 ring-gray-200 flex flex-col">
            <CardHeader className="pb-4 shrink-0 border-b border-gray-100 mb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-900">Tasks</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {pendingCount} pending
                            </p>
                        </div>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                                onClick={() => setIsDialogOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Add Task</TooltipContent>
                    </Tooltip>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
                {tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-8">
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle2 className="w-6 h-6 text-indigo-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No tasks yet</p>
                        <p className="text-xs text-gray-500 mt-1 mb-3">Stay organized by adding tasks</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDialogOpen(true)}
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Add First Task
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sortedTasks.slice(0, 3).map((task) => (
                            <OverviewTaskRow
                                key={task.id}
                                task={task}
                                onToggle={toggleTaskStatus}
                                onDelete={handleDeleteTask}
                            />
                        ))}

                        {tasks.length > 0 && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onShowAll}
                                className="w-full mt-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-semibold py-2 h-auto"
                            >
                                {tasks.length > 3 ? `Show all ${tasks.length} tasks` : "View all tasks"}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>

            {/* Create Task Dialog — Matches Tasks Tab Style */}
            <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) setFormData(EMPTY_FORM) }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Task</DialogTitle>
                        <DialogDescription>Create a follow-up task for this lead.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddTask() }} className="space-y-4">
                        <TaskFormFields
                            formData={formData}
                            onChange={(field, value) => setFormData(f => ({ ...f, [field]: value }))}
                            teamMembers={teamMembers}
                            canAssignOthers={teamMembers.length > 0}
                            fixedLeadId={leadId}
                            fixedLeadLabel={leadName}
                            showLeadProject={true}
                            selectedProjectLabel={selectedProjectLabel}
                            onProjectChange={(id, label) => {
                                setFormData(f => ({ ...f, project_id: id, unit_id: null }));
                                setSelectedProjectLabel(label);
                                setSelectedUnitLabel(null);
                            }}
                            selectedUnitLabel={selectedUnitLabel}
                            onUnitChange={(id, label) => setSelectedUnitLabel(label)}
                        />
                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-500">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving || !formData.title?.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-semibold">
                                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Task'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
