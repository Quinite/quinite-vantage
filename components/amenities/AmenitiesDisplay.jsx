'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PROJECT_AMENITY_MAP, UNIT_AMENITY_MAP, ALL_AMENITY_MAP } from '@/lib/amenities-constants'
import { DynamicIcon } from '@/components/amenities/DynamicIcon'
import { ChevronDown, ChevronUp } from 'lucide-react'

/**
 * AmenitiesDisplay  —  Read-only amenity chips / grid.
 *
 * Props:
 *   amenityIds   string[]                         — amenity IDs to display
 *   context      'project' | 'unit' | 'any'       — which map to use (default 'any')
 *   variant      'grid' | 'tags' | 'dark'         — display style
 *   maxVisible   number                            — show N items then expand (0 = unlimited)
 *   title        string                            — optional section heading
 *   className    string
 *
 * Variants:
 *   grid   — 3-col icon cards on white bg  (project detail pages)
 *   tags   — wrapping pill badges           (lead profile, unit drawer)
 *   dark   — white chips on slate-900 bg   (CRM projects list modal)
 */
export default function AmenitiesDisplay({
  amenityIds = [],
  context = 'any',
  variant = 'tags',
  maxVisible = 0,
  title,
  className,
}) {
  const [expanded, setExpanded] = useState(false)

  const map =
    context === 'project' ? PROJECT_AMENITY_MAP
    : context === 'unit'  ? UNIT_AMENITY_MAP
    : ALL_AMENITY_MAP

  // Resolve IDs → amenity objects, skip unknowns
  const resolved = amenityIds
    .map(id => map[id] || ALL_AMENITY_MAP[id] || null)
    .filter(Boolean)

  if (!resolved.length) return null

  const showToggle = maxVisible > 0 && resolved.length > maxVisible
  const visible = showToggle && !expanded ? resolved.slice(0, maxVisible) : resolved
  const hiddenCount = resolved.length - maxVisible

  if (variant === 'grid') {
    return (
      <div className={cn('space-y-4', className)}>
        {title && (
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {visible.map(amenity => (
            <div
              key={amenity.id}
              className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl"
            >
              <div className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                <DynamicIcon name={amenity.icon} className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-xs font-semibold text-slate-700 leading-tight">
                {amenity.label}
              </span>
            </div>
          ))}
        </div>
        {showToggle && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> +{hiddenCount} more amenities</>
            )}
          </button>
        )}
      </div>
    )
  }

  if (variant === 'dark') {
    return (
      <div className={cn('space-y-3', className)}>
        {title && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {visible.map(amenity => (
            <div
              key={amenity.id}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <DynamicIcon name={amenity.icon} className="w-3.5 h-3.5 text-amber-400" />
              {amenity.label}
            </div>
          ))}
          {showToggle && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-700 transition-colors"
            >
              +{hiddenCount} more
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default: 'tags' variant — pill badges
  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {visible.map(amenity => (
          <span
            key={amenity.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600"
          >
            <DynamicIcon name={amenity.icon} className="w-3 h-3 text-slate-500" />
            {amenity.label}
          </span>
        ))}
        {showToggle && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-500 hover:bg-slate-200 transition-colors"
          >
            +{hiddenCount} more
          </button>
        )}
        {expanded && showToggle && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronUp className="w-3 h-3" /> less
          </button>
        )}
      </div>
    </div>
  )
}
