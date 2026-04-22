'use client'

import { useMemo, useCallback, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { VISIT_STATUS_COLORS } from '@/lib/site-visit-stages'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'en-US': enUS }

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
})

function EventComponent({ event }) {
    const colors = VISIT_STATUS_COLORS[event.status] ?? VISIT_STATUS_COLORS.scheduled
    return (
        <div className={cn('px-1.5 py-0.5 rounded text-[11px] font-medium truncate h-full flex items-center gap-1', colors.bg, colors.text)}>
            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-70" />
            <span className="truncate">{event.title}</span>
        </div>
    )
}

export default function SiteVisitCalendar({ visits = [], onDateRangeChange }) {
    const router = useRouter()
    const [view, setView] = useState('week')

    const events = useMemo(() => visits.map(v => ({
        id:       v.id,
        leadId:   v.leads?.id,
        title:    v.leads?.name ?? 'Unknown Lead',
        start:    new Date(v.scheduled_at),
        end:      new Date(new Date(v.scheduled_at).getTime() + 60 * 60 * 1000),
        status:   v.status,
        visitObj: v,
    })), [visits])

    const handleSelectEvent = useCallback((event) => {
        if (event.leadId) router.push(`/dashboard/admin/crm/leads/${event.leadId}`)
    }, [router])

    const handleRangeChange = useCallback((range) => {
        let from, to
        if (Array.isArray(range)) {
            from = range[0]
            to   = range[range.length - 1]
        } else {
            from = range.start
            to   = range.end
        }
        onDateRangeChange?.({ from: from.toISOString(), to: to.toISOString() })
    }, [onDateRangeChange])

    return (
        <div className="h-full rbc-site-visits">
            <style>{`
                .rbc-site-visits .rbc-toolbar { margin-bottom: 16px; }
                .rbc-site-visits .rbc-toolbar button {
                    border-radius: 8px; font-size: 13px; padding: 5px 12px;
                    border-color: #e2e8f0; color: #374151;
                }
                .rbc-site-visits .rbc-toolbar button.rbc-active,
                .rbc-site-visits .rbc-toolbar button:hover {
                    background: #4f46e5; color: white; border-color: #4f46e5; box-shadow: none;
                }
                .rbc-site-visits .rbc-header {
                    font-size: 12px; font-weight: 600; padding: 8px 4px; color: #6b7280;
                }
                .rbc-site-visits .rbc-event { padding: 0; background: transparent; border: none; box-shadow: none; }
                .rbc-site-visits .rbc-event:focus { outline: 2px solid #4f46e5; outline-offset: 1px; }
                .rbc-site-visits .rbc-today { background: rgba(79, 70, 229, 0.04); }
                .rbc-site-visits .rbc-time-slot { font-size: 11px; color: #9ca3af; }
                .rbc-site-visits .rbc-off-range-bg { background: rgba(243, 244, 246, 0.6); }
                .rbc-site-visits .rbc-show-more { font-size: 11px; color: #4f46e5; font-weight: 500; }
                .rbc-site-visits .rbc-month-row { min-height: 80px; }
            `}</style>
            <Calendar
                localizer={localizer}
                events={events}
                defaultView="week"
                views={['month', 'week', 'day']}
                view={view}
                onView={setView}
                onSelectEvent={handleSelectEvent}
                onRangeChange={handleRangeChange}
                components={{ event: EventComponent }}
                popup
                style={{ height: '100%' }}
            />
        </div>
    )
}
