'use client'

import { cn } from '@/lib/utils'

/**
 * FeatureChip — a clickable tag chip for boolean unit features (corner, vastu).
 *
 * Props:
 *   icon      — emoji string
 *   label     — display name
 *   descOn    — description shown when active
 *   descOff   — description shown when inactive
 *   value     — boolean
 *   onChange  — (newValue: boolean) => void
 *   colorOn   — tailwind color key: 'amber' | 'green' (default 'amber')
 */
export default function FeatureChip({
  icon,
  label,
  descOn,
  descOff,
  value,
  onChange,
  colorOn = 'amber',
}) {
  const colors = {
    amber: {
      border: 'border-amber-400',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100 border-amber-200',
      labelOn: 'text-slate-900',
      descOn: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
    },
    green: {
      border: 'border-green-400',
      bg: 'bg-green-50',
      iconBg: 'bg-green-100 border-green-200',
      labelOn: 'text-slate-900',
      descOn: 'text-green-700',
      badge: 'bg-green-100 text-green-700',
    },
  }

  const c = colors[colorOn] ?? colors.amber

  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border-[1.5px] transition-all text-left',
        value
          ? `border-solid ${c.border} ${c.bg}`
          : 'border-dashed border-slate-200 bg-transparent hover:border-slate-300 hover:bg-slate-50/50'
      )}
    >
      {/* Icon box */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg border flex items-center justify-center text-base flex-shrink-0 transition-all',
          value ? c.iconBg : 'bg-slate-100 border-slate-200'
        )}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'text-[12.5px] font-700 leading-tight transition-colors',
            value ? c.labelOn : 'text-slate-600'
          )}
          style={{ fontWeight: 700 }}
        >
          {label}
        </div>
        <div
          className={cn(
            'text-[10.5px] mt-0.5 transition-colors',
            value ? c.descOn : 'text-slate-400'
          )}
        >
          {value ? descOn : descOff}
        </div>
      </div>

      {/* Badge */}
      <span
        className={cn(
          'flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all',
          value ? c.badge : 'bg-slate-100 text-slate-400'
        )}
      >
        {value ? 'Yes ✓' : 'No'}
      </span>
    </button>
  )
}
