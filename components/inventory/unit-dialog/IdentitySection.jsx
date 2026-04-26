'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { Sparkles, ChevronRight, ChevronDown, Check, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusConfig, formatINR } from '@/lib/inventory'
import AmenitiesDisplay from '@/components/amenities/AmenitiesDisplay'
import AmenitiesPicker from '@/components/amenities/AmenitiesPicker'
import FeatureChip from './FeatureChip'

const STATUS_OPTIONS = ['available', 'reserved', 'sold']
const FACING_OPTIONS = ['None', 'North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']

const CATEGORY_COLORS = {
  residential: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
  commercial:  { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' },
  land:        { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
}

function ConfigPicker({ unitConfigs, value, onValueChange }) {
  const [open, setOpen] = useState(false)
  const selected = unitConfigs.find(c => c.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full h-9 flex items-center justify-between gap-2 px-2.5 rounded-xl border text-left transition-all',
            selected
              ? 'bg-white border-blue-200 ring-1 ring-blue-100 shadow-sm'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          )}
        >
          {selected ? (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold text-slate-800 truncate leading-tight">
                {selected.config_name || selected.property_type}
              </p>
              <div className="flex items-center gap-1.5">
                {selected.carpet_area && (
                  <span className="text-[9px] text-slate-400 font-medium">{selected.carpet_area} sqft</span>
                )}
                {selected.base_price && (
                  <>
                    <span className="text-[8px] text-slate-300">·</span>
                    <span className="text-[9px] font-bold text-blue-600">
                      {formatINR(selected.base_price)}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <span className="text-[12px] text-slate-400 font-medium">Select config…</span>
          )}
          <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-1.5 rounded-2xl shadow-2xl border-slate-100 bg-white"
        style={{ width: 'var(--radix-popover-trigger-width)', minWidth: '240px' }}
        align="start"
        sideOffset={4}
      >
        {unitConfigs.length === 0 ? (
          <p className="text-[10px] text-slate-400 text-center py-3">No configs available.</p>
        ) : (
          <div className="space-y-1">
            {unitConfigs.map((c) => {
              const isSelected = c.id === value
              const cat = c.category || 'residential'
              const cc = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.residential
              const area = c.carpet_area || c.plot_area || 0
              const bedroomsMatch = c.config_name?.match(/(\d+)\s*(?:bhk|bed)/i)
              const beds = bedroomsMatch ? bedroomsMatch[1] : null
              const nameHasBhk = c.config_name?.toLowerCase().includes('bhk') || c.config_name?.toLowerCase().includes('bed')

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onValueChange(c.id); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all text-left',
                    isSelected
                      ? 'bg-blue-50 ring-1 ring-blue-200'
                      : 'hover:bg-slate-50'
                  )}
                >
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11.5px] font-bold text-slate-800 truncate">
                          {c.config_name || c.property_type}
                        </span>
                        {beds && !nameHasBhk && (
                          <span className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1 py-0.5 rounded-md uppercase flex-shrink-0">
                            {beds} BHK
                          </span>
                        )}
                      </div>
                      {c.base_price > 0 && (
                        <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                          {formatINR(c.base_price)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md', cc.bg, cc.text)}>
                        {c.property_type || cat}
                      </span>
                      {area > 0 && (
                        <span className="text-[9px] text-slate-400 font-medium">{area} sqft</span>
                      )}
                    </div>
                  </div>

                  {/* Check */}
                  {isSelected && (
                    <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default function IdentitySection({
  formData,
  setFormData,
  unitConfigs,
  onConfigChange,
  selectedConfig,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
      {/* Section header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center text-xs">🏷️</div>
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
            Identity &amp; Configuration
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          <span className="text-rose-400">*</span> Required
        </span>
      </div>

      {/* Row 1: Unit number + Config + Transaction */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Unit Number <span className="text-rose-400">*</span>
          </Label>
          <Input
            value={formData.unit_number || ''}
            onChange={(e) => setFormData(p => ({ ...p, unit_number: e.target.value }))}
            placeholder="e.g. A-F01"
            required
            className="h-9 bg-slate-50 border-slate-200 rounded-xl font-semibold text-sm focus:bg-white transition-all"
          />
          <p className="text-[10px] text-slate-400">🔁 Auto-gen · editable</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Type / Config <span className="text-rose-400">*</span>
          </Label>
          <ConfigPicker
            unitConfigs={unitConfigs}
            value={formData.config_id || ''}
            onValueChange={onConfigChange}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Transaction</Label>
          <div className="flex bg-slate-100 p-0.5 rounded-xl h-9 gap-0.5">
            {['sell', 'rent'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormData(p => ({ ...p, transaction_type: t }))}
                className={cn(
                  'flex-1 rounded-[10px] text-xs font-bold uppercase transition-all',
                  formData.transaction_type === t
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-100'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: (Status + Facing) in one col, Features in other */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Status</Label>
            <Select
              value={formData.status || 'available'}
              onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}
            >
              <SelectTrigger
                className={cn(
                  'h-9 rounded-xl border font-bold text-sm transition-all px-3',
                  getStatusConfig(formData.status).bg,
                  getStatusConfig(formData.status).text,
                  'border-current/20'
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="py-1.5 rounded-lg">
                    <div className="flex items-center gap-2 font-semibold text-xs capitalize">
                      <div className={cn('w-1.5 h-1.5 rounded-full', getStatusConfig(opt).dot)} />
                      {opt.replace(/_/g, ' ')}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Facing Direction</Label>
            <Select
              value={formData.facing || 'North'}
              onValueChange={(v) => setFormData(p => ({ ...p, facing: v }))}
            >
              <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-xl font-semibold text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {FACING_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="font-semibold text-xs">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Unit Features</Label>
          <div className="space-y-1.5">
            <FeatureChip
              icon="📐"
              label="Corner Unit"
              descOn="2-sided frontage · premium"
              descOff="Tap to mark as corner"
              value={formData.is_corner}
              onChange={(v) => setFormData(p => ({ ...p, is_corner: v }))}
              colorOn="amber"
            />
            <FeatureChip
              icon="🧭"
              label="Vastu Compliant"
              descOn="Directional alignment ✓"
              descOff="Tap to mark as aligned"
              value={formData.is_vastu_compliant}
              onChange={(v) => setFormData(p => ({ ...p, is_vastu_compliant: v }))}
              colorOn="green"
            />
          </div>
        </div>
      </div>

      {/* Amenities — always shown once a config is selected */}
      {selectedConfig && (
        <div className="space-y-1.5 pt-1">
          <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Unit Amenities
          </Label>
          <AmenitiesPicker
            context="unit"
            value={formData.amenities !== null ? formData.amenities : (selectedConfig.amenities || [])}
            onChange={(ids) => setFormData(p => ({ ...p, amenities: ids }))}
            variant="compact"
          />
          {formData.amenities !== null && (
            <button
              type="button"
              onClick={() => setFormData(p => ({ ...p, amenities: null }))}
              className="text-[9px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-tight"
            >
              ✕ Reset to config defaults
            </button>
          )}
        </div>
      )}
    </div>
  )
}
