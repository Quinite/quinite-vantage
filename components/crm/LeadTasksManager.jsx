'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
    AlertCircle,
    Clock,
    Calendar,
    CalendarClock,
    ChevronDown,
    Zap,
    Search,
    ListChecks,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { useLeadTasks } from '@/hooks/useLeads'

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
        <div className={cn(
            'group relative flex items-center gap-4 p-3 rounded-xl bg-white transition-all duration-200',
            isOverdue && !isCompleted 
                ? 'shadow-[0_0_0_1px_rgba(239,68,68,0.1)]' 
                : 'shadow-sm hover:shadow-md hover:-translate-y-0.5',
            isCompleted && 'opacity-60'
        )}>
            {/* Priority Full-Height Accent Bar */}
            <div className={cn('absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl transition-all', pCfg.dot)} />

            {/* Column 1: Checkbox + Title/Desc (Flex-1) */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="shrink-0">
                    <button
                        onClick={() => onToggle(task)}
                        className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                            isCompleted
                                ? "bg-indigo-600 border-indigo-600"
                                : "border-slate-300 hover:border-indigo-500 text-transparent hover:text-indigo-500"
                        )}
                    >
                        <CheckCircle2 className={cn("w-3.5 h-3.5", isCompleted ? "text-white" : "opacity-0 hover:opacity-100")} />
                    </button>
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                    <p className={cn(
                        "text-sm font-semibold leading-tight truncate",
                        isCompleted ? "line-through text-slate-400 font-medium" : "text-slate-900"
                    )}>
                        {task.title}
                    </p>
                    {task.description && !isCompleted && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                            {task.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Column 2: Priority Badge (Fixed Width) */}
            <div className="hidden lg:flex items-center w-28 shrink-0">
                {!isCompleted ? (
                    <Badge variant="outline" className={cn(
                        "text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 border shadow-sm ring-1 ring-inset",
                        task.priority === 'high' ? "bg-red-50 text-red-700 border-red-200 ring-red-100" :
                        task.priority === 'medium' ? "bg-amber-50 text-amber-700 border-amber-200 ring-amber-100" :
                        "bg-blue-50 text-blue-700 border-blue-200 ring-blue-100"
                    )}>
                        {pCfg.label}
                    </Badge>
                ) : <div className="w-full" />}
            </div>

            {/* Column 3: Due Date (Fixed Width) */}
            <div className="hidden sm:flex items-center w-36 shrink-0">
                {!isCompleted ? (
                    <DueDateBadge task={task} />
                ) : task.completed_at ? (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100/50 px-2 py-0.5 rounded-full border border-slate-100">
                        {format(parseISO(task.completed_at), 'MMM d')}
                    </span>
                ) : null}
            </div>

            {/* Column 4: Assignee (Fixed Width) */}
            <div className="hidden md:flex items-center w-12 shrink-0 justify-center">
                {task.assignee && <AssigneeAvatar assignee={task.assignee} />}
            </div>

            {/* Column 5: Actions Hub (Far Right) */}
            <div className="flex items-center justify-end w-20 shrink-0 border-l border-slate-100 pl-3">
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                    {!isCompleted && !confirmDel && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    onClick={() => onEditClick(task)}
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-bold">Edit Task</TooltipContent>
                        </Tooltip>
                    )}

                    {!confirmDel ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    onClick={() => setConfirmDel(true)}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-bold">{isCompleted ? 'Remove' : 'Delete'}</TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg p-1 animate-in fade-in zoom-in duration-200">
                            <button 
                                onClick={() => onDelete(task.id)} 
                                className="text-[10px] font-black text-red-600 hover:bg-red-100 px-1.5 py-0.5 rounded transition-colors"
                            >
                                Confirm
                            </button>
                            <button 
                                onClick={() => setConfirmDel(false)} 
                                className="text-[11px] text-slate-500 hover:text-slate-700 p-0.5"
                                title="Cancel"
                            >
                                <Plus className="w-3.5 h-3.5 rotate-45" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LeadTasksManager({ leadId }) {
    const { hasAnyPermission, loading: permLoading } = usePermissions()
    const queryClient = useQueryClient()
    
    // Fetch tasks using React Query for global caching and pre-fetching
    const { data: tasks = [], isLoading: loading, refetch: fetchTasks } = useLeadTasks(leadId)

    const [createOpen, setCreateOpen]   = useState(false)
    const [editTask, setEditTask]       = useState(null)   // task being edited
    const [submitting, setSubmitting]   = useState(false)
    const [filterPriority, setFilterPriority] = useState('all') // 'all', 'high', 'medium', 'low'
    const [searchQuery, setSearchQuery] = useState('')
    const [teamMembers, setTeamMembers] = useState([])
    const [createForm, setCreateForm]   = useState(EMPTY_FORM)
    const [editForm, setEditForm]       = useState(EMPTY_FORM)
    const [collapsedGroups, setCollapsedGroups] = useState(new Set(['done']))

    const canAssignOthers = !permLoading &&
        hasAnyPermission(['view_team_leads', 'view_all_leads', 'assign_leads'])

    // Smart Sorting & Grouping Logic
    const sortedTasks = [...tasks].sort((a, b) => {
        // 1. Status: Open tasks first
        if (a.status !== b.status) return a.status === 'completed' ? 1 : -1
        
        // 2. Overdue: Extreme urgency
        const aOver = getIsOverdue(a) && a.status !== 'completed'
        const bOver = getIsOverdue(b) && b.status !== 'completed'
        if (aOver !== bOver) return aOver ? -1 : 1

        // 3. Due Date: Closest first (if both have date)
        if (a.due_date && b.due_date) {
            const dateDiff = parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
            if (dateDiff !== 0) return dateDiff
        } else if (a.due_date || b.due_date) {
            return a.due_date ? -1 : 1
        }

        // 4. Priority: High -> Medium -> Low
        const pOrder = { high: 0, medium: 1, low: 2 }
        if (a.priority !== b.priority) return pOrder[a.priority] - pOrder[b.priority]

        // 5. Tie-breaker: Newest created first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const filteredTasks = sortedTasks.filter(task => {
        const matchesPriority = filterPriority === 'all' ? true : task.priority === filterPriority
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             task.description?.toLowerCase().includes(searchQuery.toLowerCase())
                             
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

    const statsData = {
        pending: tasks.filter(t => t.status !== 'completed').length,
        overdue: tasks.filter(t => t.status !== 'completed' && getIsOverdue(t)).length,
        high: tasks.filter(t => t.status !== 'completed' && t.priority === 'high').length
    }


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

    const handleToggle = async (task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        
        // Optimistic update
        queryClient.setQueryData(['lead', leadId, 'tasks'], (old) => 
            old?.map(t => t.id === task.id ? { ...t, status: newStatus } : t) || []
        )

        try {
            const res = await fetch(`/api/leads/${leadId}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) throw new Error()
            toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened', { duration: 2000 })
            queryClient.invalidateQueries({ queryKey: ['lead', leadId, 'tasks'] })
        } catch {
            queryClient.invalidateQueries({ queryKey: ['lead', leadId, 'tasks'] })
            toast.error('Failed to update task')
        }
    }

    const handleDelete = async (taskId) => {
        // Optimistic update
        queryClient.setQueryData(['lead', leadId, 'tasks'], (old) => 
            old?.filter(t => t.id !== taskId) || []
        )

        try {
            const res = await fetch(`/api/leads/${leadId}/tasks/${taskId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Task deleted', { duration: 2000 })
            queryClient.invalidateQueries({ queryKey: ['lead', leadId, 'tasks'] })
        } catch {
            toast.error('Failed to delete task')
            queryClient.invalidateQueries({ queryKey: ['lead', leadId, 'tasks'] })
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
            queryClient.invalidateQueries({ queryKey: ['lead', leadId, 'tasks'] })
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
            queryClient.invalidateQueries({ queryKey: ['lead', leadId, 'tasks'] })
        } catch {
            toast.error('Failed to update task')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-4 py-2 w-full">
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse border" />)}
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-xl border border-border animate-pulse bg-muted/30" />
                ))}
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={0}>
            <div className="space-y-6 w-full">
                {/* Header Analytics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Pending', value: statsData.pending, icon: Clock, color: 'blue' },
                        { label: 'Overdue', value: statsData.overdue, icon: AlertCircle, color: 'red' },
                        { label: 'High Priority', value: statsData.high, icon: Zap, color: 'rose' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <Card key={label} className="border-0 shadow-sm ring-1 ring-gray-100 bg-white">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={cn("p-2.5 rounded-xl", 
                                    color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                                    color === 'red' ? 'bg-red-50 text-red-600' : 
                                    'bg-rose-50 text-rose-600'
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

                <div className="flex flex-col gap-4">
                    {/* Modern Filter Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-xl shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <div className="relative flex-1 max-w-sm group">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <Input 
                                    placeholder="Search tasks by title or details..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs border-slate-100 bg-slate-50/50 rounded-lg focus-visible:ring-indigo-500/20 focus-visible:bg-white transition-all"
                                />
                            </div>
                            <div className="h-6 w-[1px] bg-slate-100 mx-2 hidden sm:block" />
                            <Select value={filterPriority} onValueChange={setFilterPriority}>
                                <SelectTrigger className="w-[140px] h-9 border-slate-100 bg-slate-50/50 rounded-lg text-xs font-semibold focus:ring-indigo-500/20">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-3 h-3 text-slate-400" />
                                        <SelectValue placeholder="Priority" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100">
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    <SelectItem value="high">High Priority</SelectItem>
                                    <SelectItem value="medium">Medium Priority</SelectItem>
                                    <SelectItem value="low">Low Priority</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                            <Button
                                size="sm"
                                className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 font-bold shadow-md active:scale-95 transition-all text-xs shrink-0"
                                onClick={() => setCreateOpen(true)}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Create Task
                            </Button>
                        </div>

                    {/* Task List Groups */}
                    <div className="space-y-8">
                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-slate-200" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">No tasks found</h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Try adjusting your filters or search query to find what you're looking for.</p>
                            </div>
                        ) : (
                            groups.filter(g => g.tasks.length > 0).map(group => {
                                const isCollapsed = collapsedGroups.has(group.id)
                                return (
                                    <div key={group.id} className="space-y-3">
                                        <button 
                                            onClick={() => toggleGroup(group.id)}
                                            className="flex items-center gap-2 px-1 w-full group/header"
                                        >
                                            <div className={cn("p-1 rounded-md transition-colors", group.bg)}>
                                                <group.icon className={cn("w-3.5 h-3.5", group.color)} />
                                            </div>
                                            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 group-hover/header:text-slate-900 transition-colors">
                                                {group.label} 
                                                <span className="ml-2 font-medium text-slate-400">({group.tasks.length})</span>
                                            </h3>
                                            <div className="h-px bg-slate-100 flex-1 ml-2" />
                                            <ChevronDown className={cn(
                                                "w-3.5 h-3.5 text-slate-300 transition-transform duration-200",
                                                isCollapsed ? "-rotate-90" : "rotate-0"
                                            )} />
                                        </button>
                                        
                                        {!isCollapsed && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {group.tasks.map(task => (
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
                                )
                            })
                        )}
                    </div>
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
            </div>
        </TooltipProvider>
    )
}
