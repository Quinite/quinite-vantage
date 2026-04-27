'use client'

import { useMemo, useCallback, useState, useRef } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import {
    format, parse, startOfWeek, getDay,
    startOfWeek as startOfWk, endOfWeek as endOfWk,
} from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { VISIT_STATUS_COLORS } from '@/lib/site-visit-stages'
import SiteVisitEventPopover from './SiteVisitEventPopover'
import BookSiteVisitDialog from './BookSiteVisitDialog'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
})

function CustomToolbar({ date, view, onNavigate, onView }) {
    const label = view === 'month'
        ? format(date, 'MMMM yyyy')
        : view === 'week'
            ? `${format(startOfWk(date, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWk(date, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
            : format(date, 'EEEE, MMMM d')

    return (
        <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onNavigate('PREV')}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium" onClick={() => onNavigate('TODAY')}>
                    Today
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onNavigate('NEXT')}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            <h2 className="text-sm font-semibold text-foreground">{label}</h2>

            <div className="flex items-center bg-muted p-0.5 rounded-lg gap-0.5">
                {['month', 'week', 'day'].map(v => (
                    <button
                        key={v}
                        onClick={() => onView(v)}
                        className={cn(
                            'px-3 py-1 text-xs rounded-md font-medium capitalize transition-all',
                            view === v
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {v}
                    </button>
                ))}
            </div>
        </div>
    )
}

const CALENDAR_CSS = `
  .rbc-sv .rbc-toolbar { display: none; }
  .rbc-sv .rbc-header {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: #9ca3af; padding: 10px 4px 8px;
    border-bottom: 1px solid #f1f5f9;
  }
  .rbc-sv .rbc-month-view { border: none; border-radius: 0; }
  .rbc-sv .rbc-month-row { border-top: 1px solid #f1f5f9; min-height: 100px; }
  .rbc-sv .rbc-day-bg { transition: background 0.15s; }
  .rbc-sv .rbc-day-bg:hover { background: rgba(99,102,241,0.03); }
  .rbc-sv .rbc-off-range-bg { background: rgba(248,250,252,0.8); }
  .rbc-sv .rbc-today { background: rgba(99,102,241,0.04); }
  .rbc-sv .rbc-date-cell { padding: 6px 8px 2px; text-align: right; }
  .rbc-sv .rbc-date-cell .rbc-button-link {
    font-size: 12px; font-weight: 500; color: #6b7280;
    width: 24px; height: 24px; display: inline-flex;
    align-items: center; justify-content: center; border-radius: 50%;
    transition: background 0.15s;
  }
  .rbc-sv .rbc-date-cell .rbc-button-link:hover { background: #f3f4f6; color: #111827; }
  .rbc-sv .rbc-now .rbc-button-link {
    background: #6366f1; color: white; font-weight: 600;
  }
  .rbc-sv .rbc-now .rbc-button-link:hover { background: #4f46e5; }
  .rbc-sv .rbc-off-range .rbc-button-link { color: #d1d5db; }
  .rbc-sv .rbc-event {
    padding: 0; background: transparent; border: none;
    box-shadow: none; border-radius: 6px; overflow: visible;
  }
  .rbc-sv .rbc-event:focus { outline: none; }
  .rbc-sv .rbc-event-content { height: 100%; }
  .rbc-sv .rbc-selected { box-shadow: none; }
  .rbc-sv .rbc-show-more {
    font-size: 11px; color: #6366f1; font-weight: 600;
    padding: 0 8px; background: none;
  }
  .rbc-sv .rbc-show-more:hover { color: #4f46e5; text-decoration: none; }
  .rbc-sv .rbc-row-content { z-index: 1; }
  .rbc-sv .rbc-time-view { border: 1px solid #f1f5f9; border-radius: 8px; }
  .rbc-sv .rbc-time-header { border-bottom: 1px solid #f1f5f9; }
  .rbc-sv .rbc-time-slot { border-top: 1px solid #f9fafb; font-size: 11px; color: #d1d5db; }
  .rbc-sv .rbc-timeslot-group { border-bottom: 1px solid #f1f5f9; }
  .rbc-sv .rbc-current-time-indicator { background: #6366f1; height: 2px; }
  .rbc-sv .rbc-time-content { border-top: 1px solid #f1f5f9; }
  .rbc-sv .rbc-label { font-size: 11px; color: #9ca3af; padding: 0 8px; }
  .rbc-sv .rbc-allday-cell { display: none; }
  .rbc-sv .rbc-header.rbc-today { color: #6366f1; }
`

const STATUS_BAR = {
    scheduled: 'bg-blue-500',
    completed: 'bg-emerald-500',
    no_show:   'bg-red-500',
    cancelled: 'bg-zinc-400',
}

function EventComponent({ event }) {
    const barColor = STATUS_BAR[event.status] ?? STATUS_BAR.scheduled
    const time = format(event.start, 'h:mm a')
    return (
        <div className="flex h-full rounded-[5px] overflow-hidden bg-white dark:bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
            <div className={cn('w-[3px] shrink-0', barColor)} />
            <div className="flex-1 px-1.5 py-0.5 min-w-0 flex items-center gap-1 overflow-hidden">
                <span className="text-[11px] font-medium text-foreground truncate leading-tight">{event.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 leading-tight">{time}</span>
            </div>
        </div>
    )
}

export default function SiteVisitCalendar({ visits = [], onDateRangeChange }) {
    const containerRef = useRef(null)
    const [popover, setPopover] = useState(null)
    const [editVisit, setEditVisit] = useState(null)
    const [newVisitDate, setNewVisitDate] = useState(null)
    const [calView, setCalView] = useState('month')

    const components = useMemo(() => ({ toolbar: CustomToolbar, event: EventComponent }), [])

    const events = useMemo(() => visits.map(v => ({
        id:       v.id,
        leadId:   v.leads?.id,
        title:    v.leads?.name ?? 'Unknown Lead',
        start:    new Date(v.scheduled_at),
        end:      new Date(new Date(v.scheduled_at).getTime() + 60 * 60 * 1000),
        status:   v.status,
        visitObj: v,
    })), [visits])

    const handleSelectSlot = useCallback(({ start }) => {
        setPopover(null)
        setNewVisitDate(start)
    }, [])

    const handleSelectEvent = useCallback((event, e) => {
        if (!containerRef.current) return
        const containerRect = containerRef.current.getBoundingClientRect()
        const targetRect = e.currentTarget.getBoundingClientRect()
        const left = targetRect.left - containerRect.left + targetRect.width / 2
        const top  = targetRect.top - containerRect.top - 8
        setPopover({ visit: event.visitObj, top, left })
    }, [])

    const handleRangeChange = useCallback((range) => {
        let from, to
        if (Array.isArray(range)) { from = range[0]; to = range[range.length - 1] }
        else { from = range.start; to = range.end }
        onDateRangeChange?.({ from: from.toISOString(), to: to.toISOString() })
    }, [onDateRangeChange])

    return (
        <div ref={containerRef} className="relative h-full rbc-sv">
            <style>{CALENDAR_CSS}</style>
            <Calendar
                localizer={localizer}
                events={events}
                views={['month', 'week', 'day']}
                view={calView}
                onView={setCalView}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                onRangeChange={handleRangeChange}
                components={components}
                popup
                style={{ height: '100%' }}
            />

            {popover && (
                <SiteVisitEventPopover
                    visit={popover.visit}
                    style={{ top: popover.top, left: popover.left }}
                    onClose={() => setPopover(null)}
                    onEditClick={(v) => setEditVisit(v)}
                />
            )}

            {editVisit && (
                <BookSiteVisitDialog
                    open={!!editVisit}
                    onOpenChange={(open) => { if (!open) setEditVisit(null) }}
                    leadId={editVisit?.leads?.id}
                    visit={editVisit}
                />
            )}

            {newVisitDate && (
                <BookSiteVisitDialog
                    key={newVisitDate.getTime()}
                    open={!!newVisitDate}
                    onOpenChange={(open) => { if (!open) setNewVisitDate(null) }}
                    defaultDate={newVisitDate}
                />
            )}
        </div>
    )
}
