'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInventoryProjects, useInventoryUnits } from '@/hooks/useInventory'
import { formatINR } from '@/lib/inventory'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Search, Building2, MapPin, FolderKanban,
    Home, CheckCircle2, Clock, ChevronRight,
    LayoutGrid, List, ShieldAlert, ArrowUpRight,
} from 'lucide-react'

// ── constants ────────────────────────────────────────────────────────────────

const STATUS = {
    planning:           { label: 'Planning',           bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500'    },
    under_construction: { label: 'Under Construction', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-500'   },
    ready_to_move:      { label: 'Ready to Move',      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    completed:          { label: 'Completed',          bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200', dot: 'bg-violet-500'  },
}

const ALL_STATUSES = ['planning', 'under_construction', 'ready_to_move', 'completed']

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0)

// ── page ─────────────────────────────────────────────────────────────────────

export default function InventoryProjectsPage() {
    const router  = useRouter()
    const [search,    setSearch]    = useState('')
    const [filter,    setFilter]    = useState('all')   // 'all' | status slug
    const [viewMode,  setViewMode]  = useState('grid')  // 'grid' | 'list'

    const { data: projects = [], isLoading: projectsLoading } = useInventoryProjects()
    const { data: units    = [], isLoading: unitsLoading    } = useInventoryUnits()
    const loading = projectsLoading || unitsLoading

    // ── enrich with live unit stats ────────────────────────────────────────
    const enriched = projects.map(p => {
        const pu       = units.filter(u => u.project_id === p.id)
        const avail    = p.available_units ?? pu.filter(u => u.status === 'available').length
        const sold     = p.sold_units      ?? pu.filter(u => u.status === 'sold').length
        const reserved = p.reserved_units  ?? pu.filter(u => u.status === 'reserved').length
        const total    = p.total_units     || pu.length || 0
        const blocked  = pu.filter(u => u.status === 'blocked' || u.status === 'under_maintenance').length
        const salesPct = pct(sold + reserved, total)

        // price range from unit_configs
        const prices = (p.unit_configs || []).map(c => c.base_price).filter(Boolean)
        const minPrice = prices.length ? Math.min(...prices) : null

        return { ...p, avail, sold, reserved, total, blocked, salesPct, minPrice }
    })

    // ── filter + search ────────────────────────────────────────────────────
    const filtered = enriched.filter(p => {
        const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
                            p.address?.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'all' || p.project_status === filter
        return matchSearch && matchFilter
    })

    // ── status tab counts ──────────────────────────────────────────────────
    const counts = ALL_STATUSES.reduce((acc, s) => {
        acc[s] = enriched.filter(p => p.project_status === s).length
        return acc
    }, { all: enriched.length })

    // ── loading ────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="p-6 space-y-5 animate-pulse">
                <div className="flex justify-between">
                    <div className="h-7 w-48 bg-slate-100 rounded-lg" />
                    <div className="flex gap-2">
                        <div className="h-9 w-52 bg-slate-100 rounded-lg" />
                        <div className="h-9 w-24 bg-slate-100 rounded-lg" />
                    </div>
                </div>
                <div className="flex gap-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-8 w-28 bg-slate-100 rounded-lg" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-slate-100 rounded-xl" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="space-y-5">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Project Inventory</h1>
                        <p className="text-sm md:text-base text-slate-500 mt-1">
                            {enriched.length} project{enriched.length !== 1 ? 's' : ''} managed in your inventory.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        {/* View toggle */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5 w-full sm:w-auto justify-center">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    'h-7 w-full sm:w-7 px-4 sm:px-0 rounded-md flex items-center justify-center transition-all',
                                    viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
                                )}
                            >
                                <LayoutGrid className="w-3.5 h-3.5 sm:mr-0 mr-1.5" />
                                <span className="sm:hidden text-xs font-medium">Grid</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    'h-7 w-full sm:w-7 px-4 sm:px-0 rounded-md flex items-center justify-center transition-all',
                                    viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
                                )}
                            >
                                <List className="w-3.5 h-3.5 sm:mr-0 mr-1.5" />
                                <span className="sm:hidden text-xs font-medium">List</span>
                            </button>
                        </div>
                        {/* Search */}
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search projects..."
                                className="pl-9 h-9 text-sm w-full sm:w-52 bg-white"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Status filter tabs ───────────────────────────────────── */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                        { key: 'all', label: 'All Projects', count: counts.all },
                        ...ALL_STATUSES.map(s => ({ key: s, label: STATUS[s].label, count: counts[s], sc: STATUS[s] }))
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                                filter === tab.key
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            )}
                        >
                            {tab.sc && (
                                <span className={cn('w-1.5 h-1.5 rounded-full', tab.sc.dot)} />
                            )}
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={cn(
                                    'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                                    filter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Empty state ──────────────────────────────────────────── */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                        <FolderKanban className="w-10 h-10 text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-600">
                            {search || filter !== 'all' ? 'No projects match your filters' : 'No projects in inventory'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                            {!search && filter === 'all'
                                ? 'Enable "Show in Inventory" on a CRM project to see it here.'
                                : 'Try adjusting your search or filter.'}
                        </p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* ── Grid view ──────────────────────────────────────── */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(p => <ProjectCard key={p.id} project={p} onClick={() => router.push(`/dashboard/admin/inventory/projects/${p.id}`)} />)}
                    </div>
                ) : (
                    /* ── List view ──────────────────────────────────────── */
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Column headers */}
                        <div className="hidden md:grid grid-cols-[1fr_90px_90px_90px_130px_36px] gap-4 px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/80">
                            <span>Project</span>
                            <span className="text-center">Available</span>
                            <span className="text-center">Sold</span>
                            <span className="text-center">Total</span>
                            <span>Sales Progress</span>
                            <span />
                        </div>
                        <div className="divide-y divide-slate-100">
                            {filtered.map(p => <ProjectListRow key={p.id} project={p} onClick={() => router.push(`/dashboard/admin/inventory/projects/${p.id}`)} />)}
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function ProjectCard({ project: p, onClick }) {
    const sc       = STATUS[p.project_status] || STATUS.planning
    const isSoldOut = p.salesPct >= 95
    const isNearSoldOut = p.salesPct >= 80 && !isSoldOut

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group overflow-hidden"
        >
            {/* Top accent + status */}
            <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />

            <div className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-[11px] font-black text-blue-700 border border-blue-100 shrink-0">
                            {p.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate leading-tight">
                                {p.name}
                            </h3>
                            {p.address && (
                                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 shrink-0" />{p.address}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', sc.bg, sc.text, sc.border)}>
                            {sc.label}
                        </span>
                        {isSoldOut && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">Sold Out</span>
                        )}
                        {isNearSoldOut && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">Near Sold Out</span>
                        )}
                    </div>
                </div>

                {/* Unit configs chips */}
                {p.unit_configs?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {p.unit_configs.slice(0, 4).map((c, i) => (
                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {c.config_name || c.name}
                            </span>
                        ))}
                        {p.unit_configs.length > 4 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                +{p.unit_configs.length - 4}
                            </span>
                        )}
                    </div>
                )}

                {/* Starting price */}
                {p.minPrice && (
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Starting From</p>
                        <p className="text-base font-black text-blue-600">{formatINR(p.minPrice)}</p>
                    </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: 'Available', value: p.avail,    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: Home         },
                        { label: 'Sold',      value: p.sold,     bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-100',  icon: CheckCircle2 },
                        { label: 'Reserved',  value: p.reserved, bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',   icon: Clock        },
                    ].map(({ label, value, bg, text, border, icon: Icon }) => (
                        <div key={label} className={cn('rounded-lg border p-2 text-center', bg, border)}>
                            <p className={cn('text-base font-black tabular-nums', text)}>{value}</p>
                            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Progress bar */}
                {p.total > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Sales Progress</span>
                            <span className={cn('text-[11px] font-bold tabular-nums', p.salesPct >= 80 ? 'text-rose-500' : 'text-slate-600')}>
                                {p.salesPct}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${pct(p.sold, p.total)}%` }} />
                            <div className="h-full bg-amber-400 transition-all"  style={{ width: `${pct(p.reserved, p.total)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{p.sold + p.reserved} committed</span>
                            <span>{p.total} total</span>
                        </div>
                    </div>
                )}

                {/* Blocked warning */}
                {p.blocked > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        {p.blocked} unit{p.blocked !== 1 ? 's' : ''} blocked
                    </div>
                )}
            </div>

            {/* Footer CTA */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{p.total} total units</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-1.5 transition-all">
                    View Details <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
            </div>
        </div>
    )
}

// ── List row ──────────────────────────────────────────────────────────────────

function ProjectListRow({ project: p, onClick }) {
    const sc = STATUS[p.project_status] || STATUS.planning
    return (
        <div
            onClick={onClick}
            className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_90px_90px_90px_130px_36px] gap-4 items-center px-5 py-3.5 hover:bg-slate-50/60 transition-colors cursor-pointer group"
        >
            {/* Name + location */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-700 border border-blue-100 shrink-0">
                    {p.name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                            {p.name}
                        </span>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0', sc.bg, sc.text, sc.border)}>
                            {sc.label}
                        </span>
                    </div>
                    {p.address && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />{p.address}
                        </p>
                    )}
                </div>
            </div>

            {/* Stats — hidden on mobile */}
            <div className="hidden md:block text-center">
                <span className="text-sm font-bold text-emerald-600 tabular-nums">{p.avail}</span>
            </div>
            <div className="hidden md:block text-center">
                <span className="text-sm font-bold text-indigo-600 tabular-nums">{p.sold}</span>
            </div>
            <div className="hidden md:block text-center">
                <span className="text-sm font-semibold text-slate-500 tabular-nums">{p.total}</span>
            </div>

            {/* Progress */}
            <div className="hidden md:block space-y-1">
                <div className="flex items-center justify-end gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-indigo-500" style={{ width: `${pct(p.sold, p.total)}%` }} />
                        <div className="h-full bg-amber-400"  style={{ width: `${pct(p.reserved, p.total)}%` }} />
                    </div>
                    <span className={cn('text-[11px] font-bold tabular-nums shrink-0 w-9 text-right', p.salesPct >= 80 ? 'text-rose-500' : 'text-slate-500')}>
                        {p.salesPct}%
                    </span>
                </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
            </div>

            {/* Mobile: just arrow */}
            <ChevronRight className="md:hidden w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
        </div>
    )
}
