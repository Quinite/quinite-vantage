'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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

      {/* Construction status radio cards */}
      <div>
        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">
          Construction Status
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {CONSTRUCTION_OPTIONS.map((opt) => {
            const active = formData.construction_status === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormData(p => ({ ...p, construction_status: opt.value }))}
                className={cn(
                  'relative flex flex-col items-center text-center px-2 py-3 rounded-xl border-[1.5px] transition-all cursor-pointer',
                  active
                    ? `border-solid ${opt.colors.border} ${opt.colors.bg}`
                    : 'border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                )}
              >
                {active && (
                  <span className={cn(
                    'absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold',
                    opt.colors.badge
                  )}>
                    ✓
                  </span>
                )}
                <span className="text-xl mb-1.5">{opt.icon}</span>
                <span className={cn('text-[11px] font-bold leading-tight', active ? 'text-slate-900' : 'text-slate-600')}>
                  {opt.label}
                </span>
                <span className={cn('text-[9px] mt-0.5', active ? 'text-slate-500' : 'text-slate-400')}>
                  {opt.subtitle}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Date pickers */}
      {(showPossessionDate || showCompletionDate) && (
        <div className={cn("gap-3", isCompleted ? "flex flex-col" : "grid grid-cols-2")}>
          {showPossessionDate && (
            <DatePicker
              label="Possession Date"
              value={formData.possession_date}
              onChange={(v) => setFormData(p => ({ ...p, possession_date: v }))}
            />
          )}
          {showCompletionDate && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Completion Date</Label>
                {isCompleted && (
                  unitAge ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                      <Clock className="w-2.5 h-2.5" />{unitAge}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-semibold border border-slate-200">
                      <Clock className="w-2.5 h-2.5" />Age unknown
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
      )}

      <div className="border-t border-slate-50" />

      {/* Linked lead picker */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
            <User className="w-3 h-3" /> Linked Buyer / Lead
          </Label>
          {formData.lead_id && (
            <button
              type="button"
              onClick={() => setFormData(p => ({ ...p, lead_id: null }))}
              className="text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
        </div>

        <Popover open={openLeadPicker} onOpenChange={setOpenLeadPicker}>
          <PopoverTrigger asChild>
            <div
              role="button"
              className={cn(
                'w-full cursor-pointer flex items-center justify-between px-3 py-2.5 rounded-xl border-[1.5px] transition-all',
                formData.lead_id
                  ? 'border-solid border-emerald-300 bg-emerald-50'
                  : 'border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  formData.lead_id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                )}>
                  {formData.lead_id ? <User className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div className="flex flex-col">
                  {formData.lead_id && selectedLead ? (
                    <>
                      <span className="text-[12px] font-bold text-slate-900 leading-tight">{selectedLead.name}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">{selectedLead.phone || 'No phone'}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[12px] font-bold text-slate-500 leading-tight">🔍 Search and link a lead</span>
                      <span className="text-[10px] text-slate-400">Only leads assigned to this project</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden"
            align="start"
          >
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-2">
                <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                <CommandInput
                  placeholder="Find lead..."
                  value={leadSearch}
                  onValueChange={setLeadSearch}
                  className="h-10 border-none focus:ring-0 text-[11px] font-bold"
                />
              </div>
              <CommandList className="max-h-[200px]">
                <CommandEmpty className="p-6 text-center text-slate-400 text-[10px] font-bold uppercase">
                  No leads found.
                </CommandEmpty>
                <CommandGroup className="p-2">
                  {leads.map((lead) => (
                    <CommandItem
                      key={lead.id}
                      onSelect={() => {
                        setFormData(p => ({
                          ...p,
                          lead_id: lead.id,
                          _lead_name: lead.name,
                          _lead_phone: lead.phone,
                        }))
                        setOpenLeadPicker(false)
                      }}
                      className="rounded-lg py-2 hover:bg-slate-50 mb-0.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <span className="text-[9px] font-bold uppercase">{lead.name?.[0] || '?'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-800">{lead.name}</span>
                          <span className="text-[9px] text-slate-400">{lead.phone || lead.email}</span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
