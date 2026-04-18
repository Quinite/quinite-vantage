'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  PROJECT_AMENITY_CATEGORIES,
  UNIT_AMENITY_CATEGORIES,
  PROJECT_AMENITY_MAP,
  UNIT_AMENITY_MAP,
  PROJECT_QUICK_PICKS,
  UNIT_QUICK_PICKS,
} from '@/lib/amenities-constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronDown, Check, X } from 'lucide-react'
import { DynamicIcon } from '@/components/amenities/DynamicIcon'

/**
 * AmenitiesPicker
 *
 * Props:
 *   context    'project' | 'unit'         — which taxonomy to show
 *   value      string[]                    — selected amenity IDs
 *   onChange   (ids: string[]) => void
 *   variant    'full' | 'compact'          — full shows everything; compact shows quick picks + popover
 *   label      string                      — section heading
 *   className  string
 */
export default function AmenitiesPicker({
  context = 'project',
  value = [],
  onChange,
  variant = 'full',
  label,
  className,
}) {
  const categories = context === 'project' ? PROJECT_AMENITY_CATEGORIES : UNIT_AMENITY_CATEGORIES
  const amenityMap = context === 'project' ? PROJECT_AMENITY_MAP : UNIT_AMENITY_MAP
  const quickPicks = context === 'project' ? PROJECT_QUICK_PICKS : UNIT_QUICK_PICKS

  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '')
  const [popoverOpen, setPopoverOpen] = useState(false)

  const selectedSet = useMemo(() => new Set(value), [value])

  const toggle = (id) => {
    const next = new Set(selectedSet)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange?.(Array.from(next))
  }

  const clearAll = () => onChange?.([])

  const activeCategoryAmenities = useMemo(
    () => categories.find(c => c.id === activeCategory)?.amenities || [],
    [categories, activeCategory]
  )

  if (variant === 'compact') {
    return (
      <CompactPicker
        quickPicks={quickPicks}
        amenityMap={amenityMap}
        categories={categories}
        selectedSet={selectedSet}
        toggle={toggle}
        clearAll={clearAll}
        popoverOpen={popoverOpen}
        setPopoverOpen={setPopoverOpen}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        activeCategoryAmenities={activeCategoryAmenities}
        context={context}
        label={label}
        className={className}
      />
    )
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {label && (
            <p className="text-sm font-semibold text-slate-700">{label}</p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">
            {context === 'project'
              ? 'Select amenities available in the society / building'
              : 'Select features included in this unit configuration'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedSet.size > 0 && (
            <>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                {selectedSet.size} selected
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Picks */}
      <QuickPicksRow
        quickPicks={quickPicks}
        amenityMap={amenityMap}
        selectedSet={selectedSet}
        toggle={toggle}
      />

      {/* Category Tabs */}
      <div className="overflow-x-auto pb-1 -mx-0.5 px-0.5">
        <div className="flex gap-2 min-w-max">
          {categories.map(cat => {
            const catSelectedCount = cat.amenities.filter(a => selectedSet.has(a.id)).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap',
                  activeCategory === cat.id
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <DynamicIcon name={cat.icon} className="w-3 h-3" />
                {cat.label}
                {catSelectedCount > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    activeCategory === cat.id
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-900 text-white'
                  )}>
                    {catSelectedCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Amenity Grid */}
      <AmenityGrid
        amenities={activeCategoryAmenities}
        selectedSet={selectedSet}
        toggle={toggle}
      />
    </div>
  )
}

// ─── Quick Picks Row ─────────────────────────────────────────────

function QuickPicksRow({ quickPicks, amenityMap, selectedSet, toggle }) {
  const picks = quickPicks.map(id => amenityMap[id]).filter(Boolean)
  if (!picks.length) return null

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        Quick Picks
      </p>
      <div className="flex flex-wrap gap-2">
        {picks.map(amenity => {
          const selected = selectedSet.has(amenity.id)
          return (
            <button
              key={amenity.id}
              type="button"
              onClick={() => toggle(amenity.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                selected
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
              )}
            >
              <DynamicIcon name={amenity.icon} className="w-3 h-3" />
              {amenity.label}
              {selected && <Check className="w-3 h-3" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Amenity Grid ────────────────────────────────────────────────

function AmenityGrid({ amenities, selectedSet, toggle }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {amenities.map(amenity => {
        const selected = selectedSet.has(amenity.id)
        return (
          <button
            key={amenity.id}
            type="button"
            onClick={() => toggle(amenity.id)}
            className={cn(
              'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all duration-150 group',
              selected
                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100 shadow-sm'
                : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            {/* Check mark */}
            {selected && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </span>
            )}
            <DynamicIcon
              name={amenity.icon}
              className={cn(
                'w-6 h-6 transition-colors',
                selected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
              )}
            />
            <span className={cn(
              'text-[11px] font-semibold leading-tight transition-colors',
              selected ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'
            )}>
              {amenity.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Compact Variant ─────────────────────────────────────────────

function CompactPicker({
  quickPicks, amenityMap, categories, selectedSet, toggle, clearAll,
  popoverOpen, setPopoverOpen, activeCategory, setActiveCategory,
  activeCategoryAmenities, context, label, className,
}) {
  const extraSelected = Array.from(selectedSet).filter(id => !quickPicks.includes(id))

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      )}

      {/* Quick picks row */}
      <div className="flex flex-wrap gap-2">
        {quickPicks.map(id => {
          const amenity = amenityMap[id]
          if (!amenity) return null
          const selected = selectedSet.has(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
                selected
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
              )}
            >
              <DynamicIcon name={amenity.icon} className="w-3 h-3" />
              {amenity.label}
            </button>
          )
        })}

        {/* More amenities trigger */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
                extraSelected.length > 0
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
              )}
            >
              {extraSelected.length > 0 ? `+${extraSelected.length} more` : 'More amenities'}
              <ChevronDown className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[380px] p-4 space-y-3"
            align="start"
            side="top"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                {context === 'project' ? 'All Society Amenities' : 'All Unit Features'}
              </p>
              <div className="flex items-center gap-2">
                {selectedSet.size > 0 && (
                  <>
                    <span className="text-[11px] text-blue-600 font-semibold">
                      {selectedSet.size} selected
                    </span>
                    <button type="button" onClick={clearAll} className="text-[11px] text-slate-400 hover:text-slate-600">
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Category tabs */}
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <div className="flex gap-1.5 min-w-max">
                {categories.map(cat => {
                  const count = cat.amenities.filter(a => selectedSet.has(a.id)).length
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap',
                        activeCategory === cat.id
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {cat.label}
                      {count > 0 && (
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 rounded-full',
                          activeCategory === cat.id ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Grid */}
            <div className="max-h-[280px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {activeCategoryAmenities.map(amenity => {
                  const selected = selectedSet.has(amenity.id)
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggle(amenity.id)}
                      className={cn(
                        'relative flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-150',
                        selected
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <DynamicIcon
                        name={amenity.icon}
                        className={cn('w-4 h-4 shrink-0', selected ? 'text-blue-500' : 'text-slate-400')}
                      />
                      <span className="text-[11px] font-semibold leading-tight">{amenity.label}</span>
                      {selected && (
                        <Check className="w-3 h-3 text-blue-500 ml-auto shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-1 border-t">
              <Button
                type="button"
                size="sm"
                onClick={() => setPopoverOpen(false)}
                className="text-xs h-7"
              >
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected extra items as dismissible tags */}
      {extraSelected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {extraSelected.map(id => {
            const amenity = amenityMap[id]
            if (!amenity) return null
            return (
              <span
                key={id}
                className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              >
                <DynamicIcon name={amenity.icon} className="w-3 h-3" />
                {amenity.label}
                <button type="button" onClick={() => toggle(id)} className="hover:text-blue-900 ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
