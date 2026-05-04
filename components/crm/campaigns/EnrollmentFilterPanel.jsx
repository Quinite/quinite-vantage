'use client'

import { useEffect, useRef } from 'react'
import { Plus, X, CheckCircle2, XCircle, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const DIMENSIONS = [
  { value: 'stage', label: 'Stage' },
  { value: 'interest_level', label: 'Interest Level' },
  { value: 'score', label: 'Lead Score' },
  { value: 'assigned_to', label: 'Assigned Agent' },
  { value: 'source', label: 'Source' },
]

const EXCLUDE_DIMENSIONS = [
  ...DIMENSIONS,
  { value: 'previously_called', label: 'Previously Called' },
]

const INTEREST_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'None' },
]

function emptyFilter(dimension) {
  if (dimension === 'stage') return { dimension, stage_ids: [] }
  if (dimension === 'interest_level') return { dimension, interest_levels: [] }
  if (dimension === 'score') return { dimension, score_min: 0, score_max: 100 }
  if (dimension === 'assigned_to') return { dimension, assigned_to_ids: [] }
  if (dimension === 'source') return { dimension, sources: [] }
  if (dimension === 'previously_called') return { dimension }
  return { dimension }
}

function FilterRow({ filter, onChange, onRemove, stages, users, sources, isExclude }) {
  const availableDimensions = isExclude ? EXCLUDE_DIMENSIONS : DIMENSIONS
  const usedDimension = filter.dimension

  return (
    <div className="flex items-start gap-2">
      <Select
        value={usedDimension}
        onValueChange={(val) => onChange(emptyFilter(val))}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableDimensions.map(d => (
            <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex-1 min-w-0">
        {usedDimension === 'stage' && (
          <MultiSelect
            options={stages.map(s => ({ value: s.id, label: s.name }))}
            selected={filter.stage_ids || []}
            onChange={(vals) => onChange({ ...filter, stage_ids: vals })}
            placeholder="Select stages…"
            className="h-8 text-xs"
          />
        )}

        {usedDimension === 'interest_level' && (
          <div className="flex gap-1 flex-wrap pt-1">
            {INTEREST_OPTIONS.map(opt => {
              const active = (filter.interest_levels || []).includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const cur = filter.interest_levels || []
                    onChange({ ...filter, interest_levels: active ? cur.filter(v => v !== opt.value) : [...cur, opt.value] })
                  }}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}

        {usedDimension === 'score' && (
          <div className="pt-3 px-1">
            <Slider
              min={0}
              max={100}
              step={5}
              value={[filter.score_min ?? 0, filter.score_max ?? 100]}
              onValueChange={([min, max]) => onChange({ ...filter, score_min: min, score_max: max })}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">{filter.score_min ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">{filter.score_max ?? 100}</span>
            </div>
          </div>
        )}

        {usedDimension === 'assigned_to' && (
          <MultiSelect
            options={users.map(u => ({ value: u.id, label: u.full_name || u.email }))}
            selected={filter.assigned_to_ids || []}
            onChange={(vals) => onChange({ ...filter, assigned_to_ids: vals })}
            placeholder="Select agents…"
            className="h-8 text-xs"
          />
        )}

        {usedDimension === 'source' && (
          <MultiSelect
            options={sources.map(s => ({ value: s, label: s }))}
            selected={filter.sources || []}
            onChange={(vals) => onChange({ ...filter, sources: vals })}
            placeholder="Select sources…"
            className="h-8 text-xs"
          />
        )}

        {usedDimension === 'previously_called' && (
          <div className="flex items-center gap-2 pt-1.5">
            <Switch checked={true} disabled className="scale-75 origin-left" />
            <span className="text-xs text-muted-foreground">Exclude leads already called in any campaign</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="mt-1.5 shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function FilterGroup({ type, filters, setFilters, logic, setLogic, stages, users, sources }) {
  const isExclude = type === 'exclude'
  const icon = isExclude
    ? <XCircle className="w-3.5 h-3.5 text-red-500" />
    : <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
  const label = isExclude ? 'Exclude' : 'Include'
  const borderColor = isExclude ? 'border-l-red-400' : 'border-l-green-500'
  const headerBg = isExclude ? 'bg-red-50/60 dark:bg-red-950/20' : 'bg-green-50/60 dark:bg-green-950/20'
  const addBtnColor = isExclude ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30'

  function addFilter() {
    const usedDimensions = filters.map(f => f.dimension)
    const available = (isExclude ? EXCLUDE_DIMENSIONS : DIMENSIONS).filter(d => !usedDimensions.includes(d.value))
    if (!available.length) return
    setFilters([...filters, emptyFilter(available[0].value)])
  }

  function updateFilter(idx, updated) {
    setFilters(filters.map((f, i) => i === idx ? updated : f))
  }

  function removeFilter(idx) {
    setFilters(filters.filter((_, i) => i !== idx))
  }

  const availableDimensions = isExclude ? EXCLUDE_DIMENSIONS : DIMENSIONS
  const allUsed = filters.length >= availableDimensions.length

  return (
    <div className={`rounded-xl border border-border border-l-4 ${borderColor} overflow-hidden shadow-sm`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${headerBg} border-b border-border/60`}>
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-bold text-foreground">{label}</span>
        </div>
        {filters.length > 1 && (
          <div className="flex items-center gap-1 bg-background border border-border rounded-full p-0.5 shadow-sm">
            {['AND', 'OR'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setLogic(opt)}
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${
                  logic === opt
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter rows */}
      <div className="p-3 space-y-2.5">
        {filters.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/60 text-center py-2">
            {isExclude ? 'No exclusions — nothing extra removed' : 'No filters — all eligible leads included'}
          </p>
        ) : (
          filters.map((filter, idx) => (
            <FilterRow
              key={idx}
              filter={filter}
              onChange={(updated) => updateFilter(idx, updated)}
              onRemove={() => removeFilter(idx)}
              stages={stages}
              users={users}
              sources={sources}
              isExclude={isExclude}
            />
          ))
        )}

        {!allUsed && (
          <button
            type="button"
            onClick={addFilter}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${addBtnColor}`}
          >
            <Plus className="w-3 h-3" />
            Add filter
          </button>
        )}
      </div>
    </div>
  )
}

export function EnrollmentFilterPanel({
  projectIds,
  stages,
  users,
  sources,
  inclusionFilters,
  setInclusionFilters,
  inclusionLogic,
  setInclusionLogic,
  exclusionFilters,
  setExclusionFilters,
  exclusionLogic,
  setExclusionLogic,
  previewCount,
  previewBreakdown,
  previewLoading,
  noProjectSelected,
}) {
  if (noProjectSelected) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-background/50 rounded-lg border border-dashed border-border">
        <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground px-4">Select at least one project first to configure enrollment filters</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FilterGroup
          type="include"
          filters={inclusionFilters}
          setFilters={setInclusionFilters}
          logic={inclusionLogic}
          setLogic={setInclusionLogic}
          stages={stages}
          users={users}
          sources={sources}
        />
        <FilterGroup
          type="exclude"
          filters={exclusionFilters}
          setFilters={setExclusionFilters}
          logic={exclusionLogic}
          setLogic={setExclusionLogic}
          stages={stages}
          users={users}
          sources={sources}
        />
      </div>
    </div>
  )
}
