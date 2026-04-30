'use client'

import { Label } from '@/components/ui/label'
import { IndianRupee, TrendingUp, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINR } from '@/lib/inventory'

function NumInput({ label, value, onChange, placeholder, hint }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</Label>
      <div className="relative">
        <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        <input
          type="number"
          min="0"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder={placeholder}
          className="w-full h-9 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
        />
      </div>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  )
}

function AreaInput({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</Label>
      <div className="relative">
        <input
          type="number"
          min="0"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder={placeholder || '0'}
          className="w-full h-9 px-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">sqft</span>
      </div>
    </div>
  )
}

function RoomInput({ label, value, onChange, icon }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
        <span className="mr-1">{icon}</span>{label}
      </Label>
      <input
        type="number"
        min="0"
        max="20"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder="0"
        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all text-center"
      />
    </div>
  )
}

export default function PricingSection({
  formData,
  setFormData,
  isResidential,
  isLand,
  finalPrice,
  selectedConfig,
}) {
  const set = (key) => (val) => setFormData(p => ({ ...p, [key]: val }))

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
      {/* Section header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center text-xs">💰</div>
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
            Pricing &amp; Area
          </span>
        </div>
        {finalPrice > 0 && (
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span className="text-[11px] font-extrabold text-emerald-700">{formatINR(finalPrice)} total</span>
          </div>
        )}
      </div>

      {/* Price row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <NumInput
            label="Base Price"
            value={formData.base_price}
            onChange={set('base_price')}
            placeholder="0"
            hint="Per unit base"
          />
          <button
            type="button"
            onClick={() => setFormData(p => ({ ...p, price_undisclosed: !p.price_undisclosed }))}
            className={cn(
              "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-all duration-150",
              formData.price_undisclosed
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
            )}
          >
            <span className={cn(
              "relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full border transition-colors",
              formData.price_undisclosed ? "bg-amber-400 border-amber-400" : "bg-slate-200 border-slate-200"
            )}>
              <span className={cn(
                "inline-block h-2.5 w-2.5 rounded-full bg-white shadow transition-transform",
                formData.price_undisclosed ? "translate-x-2.5" : "translate-x-0.5"
              )} />
            </span>
            <EyeOff className="w-2.5 h-2.5 shrink-0" />
            Do not disclose on AI calls
          </button>
        </div>
        <NumInput
          label="Floor Rise"
          value={formData.floor_rise_price}
          onChange={set('floor_rise_price')}
          placeholder="0"
          hint="Per floor premium"
        />
        <NumInput
          label="PLC"
          value={formData.plc_price}
          onChange={set('plc_price')}
          placeholder="0"
          hint="Preferred location"
        />
      </div>

      <div className="border-t border-slate-50" />

      {/* Area row */}
      {isLand ? (
        <div className="grid grid-cols-1 gap-3">
          <AreaInput
            label="Plot Area"
            value={formData.plot_area}
            onChange={set('plot_area')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <AreaInput
            label="Carpet Area"
            value={formData.carpet_area}
            onChange={set('carpet_area')}
          />
          <AreaInput
            label="Built-up Area"
            value={formData.built_up_area}
            onChange={set('built_up_area')}
          />
          <AreaInput
            label="Super Built-up"
            value={formData.super_built_up_area}
            onChange={set('super_built_up_area')}
          />
        </div>
      )}

      {/* Computed total */}
      {finalPrice > 0 && (
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Computed Total Price</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Base Price + Floor Rise + PLC</p>
          </div>
          <p className="text-lg font-extrabold text-blue-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {formatINR(finalPrice)}
          </p>
        </div>
      )}

      {/* Residential rooms */}
      {isResidential && (
        <>
          <div className="border-t border-slate-50" />
          {selectedConfig && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-xl px-3 py-2.5">
              <span className="text-base">🛏️</span>
              <p className="text-xs text-slate-600">
                Residential config —{' '}
                <span className="font-semibold">pre-filled from {selectedConfig.config_name || selectedConfig.property_type}</span>
                , override per unit if needed.
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <RoomInput
              label="Bedrooms"
              icon="🛏️"
              value={formData.bedrooms}
              onChange={set('bedrooms')}
            />
            <RoomInput
              label="Bathrooms"
              icon="🚿"
              value={formData.bathrooms}
              onChange={set('bathrooms')}
            />
            <RoomInput
              label="Balconies"
              icon="🌿"
              value={formData.balconies}
              onChange={set('balconies')}
            />
          </div>
        </>
      )}
    </div>
  )
}
