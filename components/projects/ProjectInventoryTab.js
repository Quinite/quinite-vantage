'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Search, X, Plus, ChevronUp, ChevronDown, ChevronsUpDown,
    BedDouble, Edit, Trash2, SlidersHorizontal, Filter,
    Layers, CheckSquare, Square, ChevronLeft, ChevronRight,
    Columns3, Compass, CalendarDays, Sparkles, ArrowRightLeft,
    Building2, RotateCcw,
} from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
    DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePermission } from '@/contexts/PermissionContext'
import { useInventoryUnits, useUnitConfigs } from '@/hooks/useInventory'
import { useQueryClient } from '@tanstack/react-query'
import UnitDialog from '@/components/inventory/UnitDialog'
import { formatINR, getStatusConfig } from '@/lib/inventory'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
    { value: 'available', label: 'Available' },
    { value: 'reserved',  label: 'Reserved'  },
    { value: 'sold',      label: 'Sold'      },
]

const BHK_OPTIONS = ['1', '2', '3', '4', '5']

const CONSTRUCTION_STATUSES = [
    { value: 'under_construction', label: 'Under Construction' },
    { value: 'ready_to_move',      label: 'Ready to Move'      },
    { value: 'completed',          label: 'Completed'          },
]

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// Column definitions — id, label, default visibility, sortKey (if sortable)
const ALL_COLUMNS = [
    { id: 'unit_number',          label: 'Unit #',              default: true,  sortKey: u => u.unit_number ?? ''                                   },
    { id: 'tower',                label: 'Tower',               default: true,  sortKey: u => u.tower?.name ?? ''                                  },
    { id: 'floor',                label: 'Floor',               default: true,  sortKey: u => u.floor_number ?? 0                                   },
    { id: 'config',               label: 'Configuration',       default: true,  sortKey: u => u.config?.config_name ?? ''                           },
    { id: 'bhk',                  label: 'BHK',                 default: true,  sortKey: u => u.bedrooms ?? u.config?.bedrooms ?? 0                 },
    { id: 'bathrooms',            label: 'Bathrooms',           default: false, sortKey: u => u.bathrooms ?? 0                                      },
    { id: 'balconies',            label: 'Balconies',           default: false, sortKey: u => u.balconies ?? 0                                      },
    { id: 'carpet_area',          label: 'Carpet (sq.ft)',      default: true,  sortKey: u => u.carpet_area ?? u.config?.carpet_area ?? 0           },
    { id: 'builtup_area',         label: 'Built-up (sq.ft)',    default: false, sortKey: u => u.built_up_area ?? 0                                  },
    { id: 'super_builtup',        label: 'Super Built-up',      default: false, sortKey: u => u.super_built_up_area ?? 0                            },
    { id: 'plot_area',            label: 'Plot Area',           default: false, sortKey: u => u.plot_area ?? 0                                      },
    { id: 'facing',               label: 'Facing',              default: true,  sortKey: u => u.facing ?? ''                                        },
    { id: 'is_corner',            label: 'Corner',              default: true,  sortKey: u => u.is_corner ? 1 : 0                                   },
    { id: 'is_vastu',             label: 'Vastu',               default: true,  sortKey: u => u.is_vastu_compliant ? 1 : 0                          },
    { id: 'transaction_type',     label: 'Transaction',         default: false, sortKey: u => u.transaction_type ?? ''                              },
    { id: 'construction_status',  label: 'Construction Status',  default: false, sortKey: u => u.construction_status ?? ''                           },
    { id: 'possession_date',      label: 'Possession',          default: false, sortKey: u => u.possession_date ?? ''                               },
    { id: 'status',               label: 'Status',              default: true,  sortKey: u => u.status ?? ''                                        },
    { id: 'base_price',           label: 'Base Price',          default: false, sortKey: u => u.base_price ?? 0                                     },
    { id: 'floor_rise',           label: 'Floor Rise',          default: false, sortKey: u => u.floor_rise_price ?? 0                               },
    { id: 'plc',                  label: 'PLC',                 default: false, sortKey: u => u.plc_price ?? 0                                      },
    { id: 'total_price',          label: 'Total Price',         default: true,  sortKey: u => u.total_price ?? u.base_price ?? 0                    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }) {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-300 shrink-0" />
    return sortDir === 'asc'
        ? <ChevronUp   className="w-3 h-3 ml-1 text-slate-700 shrink-0" />
        : <ChevronDown className="w-3 h-3 ml-1 text-slate-700 shrink-0" />
}

const STATUS_MAP = {
    available: { label: 'Available', className: 'bg-emerald-50 text-emerald-700' },
    reserved:  { label: 'Reserved',  className: 'bg-amber-50 text-amber-700'    },
    sold:      { label: 'Sold',      className: 'bg-rose-50 text-rose-700'      },
}

function StatusBadge({ status }) {
    const s = STATUS_MAP[status] ?? { label: status ?? 'Unknown', className: 'bg-slate-100 text-slate-600' }
    return (
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', s.className)}>
            {s.label}
        </span>
    )
}

function FilterChip({ label, count, icon: Icon, active, children, className }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all select-none whitespace-nowrap',
                    active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900',
                    className,
                )}>
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    {label}
                    {count > 0 && (
                        <span className={cn('ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold inline-flex items-center justify-center',
                            active ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-700')}>
                            {count}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-xl shadow-xl border-slate-100 min-w-[190px]">
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function Cell({ children, className }) {
    return (
        <TableCell className={cn('py-2.5 text-sm', className)}>
            {children}
        </TableCell>
    )
}

function TableSkeleton({ cols }) {
    return Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i} className="border-slate-100">
            <TableCell className="pl-4 w-10"><Skeleton className="h-4 w-4 rounded" /></TableCell>
            {Array.from({ length: cols }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 rounded" style={{ width: `${48 + (j % 3) * 24}px` }} /></TableCell>
            ))}
            <TableCell><Skeleton className="h-6 w-6 rounded ml-auto" /></TableCell>
        </TableRow>
    ))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectInventoryTab({ projectId, project, onMetricsUpdate }) {
    const queryClient   = useQueryClient()
    const canEdit = usePermission('edit_inventory')

    const { data: units = [], isLoading: loading, refetch: refetchUnits } = useInventoryUnits(projectId)
    const { data: unitConfigs = [] } = useUnitConfigs(projectId)

    const handleActionComplete = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['inventory-units', projectId] })
        queryClient.invalidateQueries({ queryKey: ['inventory-project', projectId] })
        queryClient.invalidateQueries({ queryKey: ['inventory-projects'] })
        refetchUnits()
        if (onMetricsUpdate) onMetricsUpdate()
    }, [queryClient, projectId, refetchUnits, onMetricsUpdate])

    // ── Column visibility ──
    const [visibleCols, setVisibleCols] = useState(() => new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.id)))
    const toggleCol = id => setVisibleCols(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    const activeCols = ALL_COLUMNS.filter(c => visibleCols.has(c.id))

    // ── Filters ──
    const [search,       setSearch]       = useState('')
    const [selStatuses,  setSelStatuses]  = useState([])
    const [selBHK,       setSelBHK]       = useState([])
    const [selConstruct, setSelConstruct] = useState([])
    const [selTowers,    setSelTowers]    = useState([])
    const [selFacing,    setSelFacing]    = useState([])
    const [onlyCorner,   setOnlyCorner]   = useState(false)
    const [onlyVastu,    setOnlyVastu]    = useState(false)
    const [priceRange,   setPriceRange]   = useState({ min: '', max: '' })
    const [areaRange,    setAreaRange]    = useState({ min: '', max: '' })
    const [rangeOpen,    setRangeOpen]    = useState(false)

    // ── Sort ──
    const [sortColId, setSortColId] = useState('unit_number')
    const [sortDir,   setSortDir]   = useState('asc')

    // ── Pagination ──
    const [page,     setPage]     = useState(1)
    const [pageSize, setPageSize] = useState(25)

    // ── Selection ──
    const [selected, setSelected] = useState(new Set())

    // ── Dialogs ──
    const [drawerState, setDrawerState] = useState({ open: false, mode: 'add', unit: null })

    const handleDelete = useCallback(async (unit) => {
        if (!confirm(`Delete unit ${unit.unit_number}? This cannot be undone.`)) return
        const res = await fetch(`/api/inventory/units/${unit.id}`, { method: 'DELETE' })
        if (!res.ok) { toast.error('Failed to delete unit'); return }
        toast.success(`Unit ${unit.unit_number} deleted`)
        handleActionComplete()
    }, [handleActionComplete])

    // ── Toggle helpers ──
    const toggleFilter = useCallback((setter, value) => {
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
    }, [])

    const clearAll = useCallback(() => {
        setSearch(''); setSelStatuses([]); setSelBHK([]); setSelConstruct([])
        setSelTowers([]); setSelFacing([]); setOnlyCorner(false); setOnlyVastu(false)
        setPriceRange({ min: '', max: '' }); setAreaRange({ min: '', max: '' })
        setSelected(new Set()); setPage(1)
    }, [])

    const hasFilters = search || selStatuses.length || selBHK.length || selConstruct.length ||
        selTowers.length || selFacing.length || onlyCorner || onlyVastu ||
        priceRange.min || priceRange.max || areaRange.min || areaRange.max

    // ── Sort handler ──
    const handleSort = (colId) => {
        if (sortColId === colId) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortColId(colId); setSortDir('asc') }
        setPage(1)
    }

    // ── Filtered + sorted data ──
    const filteredUnits = useMemo(() => {
        let result = units.filter(unit => {
            if (search) {
                const q = search.toLowerCase()
                if (
                    !unit.unit_number?.toLowerCase().includes(q) &&
                    !unit.tower?.name?.toLowerCase().includes(q) &&
                    !unit.config?.config_name?.toLowerCase().includes(q) &&
                    !unit.facing?.toLowerCase().includes(q) &&
                    !unit.leads?.[0]?.name?.toLowerCase().includes(q)
                ) return false
            }
            if (selStatuses.length && !selStatuses.includes(unit.status)) return false
            if (selConstruct.length && !selConstruct.includes(unit.construction_status)) return false
            if (selTowers.length && !selTowers.includes(unit.tower_id)) return false
            if (selFacing.length && !selFacing.includes(unit.facing)) return false
            if (onlyCorner && !unit.is_corner) return false
            if (onlyVastu && !unit.is_vastu_compliant) return false
            if (selBHK.length) {
                const beds = String(unit.bedrooms ?? unit.config?.bedrooms ?? '')
                if (!selBHK.includes(beds)) return false
            }
            const price = Number(unit.total_price || unit.base_price) || 0
            if (priceRange.min && price < Number(priceRange.min)) return false
            if (priceRange.max && price > Number(priceRange.max)) return false
            const area = Number(unit.carpet_area ?? unit.config?.carpet_area) || 0
            if (areaRange.min && area < Number(areaRange.min)) return false
            if (areaRange.max && area > Number(areaRange.max)) return false
            return true
        })

        const col = ALL_COLUMNS.find(c => c.id === sortColId)
        if (col?.sortKey) {
            result.sort((a, b) => {
                const av = col.sortKey(a), bv = col.sortKey(b)
                if (av < bv) return sortDir === 'asc' ? -1 : 1
                if (av > bv) return sortDir === 'asc' ?  1 : -1
                return 0
            })
        }
        return result
    }, [units, search, selStatuses, selBHK, selConstruct, selTowers, selFacing, onlyCorner, onlyVastu, priceRange, areaRange, sortColId, sortDir])

    // ── Status summary (on full units, not filtered) ──
    const stats = useMemo(() => {
        const c = {}; for (const s of STATUSES) c[s.value] = 0
        for (const u of units) c[u.status] = (c[u.status] || 0) + 1
        return c
    }, [units])

    // ── Derived filter options from actual data ──
    const towerOptions = useMemo(() => {
        const seen = new Map()
        for (const u of units) {
            if (u.tower_id && u.tower?.name && !seen.has(u.tower_id))
                seen.set(u.tower_id, u.tower.name)
        }
        return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
    }, [units])

    const facingOptions = useMemo(() => {
        const seen = new Set()
        for (const u of units) if (u.facing) seen.add(u.facing)
        return [...seen].sort()
    }, [units])

    // ── Active filter tags ──
    const activeFilterTags = useMemo(() => {
        const tags = []
        selStatuses.forEach(v => tags.push({ key: `status-${v}`, label: STATUSES.find(s => s.value === v)?.label ?? v, onRemove: () => toggleFilter(setSelStatuses, v) }))
        selBHK.forEach(v => tags.push({ key: `bhk-${v}`, label: `${v}${v === '5' ? '+' : ''} BHK`, onRemove: () => toggleFilter(setSelBHK, v) }))
        selConstruct.forEach(v => tags.push({ key: `cs-${v}`, label: CONSTRUCTION_STATUSES.find(s => s.value === v)?.label ?? v, onRemove: () => toggleFilter(setSelConstruct, v) }))
        selTowers.forEach(v => tags.push({ key: `tower-${v}`, label: towerOptions.find(t => t.id === v)?.name ?? v, onRemove: () => toggleFilter(setSelTowers, v) }))
        selFacing.forEach(v => tags.push({ key: `facing-${v}`, label: v, onRemove: () => toggleFilter(setSelFacing, v) }))
        if (onlyCorner) tags.push({ key: 'corner', label: 'Corner only', onRemove: () => setOnlyCorner(false) })
        if (onlyVastu)  tags.push({ key: 'vastu',  label: 'Vastu only',  onRemove: () => setOnlyVastu(false)  })
        if (priceRange.min) tags.push({ key: 'pmin', label: `Price ≥ ₹${Number(priceRange.min).toLocaleString('en-IN')}`, onRemove: () => { setPriceRange(p => ({ ...p, min: '' })); setPage(1) } })
        if (priceRange.max) tags.push({ key: 'pmax', label: `Price ≤ ₹${Number(priceRange.max).toLocaleString('en-IN')}`, onRemove: () => { setPriceRange(p => ({ ...p, max: '' })); setPage(1) } })
        if (areaRange.min)  tags.push({ key: 'amin', label: `Area ≥ ${areaRange.min} sqft`, onRemove: () => { setAreaRange(p => ({ ...p, min: '' })); setPage(1) } })
        if (areaRange.max)  tags.push({ key: 'amax', label: `Area ≤ ${areaRange.max} sqft`, onRemove: () => { setAreaRange(p => ({ ...p, max: '' })); setPage(1) } })
        return tags
    }, [selStatuses, selBHK, selConstruct, selTowers, selFacing, onlyCorner, onlyVastu, priceRange, areaRange, towerOptions])

    // ── Pagination math ──
    const totalPages   = Math.max(1, Math.ceil(filteredUnits.length / pageSize))
    const safePage     = Math.min(page, totalPages)
    const pageStart    = (safePage - 1) * pageSize
    const pageEnd      = Math.min(pageStart + pageSize, filteredUnits.length)
    const pagedUnits   = filteredUnits.slice(pageStart, pageEnd)

    // ── Selection ──
    const allPageSelected  = pagedUnits.length > 0 && pagedUnits.every(u => selected.has(u.id))
    const somePageSelected = pagedUnits.some(u => selected.has(u.id))
    const toggleAll = () => setSelected(allPageSelected
        ? new Set([...selected].filter(id => !pagedUnits.find(u => u.id === id)))
        : new Set([...selected, ...pagedUnits.map(u => u.id)])
    )
    const toggleRow = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

    const rangeActive = priceRange.min || priceRange.max || areaRange.min || areaRange.max

    // ── SortableHead ──
    const SortHead = ({ colId, children, className }) => {
        const col = ALL_COLUMNS.find(c => c.id === colId)
        if (!col?.sortKey) return <TableHead className={cn('text-[11px] font-bold text-slate-500 uppercase tracking-wider', className)}>{children}</TableHead>
        return (
            <TableHead
                className={cn('text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none cursor-pointer hover:text-slate-800 transition-colors', className)}
                onClick={() => handleSort(colId)}
            >
                <div className="flex items-center gap-0.5">
                    {children}
                    <SortIcon col={colId} sortCol={sortColId} sortDir={sortDir} />
                </div>
            </TableHead>
        )
    }

    // ── Cell renderers per column ──
    const renderCell = (unit, colId) => {
        const beds    = unit.bedrooms ?? unit.config?.bedrooms
        const area    = unit.carpet_area ?? unit.config?.carpet_area

        switch (colId) {
            case 'unit_number':
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 tracking-tight">{unit.unit_number}</span>
                        {unit.is_corner && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Sparkles className="w-3 h-3 text-amber-400 shrink-0 cursor-default" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">Corner unit</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                )
            case 'tower':
                return unit.tower?.name
                    ? <span className="flex items-center gap-1 text-slate-700 font-medium"><Layers className="w-3 h-3 text-slate-400 shrink-0" />{unit.tower.name}</span>
                    : <span className="text-slate-400 italic text-xs">—</span>
            case 'floor':
                return <span className="tabular-nums text-slate-700 font-medium">{unit.floor_number ?? '—'}</span>
            case 'config':
                return (
                    <div className="flex flex-col gap-0.5 min-w-[100px]">
                        <span className="font-semibold text-slate-800 text-xs">{unit.config?.config_name || unit.config?.property_type || '—'}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{unit.config?.category || ''}</span>
                    </div>
                )
            case 'bhk':
                return beds ? <span className="font-semibold text-slate-700 whitespace-nowrap">{beds} BHK</span> : <span className="text-slate-400">—</span>
            case 'bathrooms':
                return unit.bathrooms != null ? <span className="tabular-nums text-slate-700">{unit.bathrooms}</span> : <span className="text-slate-400">—</span>
            case 'balconies':
                return unit.balconies != null ? <span className="tabular-nums text-slate-700">{unit.balconies}</span> : <span className="text-slate-400">—</span>
            case 'carpet_area':
                return area ? <span className="tabular-nums font-semibold text-slate-700">{Number(area).toLocaleString('en-IN')}</span> : <span className="text-slate-400">—</span>
            case 'builtup_area':
                return unit.built_up_area ? <span className="tabular-nums text-slate-700">{Number(unit.built_up_area).toLocaleString('en-IN')}</span> : <span className="text-slate-400">—</span>
            case 'super_builtup':
                return unit.super_built_up_area ? <span className="tabular-nums text-slate-700">{Number(unit.super_built_up_area).toLocaleString('en-IN')}</span> : <span className="text-slate-400">—</span>
            case 'plot_area':
                return unit.plot_area ? <span className="tabular-nums text-slate-700">{Number(unit.plot_area).toLocaleString('en-IN')}</span> : <span className="text-slate-400">—</span>
            case 'facing':
                return unit.facing
                    ? <span className="flex items-center gap-1 text-slate-700 text-xs whitespace-nowrap"><Compass className="w-3 h-3 text-slate-400" />{unit.facing}</span>
                    : <span className="text-slate-400">—</span>
            case 'base_price':
                return <span className="tabular-nums text-slate-700 font-medium whitespace-nowrap">{unit.base_price ? formatINR(unit.base_price) : '—'}</span>
            case 'floor_rise':
                return <span className="tabular-nums text-slate-700 whitespace-nowrap">{unit.floor_rise_price ? formatINR(unit.floor_rise_price) : '—'}</span>
            case 'plc':
                return <span className="tabular-nums text-slate-700 whitespace-nowrap">{unit.plc_price ? formatINR(unit.plc_price) : '—'}</span>
            case 'total_price':
                return <span className="tabular-nums font-bold text-slate-900 whitespace-nowrap">{formatINR(unit.total_price || unit.base_price || 0)}</span>
            case 'transaction_type':
                return unit.transaction_type
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold capitalize whitespace-nowrap">
                        <ArrowRightLeft className="w-3 h-3" />{unit.transaction_type}
                      </span>
                    : <span className="text-slate-400">—</span>
            case 'construction_status': {
                const labels = { under_construction: 'Under Construction', ready_to_move: 'Ready to Move', completed: 'Completed' }
                const colors = { under_construction: 'bg-amber-50 text-amber-700', ready_to_move: 'bg-emerald-50 text-emerald-700', completed: 'bg-slate-100 text-slate-600' }
                return unit.construction_status
                    ? <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap', colors[unit.construction_status] || 'bg-slate-100 text-slate-600')}>
                        {labels[unit.construction_status] || unit.construction_status}
                      </span>
                    : <span className="text-slate-400">—</span>
            }
            case 'possession_date':
                return unit.possession_date
                    ? <span className="text-xs text-slate-600 whitespace-nowrap flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-slate-400" />
                        {new Date(unit.possession_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                      </span>
                    : <span className="text-slate-400">—</span>
            case 'is_corner':
                return unit.is_corner
                    ? <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-semibold">Yes</span>
                    : <span className="text-slate-400 text-xs">No</span>
            case 'is_vastu':
                return unit.is_vastu_compliant
                    ? <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-semibold">Yes</span>
                    : <span className="text-slate-400 text-xs">No</span>
            case 'status':
                return <StatusBadge status={unit.status} />
            default:
                return null
        }
    }

    return (
        <div className="mt-6 flex flex-col gap-4">

            {/* ── Stats bar ── */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-slate-700 mr-1">{units.length} units</span>
                    {STATUSES.map(s => stats[s.value] > 0 && (
                        <button
                            key={s.value}
                            onClick={() => toggleFilter(setSelStatuses, s.value)}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                                selStatuses.includes(s.value)
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                            )}
                        >
                            {s.label}
                            <span className="font-bold ml-0.5">{stats[s.value]}</span>
                        </button>
                    ))}
                </div>
                {canEdit && (
                    <Button
                        onClick={() => setDrawerState({ open: true, mode: 'add', unit: null })}
                        className="ml-auto h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium gap-1.5 whitespace-nowrap"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Unit
                    </Button>
                )}
            </div>

            {/* ── Toolbar ── */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Row 1: search + filters + columns */}
                <div className="px-3 py-2.5 flex items-center gap-2 flex-wrap border-b border-slate-100">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Search unit #, tower, config…"
                            className="pl-9 h-8 bg-slate-50 border-slate-200 text-sm rounded-lg focus:bg-white transition-colors"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                        />
                        {search && (
                            <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="h-5 w-px bg-slate-200 hidden sm:block" />

                    {/* Status */}
                    <FilterChip label="Status" count={selStatuses.length} active={selStatuses.length > 0}>
                        <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {STATUSES.map(s => (
                            <DropdownMenuCheckboxItem key={s.value} checked={selStatuses.includes(s.value)}
                                onCheckedChange={() => { toggleFilter(setSelStatuses, s.value); setPage(1) }} className="text-xs py-2">
                                {s.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </FilterChip>

                    {/* BHK */}
                    <FilterChip label="BHK" icon={BedDouble} count={selBHK.length} active={selBHK.length > 0}>
                        <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bedrooms</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {BHK_OPTIONS.map(n => (
                            <DropdownMenuCheckboxItem key={n} checked={selBHK.includes(n)}
                                onCheckedChange={() => { toggleFilter(setSelBHK, n); setPage(1) }} className="text-xs py-2">
                                {n}{n === '5' ? '+' : ''} BHK
                            </DropdownMenuCheckboxItem>
                        ))}
                    </FilterChip>

                    {/* Tower */}
                    {towerOptions.length > 0 && (
                        <FilterChip label="Tower" icon={Building2} count={selTowers.length} active={selTowers.length > 0}>
                            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tower</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {towerOptions.map(t => (
                                <DropdownMenuCheckboxItem key={t.id} checked={selTowers.includes(t.id)}
                                    onCheckedChange={() => { toggleFilter(setSelTowers, t.id); setPage(1) }} className="text-xs py-2">
                                    {t.name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </FilterChip>
                    )}

                    {/* Facing */}
                    {facingOptions.length > 0 && (
                        <FilterChip label="Facing" icon={Compass} count={selFacing.length} active={selFacing.length > 0}>
                            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facing</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {facingOptions.map(f => (
                                <DropdownMenuCheckboxItem key={f} checked={selFacing.includes(f)}
                                    onCheckedChange={() => { toggleFilter(setSelFacing, f); setPage(1) }} className="text-xs py-2">
                                    {f}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </FilterChip>
                    )}

                    {/* Construction status */}
                    <FilterChip label="Construction Status" count={selConstruct.length} active={selConstruct.length > 0}>
                        <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Construction Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {CONSTRUCTION_STATUSES.map(s => (
                            <DropdownMenuCheckboxItem key={s.value} checked={selConstruct.includes(s.value)}
                                onCheckedChange={() => { toggleFilter(setSelConstruct, s.value); setPage(1) }} className="text-xs py-2">
                                {s.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </FilterChip>

                    {/* Corner / Vastu toggles */}
                    <button
                        onClick={() => { setOnlyCorner(v => !v); setPage(1) }}
                        className={cn(
                            'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all select-none whitespace-nowrap',
                            onlyCorner
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900',
                        )}
                    >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        Corner
                    </button>

                    <button
                        onClick={() => { setOnlyVastu(v => !v); setPage(1) }}
                        className={cn(
                            'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all select-none whitespace-nowrap',
                            onlyVastu
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900',
                        )}
                    >
                        🧭 Vastu
                    </button>

                    {/* Ranges */}
                    <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                        <PopoverTrigger asChild>
                            <button className={cn(
                                'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all select-none whitespace-nowrap',
                                rangeActive
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900',
                            )}>
                                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                                Ranges
                                {rangeActive && <span className="w-4 h-4 rounded-full text-[10px] font-bold bg-white text-slate-900 flex items-center justify-center ml-0.5">!</span>}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-72 p-4 rounded-xl shadow-xl border-slate-100 space-y-4">
                            <p className="text-xs font-bold text-slate-700">Price & Area Ranges</p>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price (₹)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input placeholder="Min" type="number" className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md"
                                        value={priceRange.min} onChange={e => { setPriceRange(p => ({ ...p, min: e.target.value })); setPage(1) }} />
                                    <Input placeholder="Max" type="number" className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md"
                                        value={priceRange.max} onChange={e => { setPriceRange(p => ({ ...p, max: e.target.value })); setPage(1) }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carpet Area (sq.ft)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input placeholder="Min" type="number" className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md"
                                        value={areaRange.min} onChange={e => { setAreaRange(p => ({ ...p, min: e.target.value })); setPage(1) }} />
                                    <Input placeholder="Max" type="number" className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md"
                                        value={areaRange.max} onChange={e => { setAreaRange(p => ({ ...p, max: e.target.value })); setPage(1) }} />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" className="flex-1 h-8 text-xs rounded-md bg-slate-900 hover:bg-slate-800" onClick={() => setRangeOpen(false)}>Apply</Button>
                                {rangeActive && (
                                    <Button size="sm" variant="ghost" className="h-8 text-xs rounded-md text-slate-400 hover:text-rose-500"
                                        onClick={() => { setPriceRange({ min: '', max: '' }); setAreaRange({ min: '', max: '' }); setPage(1) }}>
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {hasFilters && (
                        <button onClick={clearAll} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 transition-all whitespace-nowrap">
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </button>
                    )}

                    {/* Column visibility + selected count */}
                    <div className="ml-auto flex items-center gap-2">
                        {selected.size > 0 && (
                            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{selected.size} selected</span>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-all select-none whitespace-nowrap">
                                    <Columns3 className="w-3.5 h-3.5" />
                                    Columns
                                    <span className="ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 inline-flex items-center justify-center">{visibleCols.size}</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-slate-100 w-52">
                                <div className="flex items-center justify-between px-2 py-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Columns</span>
                                    <button
                                        onClick={() => setVisibleCols(new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.id)))}
                                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                        Reset to default
                                    </button>
                                </div>
                                <DropdownMenuSeparator />
                                <div className="max-h-80 overflow-y-auto">
                                    {ALL_COLUMNS.map(col => (
                                        <DropdownMenuCheckboxItem
                                            key={col.id}
                                            checked={visibleCols.has(col.id)}
                                            onCheckedChange={() => toggleCol(col.id)}
                                            className="text-xs py-2"
                                        >
                                            {col.label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Row 2: active filter tags */}
                {activeFilterTags.length > 0 && (
                    <div className="px-3 py-2 flex items-center gap-1.5 flex-wrap border-t border-slate-100 bg-slate-50/50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filters:</span>
                        {activeFilterTags.map(tag => (
                            <span
                                key={tag.key}
                                className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold"
                            >
                                {tag.label}
                                <button
                                    onClick={tag.onRemove}
                                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors ml-0.5"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </span>
                        ))}
                        <button
                            onClick={clearAll}
                            className="ml-auto text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:underline transition-colors whitespace-nowrap"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-slate-100">
                                {/* Select all */}
                                <TableHead className="w-10 pl-4">
                                    <button onClick={toggleAll} className="text-slate-400 hover:text-slate-700 transition-colors">
                                        {allPageSelected
                                            ? <CheckSquare className="w-4 h-4 text-slate-700" />
                                            : <Square className="w-4 h-4" />
                                        }
                                    </button>
                                </TableHead>

                                {activeCols.map(col => (
                                    <SortHead key={col.id} colId={col.id}>
                                        {col.label}
                                    </SortHead>
                                ))}

                                <TableHead className="sticky right-0 bg-slate-50/80 border-l border-slate-100 w-20" />
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableSkeleton cols={activeCols.length} />
                            ) : pagedUnits.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={activeCols.length + 2} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Search className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900">No units found</p>
                                            <p className="text-xs text-slate-400">
                                                {hasFilters ? 'Adjust your filters or search.' : 'No units have been created yet.'}
                                            </p>
                                            {hasFilters && (
                                                <button onClick={clearAll} className="text-xs text-blue-600 hover:underline font-medium">Clear all filters</button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagedUnits.map(unit => {
                                    const isSelected = selected.has(unit.id)
                                    return (
                                        <TableRow
                                            key={unit.id}
                                            className={cn('border-slate-100 transition-colors group', isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60')}
                                        >
                                            <TableCell className="pl-4 w-10 py-2.5">
                                                <button onClick={() => toggleRow(unit.id)} className="text-slate-300 hover:text-slate-600 transition-colors">
                                                    {isSelected ? <CheckSquare className="w-4 h-4 text-slate-700" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </TableCell>

                                            {activeCols.map(col => (
                                                <Cell key={col.id}>{renderCell(unit, col.id)}</Cell>
                                            ))}

                                            <TableCell className="sticky right-0 bg-white group-hover:bg-slate-50/60 border-l border-slate-100 py-2.5 px-3 transition-colors">
                                                <div className="flex items-center gap-1 justify-end">
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => setDrawerState({ open: true, mode: 'edit', unit })}
                                                            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(unit)}
                                                        className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* ── Footer / Pagination ── */}
                <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between gap-4 bg-white flex-wrap">
                    {/* Left: count + page size */}
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {filteredUnits.length === 0 ? '0 units' : `${pageStart + 1}–${pageEnd} of ${filteredUnits.length}`}
                            {units.length !== filteredUnits.length && <span className="font-normal"> ({units.length} total)</span>}
                        </span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="inline-flex items-center gap-1 h-6 px-2 rounded border border-slate-200 text-[11px] font-semibold text-slate-500 bg-white hover:border-slate-400 transition-all whitespace-nowrap">
                                    {pageSize} / page <ChevronDown className="w-3 h-3" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="rounded-xl shadow-xl border-slate-100 w-28">
                                {PAGE_SIZE_OPTIONS.map(n => (
                                    <DropdownMenuItem key={n} onClick={() => { setPageSize(n); setPage(1) }}
                                        className={cn('text-xs font-medium py-2 cursor-pointer', pageSize === n && 'font-bold text-slate-900')}>
                                        {n} per page
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Right: page nav */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setPage(1)}
                            disabled={safePage === 1}
                            className="h-7 px-2 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-500 bg-white hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            «
                        </button>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            className="h-7 w-7 rounded-md border border-slate-200 text-slate-500 bg-white hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Page number pills */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                                acc.push(p)
                                return acc
                            }, [])
                            .map((p, idx) =>
                                p === '...'
                                    ? <span key={`ellipsis-${idx}`} className="h-7 w-7 flex items-center justify-center text-[11px] text-slate-400">…</span>
                                    : <button key={p} onClick={() => setPage(p)}
                                        className={cn(
                                            'h-7 w-7 rounded-md border text-[11px] font-semibold transition-all',
                                            p === safePage
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'border-slate-200 text-slate-500 bg-white hover:border-slate-400',
                                        )}>
                                        {p}
                                      </button>
                            )
                        }

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            className="h-7 w-7 rounded-md border border-slate-200 text-slate-500 bg-white hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={safePage === totalPages}
                            className="h-7 px-2 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-500 bg-white hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            »
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Dialogs ── */}
            <UnitDialog
                open={drawerState.open}
                onClose={() => setDrawerState(s => ({ ...s, open: false }))}
                mode={drawerState.mode}
                unit={drawerState.unit}
                project={project}
                projectId={projectId}
                unitConfigs={unitConfigs}
                existingUnitNumbers={units.map(u => u.unit_number).filter(Boolean)}
                onSave={async (payload) => {
                    const isNew = drawerState.mode === 'add'
                    const url = isNew ? '/api/inventory/units' : `/api/inventory/units/${drawerState.unit?.id}`
                    const res = await fetch(url, {
                        method: isNew ? 'POST' : 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    })
                    if (!res.ok) {
                        const err = await res.json()
                        throw new Error(err.error || 'Failed to save unit')
                    }
                    handleActionComplete()
                    return true
                }}
            />

        </div>
    )
}
