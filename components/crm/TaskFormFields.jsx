'use client'

import { format, parseISO } from 'date-fns'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert an existing task object into the flat formData shape used by task forms.
 */
export function taskToFormData(task) {
    const d = task?.due_date ? parseISO(task.due_date) : null
    return {
        title:       task?.title       || '',
        description: task?.description || '',
        due_date:    d ? format(d, 'yyyy-MM-dd') : '',
        due_time:    task?.due_time
                        || (d && (d.getHours() !== 0 || d.getMinutes() !== 0)
                            ? format(d, 'HH:mm')
                            : ''),
        priority:    task?.priority    || 'medium',
        assigned_to: task?.assigned_to || 'none',
    }
}

/**
 * Build the API payload from formData, combining due_date + due_time into a
 * single ISO datetime string for the due_date column.
 */
export function formDataToPayload(formData) {
    const combinedDate = formData.due_date
        ? (formData.due_time
            ? `${formData.due_date}T${formData.due_time}`
            : formData.due_date)
        : null
    return {
        title:       formData.title,
        description: formData.description || null,
        due_date:    combinedDate,
        due_time:    formData.due_time || null,
        priority:    formData.priority,
        assigned_to: formData.assigned_to === 'none' ? null : formData.assigned_to,
    }
}

export const EMPTY_FORM = {
    title: '', description: '', due_date: '', due_time: '', priority: 'medium', assigned_to: 'none',
}

// ─── Shared Form Fields ───────────────────────────────────────────────────────

/**
 * Renders all task form fields. Designed to be dropped into any create/edit
 * dialog or inline form that manages its own state.
 *
 * Props:
 *   formData         – { title, description, due_date, due_time, priority, assigned_to }
 *   onChange         – (field: string, value: string) => void
 *   teamMembers      – array of { id, full_name, email }
 *   canAssignOthers  – boolean
 *   compact          – boolean, uses smaller spacing (for inline edit forms)
 */
export default function TaskFormFields({
    formData,
    onChange,
    teamMembers = [],
    canAssignOthers = false,
    compact = false,
}) {
    const sp = compact ? 'space-y-2' : 'space-y-3'
    const lc = compact ? 'text-xs text-muted-foreground' : undefined
    const ih = compact ? 'h-8 text-sm' : undefined

    // Convert 'yyyy-MM-dd' string → Date object for the Calendar component
    const selectedDate = formData.due_date ? new Date(formData.due_date + 'T00:00:00') : undefined

    return (
        <div className={sp}>
            {/* Title */}
            <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                <Label className={lc}>
                    Title <span className="text-red-500">*</span>
                </Label>
                <Input
                    value={formData.title}
                    onChange={e => onChange('title', e.target.value)}
                    placeholder="What needs to be done?"
                    className={ih}
                    autoFocus={!compact}
                    required
                />
            </div>

            {/* Description */}
            <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                <Label className={lc}>
                    Description{' '}
                    {!compact && (
                        <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                    )}
                </Label>
                <Textarea
                    value={formData.description}
                    onChange={e => onChange('description', e.target.value)}
                    placeholder="Add details..."
                    rows={compact ? 2 : 2}
                    className={cn('resize-none', compact ? 'text-sm' : 'text-sm')}
                />
            </div>

            {/* Due Date + Due Time */}
            <div className="grid grid-cols-2 gap-3">
                <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                    <Label className={lc}>Due Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    'w-full justify-start text-left font-normal',
                                    compact ? 'h-8 text-xs' : 'h-9 text-sm',
                                    !formData.due_date && 'text-muted-foreground'
                                )}
                            >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                                {formData.due_date
                                    ? format(selectedDate, 'MMM d, yyyy')
                                    : 'Pick a date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={date =>
                                    onChange('due_date', date ? format(date, 'yyyy-MM-dd') : '')
                                }
                                initialFocus
                            />
                            {formData.due_date && (
                                <div className="border-t p-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full h-7 text-xs text-muted-foreground"
                                        onClick={() => onChange('due_date', '')}
                                    >
                                        Clear date
                                    </Button>
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>
                </div>

                <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                    <Label className={lc}>Time</Label>
                    <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            type="time"
                            value={formData.due_time}
                            onChange={e => onChange('due_time', e.target.value)}
                            onClick={(e) => e.currentTarget.showPicker()}
                            className={cn(
                                'pl-9 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden', 
                                compact ? 'h-8 text-xs' : 'h-9 text-sm'
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Priority + Assign To */}
            <div className={cn('grid gap-3', canAssignOthers && teamMembers.length > 0 ? 'grid-cols-2' : 'grid-cols-1')}>
                <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                    <Label className={lc}>Priority</Label>
                    <Select
                        value={formData.priority}
                        onValueChange={v => onChange('priority', v)}
                    >
                        <SelectTrigger className={compact ? 'h-8 text-xs' : 'h-9 text-sm'}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {canAssignOthers && teamMembers.length > 0 && (
                    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                        <Label className={lc}>Assign To</Label>
                        <Select
                            value={formData.assigned_to}
                            onValueChange={v => onChange('assigned_to', v)}
                        >
                            <SelectTrigger className={compact ? 'h-8 text-xs' : 'h-9 text-sm'}>
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
            </div>
        </div>
    )
}
