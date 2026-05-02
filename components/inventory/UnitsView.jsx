'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Search, X, Plus, ChevronUp, ChevronDown, ChevronsUpDown,
    Building2, BedDouble, Home, MoreHorizontal, Edit, RefreshCcw,
    Filter, SlidersHorizontal, ArrowUpDown, Layers, IndianRupee,
    MapPin, CheckSquare, Square
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePermission } from '@/contexts/PermissionContext'
import { useInventoryProjects, useInventoryUnits } from '@/hooks/useInventory'
import UnitDialog from './UnitDialog'
import StatusChangeModal from './StatusChangeModal'
import { formatINR, getStatusConfig } from '@/lib/inventory'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUSES = [
    { value: 'available',         label: 'Available',    dot: 'bg-emerald-500' },
    { value: 'reserved',          label: 'Reserved',     dot: 'bg-amber-500'   },
    { value: 'sold',              label: 'Sold',         dot: 'bg-rose-500'    },
    { value: 'blocked',           label: 'Blocked',      dot: 'bg-slate-400'   },
    { value: 'under_maintenance', label: 'Maintenance',  dot: 'bg-purple-500'  },
]

const UNIT_TYPES = [
    'Apartment', 'Villa', 'Villa Bungalow', 'Penthouse',
    'Office', 'Retail', 'Showroom', 'Industrial', 'Plot', 'Land', 'Studio',
]

const BHK_OPTIONS = ['1', '2', '3', '4', '5']

const SORTABLE_COLS = {
    unit_number:  { label: 'Unit #',      get: u => u.unit_number ?? '' },
    floor_number: { label: 'Floor',       get: u => u.floor_number ?? 0 },
    carpet_area:  { label: 'Area',        get: u => u.carpet_area ?? u.config?.carpet_area ?? 0 },
    total_price:  { label: 'Price',       get: u => u.total_price ?? u.base_price ?? 0 },
    status:       { label: 'Status',      get: u => u.status ?? '' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }) {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-300 shrink-0" />
    return sortDir === 'asc'
        ? <ChevronUp className="w-3 h-3 ml-1 text-slate-700 shrink-0" />
        : <ChevronDown className="w-3 h-3 ml-1 text-slate-700 shrink-0" />
}

function StatusBadge({ status }) {
    const cfg = getStatusConfig(status || 'available')
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
            cfg.bg, cfg.text
        )}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
            {cfg.label}
        </span>
    )
}

function FilterChip({ label, count, icon: Icon, active, children }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all select-none',
                    active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
                )}>
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    {label}
                    {count > 0 && (
                        <span className={cn(
                            'ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold',
                            active ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-700'
                        )}>
                            {count}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-xl shadow-xl border-slate-100 min-w-[180px]">
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function TableSkeleton() {
    return Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i} className="border-slate-100">
            {Array.from({ length: 8 }).map((_, j) => (
                <TableCell key={j} className={j === 0 ? 'pl-5' : ''}>
                    <Skeleton className={cn('h-4 rounded', j === 0 ? 'w-16' : j === 7 ? 'w-8 ml-auto' : 'w-24')} />
                </TableCell>
            ))}
        </TableRow>
    ))
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UnitsView({ projectId = null }) {
    const canManage = usePermission('manage_inventory')
    const canEdit   = usePermission('edit_inventory')

    const { data: units = [], isLoading: unitsLoading, refetch: refetchUnits } = useInventoryUnits(projectId)
    const { data: projects = [], isLoading: projectsLoading } = useInventoryProjects()
    const loading = unitsLoading || projectsLoading

    // ── Filter state ──
    const [search,           setSearch]           = useState('')
    const [selStatuses,      setSelStatuses]      = useState([])
    const [selTypes,         setSelTypes]         = useState([])
    const [selProjects,      setSelProjects]      = useState([])
    const [selBHK,           setSelBHK]           = useState([])
    const [priceRange,       setPriceRange]       = useState({ min: '', max: '' })
    const [areaRange,        setAreaRange]        = useState({ min: '', max: '' })
    const [rangePopoverOpen, setRangePopoverOpen] = useState(false)

    // ── Sort state ──
    const [sortCol, setSortCol] = useState('unit_number')
    const [sortDir, setSortDir] = useState('asc')

    // ── Selection state ──
    const [selected, setSelected] = useState(new Set())

    // ── Dialog state ──
    const [drawerState,      setDrawerState]      = useState({ open: false, mode: 'add', unit: null })
    const [statusModalState, setStatusModalState] = useState({ open: false, unit: null })

    // ── Toggle helpers ──
    const toggle = useCallback((setter, value) => {
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
    }, [])

    const clearAll = useCallback(() => {
        setSearch(''); setSelStatuses([]); setSelTypes([])
        setSelProjects([]); setSelBHK([])
        setPriceRange({ min: '', max: '' }); setAreaRange({ min: '', max: '' })
        setSelected(new Set())
    }, [])

    const hasFilters = search || selStatuses.length || selTypes.length ||
        selProjects.length || selBHK.length ||
        priceRange.min || priceRange.max || areaRange.min || areaRange.max

    // ── Sort handler ──
    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortCol(col); setSortDir('asc') }
    }

    // ── Derived data ──
    const filteredUnits = useMemo(() => {
        let result = units.filter(unit => {
            if (search) {
                const q = search.toLowerCase()
                const matches =
                    unit.unit_number?.toLowerCase().includes(q) ||
                    unit.tower?.name?.toLowerCase().includes(q) ||
                    unit.config?.config_name?.toLowerCase().includes(q) ||
                    unit.project?.name?.toLowerCase().includes(q)
                if (!matches) return false
            }
            if (selStatuses.length && !selStatuses.includes(unit.status)) return false
            if (selTypes.length) {
                const t = unit.config?.property_type || unit.type || ''
                if (!selTypes.includes(t)) return false
            }
            if (!projectId && selProjects.length && !selProjects.includes(unit.project_id)) return false
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

        const { get } = SORTABLE_COLS[sortCol] || SORTABLE_COLS.unit_number
        result.sort((a, b) => {
            const av = get(a), bv = get(b)
            if (av < bv) return sortDir === 'asc' ? -1 : 1
            if (av > bv) return sortDir === 'asc' ?  1 : -1
            return 0
        })
        return result
    }, [units, search, selStatuses, selTypes, selProjects, selBHK, priceRange, areaRange, projectId, sortCol, sortDir])

    const activeProject = useMemo(() => {
        const pid = projectId || drawerState.unit?.project_id
        return projects.find(p => p.id === pid)
    }, [projectId, drawerState.unit?.project_id, projects])

    // ── Selection helpers ──
    const allSelected  = filteredUnits.length > 0 && filteredUnits.every(u => selected.has(u.id))
    const someSelected = filteredUnits.some(u => selected.has(u.id))
    const toggleAll    = () => {
        if (allSelected) setSelected(new Set())
        else setSelected(new Set(filteredUnits.map(u => u.id)))
    }
    const toggleRow    = (id) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })

    const selectedCount = selected.size

    // ── Stats (for status summary row) ──
    const stats = useMemo(() => {
        const counts = {}
        for (const s of STATUSES) counts[s.value] = 0
        for (const u of filteredUnits) counts[u.status] = (counts[u.status] || 0) + 1
        return counts
    }, [filteredUnits])

    // ── SortableHead helper ──
    const SortHead = ({ col, children, className }) => (
        <TableHead
            className={cn('select-none cursor-pointer group', className)}
            onClick={() => handleSort(col)}
        >
            <div className="flex items-center gap-0.5">
                {children}
                <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
            </div>
        </TableHead>
    )

    const rangeActive = priceRange.min || priceRange.max || areaRange.min || areaRange.max

    return (
        <div className="flex flex-col h-full bg-slate-50/40">

            {/* ── Toolbar ── */}
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-col gap-3 sticky top-0 z-10">

                {/* Row 1: search + add */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Search unit, tower, config…"
                            className="pl-9 h-9 bg-slate-50 border-slate-200 text-sm rounded-lg focus:bg-white transition-colors"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {selectedCount > 0 && (
                            <span className="text-xs font-medium text-slate-500 mr-1">
                                {selectedCount} selected
                            </span>
                        )}
                        {canManage && (
                            <Button
                                onClick={() => setDrawerState({ open: true, mode: 'add', unit: null })}
                                className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Unit
                            </Button>
                        )}
                    </div>
                </div>

                {/* Row 2: filters */}
                <div className="flex items-center gap-2 flex-wrap">

                    {/* Status */}
                    <FilterChip
                        label="Status"
                        count={selStatuses.length}
                        active={selStatuses.length > 0}
                    >
                        <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {STATUSES.map(s => (
                            <DropdownMenuCheckboxItem
                                key={s.value}
                                checked={selStatuses.includes(s.value)}
                                onCheckedChange={() => toggle(setSelStatuses, s.value)}
                                className="text-xs py-2"
                            >
                                <span className={cn('w-2 h-2 rounded-full mr-2 shrink-0 inline-block', s.dot)} />
                                {s.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </FilterChip>

                    {/* Type */}
                    <FilterChip
                        label="Type"
                        icon={Home}
                        count={selTypes.length}
                        active={selTypes.length > 0}
                    >
                        <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit Type</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="max-h-56 overflow-y-auto">
                            {UNIT_TYPES.map(t => (
                                <DropdownMenuCheckboxItem
                                    key={t}
                                    checked={selTypes.includes(t)}
                                    onCheckedChange={() => toggle(setSelTypes, t)}
                                    className="text-xs py-2"
                                >
                                    {t}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </div>
                    </FilterChip>

                    {/* BHK */}
                    <FilterChip
                        label="BHK"
                        icon={BedDouble}
                        count={selBHK.length}
                        active={selBHK.length > 0}
                    >
                        <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Config</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {BHK_OPTIONS.map(n => (
                            <DropdownMenuCheckboxItem
                                key={n}
                                checked={selBHK.includes(n)}
                                onCheckedChange={() => toggle(setSelBHK, n)}
                                className="text-xs py-2"
                            >
                                {n}{n === '5' ? '+' : ''} BHK
                            </DropdownMenuCheckboxItem>
                        ))}
                    </FilterChip>

                    {/* Project (only on all-units page) */}
                    {!projectId && projects.length > 0 && (
                        <FilterChip
                            label="Project"
                            icon={Building2}
                            count={selProjects.length}
                            active={selProjects.length > 0}
                        >
                            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="max-h-56 overflow-y-auto">
                                {projects.map(p => (
                                    <DropdownMenuCheckboxItem
                                        key={p.id}
                                        checked={selProjects.includes(p.id)}
                                        onCheckedChange={() => toggle(setSelProjects, p.id)}
                                        className="text-xs py-2"
                                    >
                                        {p.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </div>
                        </FilterChip>
                    )}

                    {/* Price / Area ranges */}
                    <Popover open={rangePopoverOpen} onOpenChange={setRangePopoverOpen}>
                        <PopoverTrigger asChild>
                            <button className={cn(
                                'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all select-none',
                                rangeActive
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
                            )}>
                                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                                Ranges
                                {rangeActive && (
                                    <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-white text-slate-900">
                                        !
                                    </span>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-72 p-4 rounded-xl shadow-xl border-slate-100 space-y-4">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price Range (₹)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input placeholder="Min" type="number" className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md"
                                        value={priceRange.min} onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))} />
                                    <Input placeholder="Max" type="number" className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md"
                                        value={priceRange.max} onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carpet Area (sq.ft)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input placeholder="Min" type="number" className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md"
                                        value={areaRange.min} onChange={e => setAreaRange(p => ({ ...p, min: e.target.value }))} />
                                    <Input placeholder="Max" type="number" className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md"
                                        value={areaRange.max} onChange={e => setAreaRange(p => ({ ...p, max: e.target.value }))} />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" className="flex-1 h-8 text-xs rounded-md bg-slate-900 hover:bg-slate-800"
                                    onClick={() => setRangePopoverOpen(false)}>
                                    Apply
                                </Button>
                                {rangeActive && (
                                    <Button size="sm" variant="ghost" className="h-8 text-xs rounded-md text-slate-400 hover:text-rose-500"
                                        onClick={() => { setPriceRange({ min: '', max: '' }); setAreaRange({ min: '', max: '' }) }}>
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {hasFilters && (
                        <button
                            onClick={clearAll}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                        >
                            <X className="w-3 h-3" />
                            Clear all
                        </button>
                    )}

                    {/* Status summary pills */}
                    <div className="ml-auto flex items-center gap-2">
                        {STATUSES.map(s => stats[s.value] > 0 && (
                            <button
                                key={s.value}
                                onClick={() => toggle(setSelStatuses, s.value)}
                                className={cn(
                                    'inline-flex items-center gap-1 px-2 h-6 rounded-md text-[11px] font-semibold transition-all border',
                                    selStatuses.includes(s.value)
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                )}
                            >
                                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', s.dot)} />
                                {stats[s.value]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-hidden flex flex-col px-5 py-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                    <div className="overflow-auto flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-slate-100">
                                    {/* Checkbox */}
                                    <TableHead className="w-10 pl-4">
                                        <button onClick={toggleAll} className="text-slate-400 hover:text-slate-700 transition-colors">
                                            {allSelected
                                                ? <CheckSquare className="w-4 h-4 text-slate-700" />
                                                : someSelected
                                                    ? <CheckSquare className="w-4 h-4 text-slate-400" />
                                                    : <Square className="w-4 h-4" />
                                            }
                                        </button>
                                    </TableHead>

                                    <SortHead col="unit_number" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">
                                        Unit #
                                    </SortHead>

                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Project / Tower
                                    </TableHead>

                                    <SortHead col="floor_number" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20">
                                        Floor
                                    </SortHead>

                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Configuration
                                    </TableHead>

                                    <SortHead col="carpet_area" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28 text-right">
                                        Area (sq.ft)
                                    </SortHead>

                                    <SortHead col="total_price" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32 text-right">
                                        Price
                                    </SortHead>

                                    <SortHead col="status" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32">
                                        Status
                                    </SortHead>

                                    <TableHead className="w-12 pr-4" />
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableSkeleton />
                                ) : filteredUnits.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <Search className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900">No units found</p>
                                                <p className="text-xs text-slate-400">Adjust filters or search to find units.</p>
                                                {hasFilters && (
                                                    <button onClick={clearAll} className="mt-1 text-xs text-blue-600 hover:underline font-medium">
                                                        Clear all filters
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUnits.map(unit => {
                                        const isSelected = selected.has(unit.id)
                                        const area = unit.carpet_area ?? unit.config?.carpet_area
                                        const beds = unit.bedrooms ?? unit.config?.bedrooms
                                        const facing = unit.facing

                                        return (
                                            <TableRow
                                                key={unit.id}
                                                className={cn(
                                                    'border-slate-100 transition-colors group',
                                                    isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                                                )}
                                            >
                                                {/* Checkbox */}
                                                <TableCell className="pl-4 w-10">
                                                    <button
                                                        onClick={() => toggleRow(unit.id)}
                                                        className="text-slate-300 hover:text-slate-600 transition-colors"
                                                    >
                                                        {isSelected
                                                            ? <CheckSquare className="w-4 h-4 text-slate-700" />
                                                            : <Square className="w-4 h-4" />
                                                        }
                                                    </button>
                                                </TableCell>

                                                {/* Unit # */}
                                                <TableCell>
                                                    <span className="font-bold text-slate-900 text-sm tracking-tight">
                                                        {unit.unit_number}
                                                    </span>
                                                </TableCell>

                                                {/* Project / Tower */}
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        {!projectId && unit.project?.name && (
                                                            <span className="text-[11px] text-slate-400 font-medium truncate max-w-[160px]">
                                                                {unit.project.name}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                            {unit.tower?.name
                                                                ? <><Layers className="w-3 h-3 text-slate-400 shrink-0" />{unit.tower.name}</>
                                                                : <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                                            }
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Floor */}
                                                <TableCell>
                                                    <span className="text-sm text-slate-700 font-medium tabular-nums">
                                                        {unit.floor_number != null ? unit.floor_number : '—'}
                                                    </span>
                                                </TableCell>

                                                {/* Config */}
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs font-semibold text-slate-800">
                                                            {unit.config?.config_name || unit.config?.property_type || '—'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">
                                                            {[
                                                                beds ? `${beds} BHK` : null,
                                                                facing || null,
                                                            ].filter(Boolean).join(' · ') || '—'}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Area */}
                                                <TableCell className="text-right">
                                                    <span className="text-sm font-semibold text-slate-700 tabular-nums">
                                                        {area ? area.toLocaleString('en-IN') : '—'}
                                                    </span>
                                                </TableCell>

                                                {/* Price */}
                                                <TableCell className="text-right">
                                                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                                                        {formatINR(unit.total_price || unit.base_price || 0)}
                                                    </span>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>
                                                    <StatusBadge status={unit.status} />
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="pr-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl border-slate-100">
                                                            {canEdit && (
                                                                <DropdownMenuItem
                                                                    onClick={() => setDrawerState({ open: true, mode: 'edit', unit })}
                                                                    className="text-xs font-medium py-2 cursor-pointer gap-2"
                                                                >
                                                                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                                                                    Edit Details
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canManage && (
                                                                <DropdownMenuItem
                                                                    onClick={() => setStatusModalState({ open: true, unit })}
                                                                    className="text-xs font-medium py-2 cursor-pointer gap-2"
                                                                >
                                                                    <RefreshCcw className="w-3.5 h-3.5 text-slate-400" />
                                                                    Update Status
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 px-5 py-2.5 flex items-center justify-between shrink-0 bg-white">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            {filteredUnits.length} {filteredUnits.length === 1 ? 'unit' : 'units'}
                            {units.length !== filteredUnits.length && (
                                <span className="font-normal"> of {units.length}</span>
                            )}
                        </span>
                        {selectedCount > 0 && (
                            <span className="text-[11px] font-semibold text-slate-500">
                                {selectedCount} selected
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Dialogs ── */}
            <UnitDialog
                open={drawerState.open}
                onClose={() => setDrawerState(s => ({ ...s, open: false }))}
                mode={drawerState.mode}
                unit={drawerState.unit}
                project={activeProject}
                projectId={projectId || drawerState.unit?.project_id}
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
                    refetchUnits()
                    return true
                }}
            />

            <StatusChangeModal
                isOpen={statusModalState.open}
                property={statusModalState.unit}
                onClose={() => setStatusModalState(s => ({ ...s, open: false }))}
                onStatusChanged={refetchUnits}
            />
        </div>
    )
}
