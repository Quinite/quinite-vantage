'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Phone, Mail, MessageCircle, MessageSquare, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

const CONTACT_METHODS = [
    { id: 'phone',    label: 'Phone',     Icon: Phone         },
    { id: 'whatsapp', label: 'WhatsApp',  Icon: MessageCircle },
    { id: 'email',    label: 'Email',     Icon: Mail          },
    { id: 'sms',      label: 'SMS',       Icon: MessageSquare },
]

const CONTACT_DAYS = [
    { id: 'any',      label: 'Any Day'  },
    { id: 'weekdays', label: 'Weekdays' },
    { id: 'weekends', label: 'Weekends' },
]

const TIME_SLOTS = [
    { id: 'morning',   label: 'Morning',   sub: '9am – 12pm'  },
    { id: 'afternoon', label: 'Afternoon', sub: '12pm – 4pm'  },
    { id: 'evening',   label: 'Evening',   sub: '4pm – 7pm'   },
    { id: 'night',     label: 'Night',     sub: '7pm – 10pm'  },
]

function parseContactTime(str) {
    if (!str) return { days: '', slot: '' }
    const lower = str.toLowerCase()
    const days = lower.includes('weekend') ? 'weekends'
               : lower.includes('weekday') ? 'weekdays'
               : lower.includes('any')     ? 'any'
               : ''
    const slot = lower.includes('morning')   ? 'morning'
               : lower.includes('afternoon') ? 'afternoon'
               : lower.includes('evening')   ? 'evening'
               : lower.includes('night')     ? 'night'
               : ''
    return { days, slot }
}

function composeContactTime(days, slot) {
    const daysLabel = CONTACT_DAYS.find(d => d.id === days)?.label || ''
    const slotObj   = TIME_SLOTS.find(s => s.id === slot)
    const slotStr   = slotObj ? `${slotObj.label} (${slotObj.sub})` : ''
    return [daysLabel, slotStr].filter(Boolean).join(', ')
}

function FieldLabel({ icon: Icon, children }) {
    return (
        <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span className="text-xs font-semibold uppercase tracking-wide">{children}</span>
        </div>
    )
}

function PillButton({ label, sub, Icon, selected, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all whitespace-nowrap',
                selected
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm ring-2 ring-purple-100'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
        >
            {Icon && <Icon className="w-3 h-3 shrink-0" />}
            <span>{label}</span>
            {sub && <span className={cn('text-[10px] font-normal', selected ? 'text-purple-500' : 'text-gray-400')}>{sub}</span>}
        </button>
    )
}

export default function BestTimeToContactCard({ lead, leadId, onUpdate }) {
    const parsed = parseContactTime(lead?.best_contact_time)

    const [method, setMethodState] = useState(lead?.preferred_contact_method || '')
    const [days,   setDaysState]   = useState(parsed.days)
    const [slot,   setSlotState]   = useState(parsed.slot)
    const [saveStatus, setSaveStatus] = useState('idle')

    const saveTimeoutRef = useRef(null)
    const lastSavedRef   = useRef({ method, days, slot })

    useEffect(() => {
        if (lead) {
            const p = parseContactTime(lead.best_contact_time)
            setMethodState(lead.preferred_contact_method || '')
            setDaysState(p.days)
            setSlotState(p.slot)
            lastSavedRef.current = { method: lead.preferred_contact_method || '', days: p.days, slot: p.slot }
        }
    }, [lead])

    const autoSave = useCallback(async (data) => {
        try {
            setSaveStatus('saving')
            const res = await fetch(`/api/leads/${leadId}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferred_contact_method: data.method || null,
                    best_contact_time: composeContactTime(data.days, data.slot) || null,
                }),
            })
            if (!res.ok) throw new Error('Failed to save')
            lastSavedRef.current = data
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
            if (onUpdate) onUpdate()
        } catch {
            toast.error('Failed to save changes')
            setSaveStatus('idle')
            const last = lastSavedRef.current
            setMethodState(last.method)
            setDaysState(last.days)
            setSlotState(last.slot)
        }
    }, [leadId, onUpdate])

    const triggerSave = useCallback((data) => {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => autoSave(data), 400)
    }, [autoSave])

    const setMethod = (val) => {
        const next = val === method ? '' : val
        setMethodState(next)
        triggerSave({ method: next, days, slot })
    }
    const setDays = (val) => {
        const next = val === days ? '' : val
        setDaysState(next)
        triggerSave({ method, days: next, slot })
    }
    const setSlot = (val) => {
        const next = val === slot ? '' : val
        setSlotState(next)
        triggerSave({ method, days, slot: next })
    }

    return (
        <Card className="h-full border-0 shadow-sm ring-1 ring-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 mb-2 bg-gradient-to-r from-purple-50/50 to-transparent">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shadow-sm">
                        <Clock className="w-4 h-4 fill-purple-700/20" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-gray-900">Best Time to Contact</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Availability & preferred channel</p>
                    </div>
                </div>
                {saveStatus !== 'idle' && (
                    <div className="flex items-center gap-1.5 text-xs">
                        {saveStatus === 'saving' && (
                            <>
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                                <span className="text-purple-600 font-medium">Saving...</span>
                            </>
                        )}
                        {saveStatus === 'saved' && (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-medium">Saved</span>
                            </>
                        )}
                    </div>
                )}
            </CardHeader>

            <CardContent className="px-5 pb-5 space-y-5">

                {/* Contact Method */}
                <div>
                    <FieldLabel icon={Phone}>Preferred Channel</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                        {CONTACT_METHODS.map(m => (
                            <PillButton
                                key={m.id}
                                label={m.label}
                                Icon={m.Icon}
                                selected={method === m.id}
                                onClick={() => setMethod(m.id)}
                            />
                        ))}
                    </div>
                </div>

                <div className="border-t border-dashed border-gray-200" />

                {/* Best Days */}
                <div>
                    <FieldLabel icon={Clock}>Best Days</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                        {CONTACT_DAYS.map(d => (
                            <PillButton
                                key={d.id}
                                label={d.label}
                                selected={days === d.id}
                                onClick={() => setDays(d.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Time Slot */}
                <div>
                    <FieldLabel icon={Clock}>Time of Day</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                        {TIME_SLOTS.map(s => (
                            <PillButton
                                key={s.id}
                                label={s.label}
                                sub={s.sub}
                                selected={slot === s.id}
                                onClick={() => setSlot(s.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Composed preview */}
                {(days || slot || method) && (
                    <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-xs text-purple-700">
                        <span className="font-semibold">Summary: </span>
                        {[
                            CONTACT_METHODS.find(m => m.id === method)?.label,
                            composeContactTime(days, slot),
                        ].filter(Boolean).join(' · ')}
                    </div>
                )}

            </CardContent>
        </Card>
    )
}
