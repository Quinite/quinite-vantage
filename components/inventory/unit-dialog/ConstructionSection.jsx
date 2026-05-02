'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Search, User, UserPlus, ChevronRight, X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLeads } from '@/hooks/useLeads'
import { format, differenceInYears, differenceInMonths } from 'date-fns'

const CONSTRUCTION_OPTIONS = [
  {
    value: 'under_construction',
    icon: '🏗️',
    label: 'Under Construction',
    subtitle: 'Work in progress',
    colors: { border: 'border-amber-400', bg: 'bg-amber-50', badge: 'bg-amber-400' },
  },
  {
    value: 'ready_to_move',
    icon: '🔑',
    label: 'Ready to Move',
    subtitle: 'Keys available',
    colors: { border: 'border-green-400', bg: 'bg-green-50', badge: 'bg-green-400' },
  },
  {
    value: 'completed',
    icon: '🏁',
    label: 'Completed',
    subtitle: 'Fully handed over',
    colors: { border: 'border-blue-400', bg: 'bg-blue-50', badge: 'bg-blue-400' },
  },
]

function DatePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false)
  const parsed = value ? new Date(value) : undefined

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full h-9 flex items-center gap-2 px-3 rounded-xl border text-sm font-semibold transition-all',
              parsed
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left text-[12px]">
              {parsed ? format(parsed, 'dd MMM yyyy') : 'Pick a date'}
            </span>
            {parsed && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onChange(null) }}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-slate-100" align="start">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(d) => { onChange(d ? format(d, 'yyyy-MM-dd') : null); setOpen(false) }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default function ConstructionSection({ formData, setFormData }) {
  const [openLeadPicker, setOpenLeadPicker] = useState(false)
  const [leadSearch, setLeadSearch] = useState('')
  const { data: leadsData } = useLeads({ search: leadSearch, limit: 10 })
  const leads = leadsData?.leads || []

  const selectedLead = leads.find(l => l.id === formData.lead_id) ||
    (formData.lead_id ? { id: formData.lead_id, name: formData._lead_name || 'Linked Lead', phone: formData._lead_phone || '' } : null)

  const isCompleted = formData.construction_status === 'completed'
  const showPossessionDate = formData.construction_status === 'under_construction'
  const showCompletionDate = formData.construction_status !== 'under_construction'

  const unitAge = (() => {
    if (!isCompleted || !formData.completion_date) return null;
    const completedOn = new Date(formData.completion_date);
    const now = new Date();
    if (now < completedOn) return null;
    const years = differenceInYears(now, completedOn);
    const months = differenceInMonths(now, completedOn) % 12;
    if (years === 0 && months === 0) return 'Less than a month old';
    const parts = [];
    if (years > 0) parts.push(`${years} yr${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} mo`);
    return parts.join(' ') + ' old';
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
      {/* Section header */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
        <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center text-xs">🏗️</div>
        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
          Construction &amp; Handover
        </span>
      </div>

      {/* Construction status & dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Construction Status
          </Label>
          <Select
            value={formData.construction_status || 'under_construction'}
            onValueChange={(v) => setFormData(p => ({ ...p, construction_status: v }))}
          >
            <SelectTrigger className="h-9 rounded-xl border font-semibold text-sm px-3 bg-slate-50 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {CONSTRUCTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="py-2 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{opt.icon}</span>
                    <span className="font-semibold text-xs leading-none">{opt.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showPossessionDate && (
          <DatePicker
            label="Possession Date"
            value={formData.possession_date}
            onChange={(v) => setFormData(p => ({ ...p, possession_date: v }))}
          />
        )}
        
        {showCompletionDate && (
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Completion Date</Label>
              {isCompleted && (
                unitAge ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold border border-blue-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                    <Clock className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{unitAge}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 text-[9px] font-semibold border border-slate-200 whitespace-nowrap">
                    <Clock className="w-2.5 h-2.5 shrink-0" />Age unknown
                  </span>
                )
              )}
            </div>
            <DatePicker
              value={formData.completion_date}
              onChange={(v) => setFormData(p => ({ ...p, completion_date: v }))}
            />
          </div>
        )}
      </div>

      <div className="border-t border-slate-50" />

    </div>
  )
}
