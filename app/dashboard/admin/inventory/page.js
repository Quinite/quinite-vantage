'use client'

import { useEffect } from 'react'
import { usePermissions } from '@/contexts/PermissionContext'
import { useInventoryProjects, useInventoryUnits } from '@/hooks/useInventory'
import { formatINR } from '@/lib/inventory'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import {
    Wallet, Home, CheckCircle2, Clock, FolderKanban,
    BarChart3, TrendingUp, ChevronRight, ArrowRight,
    AlertTriangle, Building2, ShieldAlert,
} from 'lucide-react'

// ── constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = {
    Available: '#10b981',
    Sold:      '#6366f1',
    Reserved:  '#f59e0b',
    Blocked:   '#ef4444',
}

const PROJECT_STATUS = {
    planning:           { label: 'Planning',           bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'   },
    under_construction: { label: 'Under Construction', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'  },
    ready_to_move:      { label: 'Ready to Move',      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    completed:          { label: 'Completed',          bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200'  },
}

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0)
const pctStr = (n, total) => `${pct(n, total)}%`

// ── page ─────────────────────────────────────────────────────────────────────

export default function InventoryOverviewPage() {
    const router = useRouter()
    const { hasPermission, loading: permLoading } = usePermissions()

    useEffect(() => {
        if (!permLoading && !hasPermission('view_inventory')) {
            router.replace('/dashboard/admin')
        }
    }, [permLoading, hasPermission])

    const { data: projects = [], isLoading: projectsLoading } = useInventoryProjects()
    const { data: units    = [], isLoading: unitsLoading    } = useInventoryUnits()

    const loading = projectsLoading || unitsLoading

    // ── aggregates ─────────────────────────────────────────────────────────
    const totalUnits     = units.length
    const available      = units.filter(u => u.status === 'available').length
    const sold           = units.filter(u => u.status === 'sold').length
    const reserved       = units.filter(u => u.status === 'reserved').length
    const blocked        = units.filter(u => u.status === 'blocked' || u.status === 'under_maintenance').length

    const portfolioValue = units.reduce((s, u) => s + (Number(u.total_price || u.base_price) || 0), 0)
    const availableValue = units.filter(u => u.status === 'available')
                               .reduce((s, u) => s + (Number(u.total_price || u.base_price) || 0), 0)
    const soldValue      = units.filter(u => u.status === 'sold')
                               .reduce((s, u) => s + (Number(u.total_price || u.base_price) || 0), 0)

    // ── pie data ────────────────────────────────────────────────────────────
    const pieData = [
        { name: 'Available', value: available },
        { name: 'Sold',      value: sold      },
        { name: 'Reserved',  value: reserved  },
        { name: 'Blocked',   value: blocked   },
    ].filter(d => d.value > 0)

    // ── unit type breakdown ─────────────────────────────────────────────────
    const byType = units.reduce((acc, u) => {
        const t = u.type || 'Unknown'
        if (!acc[t]) acc[t] = { total: 0, available: 0, sold: 0, reserved: 0 }
        acc[t].total++
        if (u.status === 'available') acc[t].available++
        if (u.status === 'sold')      acc[t].sold++
        if (u.status === 'reserved')  acc[t].reserved++
        return acc
    }, {})
    const typeEntries = Object.entries(byType).sort((a, b) => b[1].total - a[1].total).slice(0, 6)

    // ── project health ──────────────────────────────────────────────────────
    const projectHealth = projects
        .map(p => {
            const pu     = units.filter(u => u.project_id === p.id)
            const pAvail = pu.filter(u => u.status === 'available').length
            const pSold  = pu.filter(u => u.status === 'sold').length
            const pRes   = pu.filter(u => u.status === 'reserved').length
            const pTotal = p.total_units || pu.length
            const salesPct = pct(pSold + pRes, pTotal)
            return { ...p, pAvail, pSold, pRes, pTotal, salesPct }
        })
        .sort((a, b) => b.pAvail - a.pAvail)

    const nearSoldOut = projectHealth.filter(p => p.salesPct >= 80)

    // ── loading skeleton ────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="p-6 space-y-5 animate-pulse">
                <div className="flex justify-between">
                    <div className="space-y-2">
                        <div className="h-7 w-52 bg-slate-100 rounded-lg" />
                        <div className="h-4 w-72 bg-slate-100 rounded" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 w-24 bg-slate-100 rounded-lg" />
                        <div className="h-9 w-24 bg-slate-100 rounded-lg" />
                    </div>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 h-80 bg-slate-100 rounded-xl" />
                    <div className="space-y-4">
                        <div className="h-56 bg-slate-100 rounded-xl" />
                        <div className="h-44 bg-slate-100 rounded-xl" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="space-y-5">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Inventory Overview</h1>
                        <p className="text-sm md:text-base text-slate-500 mt-1">
                            {projects.length} active project{projects.length !== 1 ? 's' : ''}&nbsp;·&nbsp;{totalUnits} total units
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Link href="/dashboard/admin/inventory/units" className="w-full sm:w-auto">
                            <Button variant="outline" className="gap-2 h-10 w-full justify-center border-slate-200 text-slate-600 hover:bg-slate-50">
                                <Home className="w-4 h-4" />
                                All Units
                            </Button>
                        </Link>
                        <Link href="/dashboard/admin/inventory/analytics" className="w-full sm:w-auto">
                            <Button className="gap-2 h-10 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-100">
                                <BarChart3 className="w-4 h-4" />
                                View Analytics
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* ── KPI Strip ──────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                        {
                            label: 'Portfolio Value', value: formatINR(portfolioValue),
                            icon: Wallet,       bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',
                            sub: 'Total inventory worth',
                        },
                        {
                            label: 'Available Value', value: formatINR(availableValue),
                            icon: TrendingUp,   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100',
                            sub: `${available} units for sale`,
                        },
                        {
                            label: 'Available',       value: available,
                            icon: Home,         bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-100',
                            sub: pctStr(available, totalUnits) + ' of total',
                        },
                        {
                            label: 'Sold',            value: sold,
                            icon: CheckCircle2, bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-100',
                            sub: formatINR(soldValue) + ' realised',
                        },
                        {
                            label: 'Reserved',        value: reserved,
                            icon: Clock,        bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',
                            sub: pctStr(reserved, totalUnits) + ' of total',
                        },
                        {
                            label: 'Active Projects', value: projects.length,
                            icon: FolderKanban, bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-100',
                            sub: blocked > 0 ? `${blocked} unit${blocked !== 1 ? 's' : ''} blocked` : 'All clear',
                        },
                    ].map(({ label, value, icon: Icon, bg, text, border, sub }) => (
                        <div key={label} className={cn(
                            'rounded-xl border bg-white p-4 space-y-2.5 hover:shadow-md transition-shadow',
                            border
                        )}>
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-none">{label}</p>
                                <div className={cn('h-6 w-6 rounded-md flex items-center justify-center', bg)}>
                                    <Icon className={cn('w-3.5 h-3.5', text)} />
                                </div>
                            </div>
                            <p className={cn('text-xl font-bold tabular-nums leading-none', text)}>{value}</p>
                            <p className="text-[11px] text-slate-400 font-medium leading-none">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* ── Main two-col ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Left 2/3: Project health list */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-800">Project Health</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Sales progress across all active projects</p>
                            </div>
                            <Link href="/dashboard/admin/inventory/projects" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                                All Projects <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {projectHealth.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                                <Building2 className="w-9 h-9 mb-3 opacity-25" />
                                <p className="text-sm font-medium text-slate-500">No projects yet</p>
                                <p className="text-xs mt-1 text-slate-400">Enable inventory on a CRM project to get started</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {/* column headings */}
                                <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    <span>Project</span>
                                    <span className="flex items-center gap-8 pr-6">
                                        <span>Avail</span>
                                        <span>Sold</span>
                                        <span>Total</span>
                                    </span>
                                </div>

                                {projectHealth.map(p => {
                                    const sc = PROJECT_STATUS[p.project_status] || PROJECT_STATUS.planning
                                    const isNearSoldOut = p.salesPct >= 80
                                    return (
                                        <div
                                            key={p.id}
                                            className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors cursor-pointer group"
                                            onClick={() => router.push(`/dashboard/admin/inventory/projects/${p.id}`)}
                                        >
                                            {/* Avatar */}
                                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-[10px] font-black text-blue-700 shrink-0 border border-blue-100">
                                                {p.name?.substring(0, 2).toUpperCase()}
                                            </div>

                                            {/* Name + status + bar */}
                                            <div className="flex-1 min-w-0 space-y-1.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                                        {p.name}
                                                    </span>
                                                    <span className={cn(
                                                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0',
                                                        sc.bg, sc.text, sc.border
                                                    )}>
                                                        {sc.label}
                                                    </span>
                                                    {isNearSoldOut && (
                                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                                                            Near Sold Out
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        {/* Stacked: sold (indigo) + reserved (amber) */}
                                                        <div className="h-full flex">
                                                            <div
                                                                className="h-full bg-indigo-500 transition-all"
                                                                style={{ width: `${pct(p.pSold, p.pTotal)}%` }}
                                                            />
                                                            <div
                                                                className="h-full bg-amber-400 transition-all"
                                                                style={{ width: `${pct(p.pRes, p.pTotal)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <span className={cn(
                                                        'text-[11px] font-bold tabular-nums shrink-0 w-8 text-right',
                                                        isNearSoldOut ? 'text-rose-500' : 'text-slate-500'
                                                    )}>
                                                        {p.salesPct}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center gap-5 shrink-0">
                                                <div className="text-center w-8">
                                                    <p className="text-sm font-bold text-emerald-600 tabular-nums">{p.pAvail}</p>
                                                    <p className="text-[10px] text-slate-400">avail</p>
                                                </div>
                                                <div className="text-center w-8">
                                                    <p className="text-sm font-bold text-indigo-600 tabular-nums">{p.pSold}</p>
                                                    <p className="text-[10px] text-slate-400">sold</p>
                                                </div>
                                                <div className="text-center w-8">
                                                    <p className="text-sm font-bold text-slate-500 tabular-nums">{p.pTotal}</p>
                                                    <p className="text-[10px] text-slate-400">total</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right 1/3: Donut + Quick Access */}
                    <div className="space-y-4">
                        {/* Status donut */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                                <h2 className="text-sm font-semibold text-slate-800">Status Breakdown</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{totalUnits} total units</p>
                            </div>
                            <div className="p-5">
                                {totalUnits > 0 ? (
                                    <>
                                        {/* Donut */}
                                        <div className="h-36 relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={38}
                                                        outerRadius={60}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {pieData.map((entry) => (
                                                            <Cell key={entry.name} fill={PIE_COLORS[entry.name]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(val, name) => [`${val} (${pctStr(val, totalUnits)})`, name]}
                                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        {/* Legend */}
                                        <div className="space-y-2 mt-2">
                                            {[
                                                { label: 'Available', count: available, dot: 'bg-emerald-500' },
                                                { label: 'Sold',      count: sold,      dot: 'bg-indigo-500'  },
                                                { label: 'Reserved',  count: reserved,  dot: 'bg-amber-400'   },
                                                { label: 'Blocked',   count: blocked,   dot: 'bg-red-500'     },
                                            ].map(s => (
                                                <div key={s.label} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn('w-2 h-2 rounded-full shrink-0', s.dot)} />
                                                        <span className="text-slate-600 font-medium">{s.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 tabular-nums">{s.count}</span>
                                                        <span className="text-slate-400 tabular-nums w-9 text-right">{pctStr(s.count, totalUnits)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-10 text-center text-slate-400">
                                        <p className="text-sm">No units data</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick access */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                                <h2 className="text-sm font-semibold text-slate-800">Quick Access</h2>
                            </div>
                            <div className="p-3 space-y-1">
                                {[
                                    { label: 'Browse All Units',   href: '/dashboard/admin/inventory/units',     icon: Home,         desc: `${available} available`,      text: 'text-emerald-600' },
                                    { label: 'Manage Projects',    href: '/dashboard/admin/inventory/projects',  icon: FolderKanban, desc: `${projects.length} projects`,  text: 'text-blue-600'    },
                                    { label: 'View Analytics',     href: '/dashboard/admin/inventory/analytics', icon: BarChart3,    desc: 'Charts & performance',         text: 'text-violet-600'  },
                                ].map(({ label, href, icon: Icon, desc, text }) => (
                                    <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-white transition-colors">
                                            <Icon className={cn('w-4 h-4', text)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{label}</p>
                                            <p className="text-[11px] text-slate-400">{desc}</p>
                                        </div>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Unit Type Breakdown ─────────────────────────────────── */}
                {typeEntries.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                            <h2 className="text-sm font-semibold text-slate-800">Availability by Unit Type</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Units breakdown per configuration across all projects</p>
                        </div>
                        <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                            {typeEntries.map(([type, d]) => {
                                const soldPct  = pct(d.sold,      d.total)
                                const resPct   = pct(d.reserved,  d.total)
                                const availPct = pct(d.available, d.total)
                                return (
                                    <div key={type} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{type.replace(/_/g, ' ')}</span>
                                            <span className="text-xs text-slate-500 tabular-nums font-semibold">{d.total}</span>
                                        </div>
                                        {/* Stacked progress */}
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-indigo-500" style={{ width: `${soldPct}%`  }} />
                                            <div className="h-full bg-amber-400"  style={{ width: `${resPct}%`   }} />
                                            <div className="h-full bg-emerald-500" style={{ width: `${availPct}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-emerald-600 font-semibold">{d.available} avail</span>
                                            <span className="text-indigo-600 font-medium">{d.sold} sold</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        {/* Legend */}
                        <div className="px-5 pb-4 flex items-center gap-5 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />Sold</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />Reserved</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Available</span>
                        </div>
                    </div>
                )}

                {/* ── Alerts ─────────────────────────────────────────────── */}
                {(blocked > 0 || nearSoldOut.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {blocked > 0 && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-red-800">
                                        {blocked} unit{blocked !== 1 ? 's' : ''} blocked or under maintenance
                                    </p>
                                    <p className="text-xs text-red-600 mt-0.5">
                                        Review and update to make them available for sale.
                                    </p>
                                    <Link href="/dashboard/admin/inventory/units" className="text-xs font-semibold text-red-700 underline underline-offset-2 mt-1.5 inline-block hover:text-red-800">
                                        View blocked units →
                                    </Link>
                                </div>
                            </div>
                        )}
                        {nearSoldOut.length > 0 && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">
                                        {nearSoldOut.length} project{nearSoldOut.length !== 1 ? 's' : ''} near sold out (≥80%)
                                    </p>
                                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                                        {nearSoldOut.map(p => p.name).join(', ')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}
