'use client'

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { formatINR } from '@/lib/inventory'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
    Wallet, TrendingUp, PiggyBank, BadgeDollarSign,
    FolderKanban, ChevronRight, ArrowUpRight, Percent,
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────

const pct    = (n, t)  => (t > 0 ? Math.round((n / t) * 100) : 0)
const trunc  = (s, n)  => (s?.length > n ? s.slice(0, n) + '…' : s || '—')

const PROJECT_STATUS = {
    planning:           { label: 'Planning',           bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'   },
    under_construction: { label: 'Under Construction', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'  },
    ready_to_move:      { label: 'Ready to Move',      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    completed:          { label: 'Completed',          bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200'  },
}

// Custom tooltip shared style
const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
    padding: '8px 12px',
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children, action }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                {action}
            </div>
            {children}
        </div>
    )
}

// ── main ──────────────────────────────────────────────────────────────────────

export function AnalyticsView({ units = [], projects = [] }) {

    // ── aggregate revenue stats ─────────────────────────────────────────────
    const price        = u => Number(u.total_price || u.base_price) || 0
    const totalValue   = units.reduce((s, u) => s + price(u), 0)
    const soldValue    = units.filter(u => u.status === 'sold')     .reduce((s, u) => s + price(u), 0)
    const reservedValue= units.filter(u => u.status === 'reserved') .reduce((s, u) => s + price(u), 0)
    const availValue   = units.filter(u => u.status === 'available').reduce((s, u) => s + price(u), 0)

    const totalUnits   = units.length
    const sold         = units.filter(u => u.status === 'sold').length
    const reserved     = units.filter(u => u.status === 'reserved').length
    const available    = units.filter(u => u.status === 'available').length
    const convRate     = pct(sold + reserved, totalUnits)

    // ── per-project data ────────────────────────────────────────────────────
    const projectRows = projects
        .map(p => {
            const pu    = units.filter(u => u.project_id === p.id)
            const pSold = pu.filter(u => u.status === 'sold')
            const pRes  = pu.filter(u => u.status === 'reserved')
            const pAvail= pu.filter(u => u.status === 'available')
            const pTotal= p.total_units || pu.length
            const sv    = pSold .reduce((s, u) => s + price(u), 0)
            const rv    = pRes  .reduce((s, u) => s + price(u), 0)
            const av    = pAvail.reduce((s, u) => s + price(u), 0)
            const tv    = pu    .reduce((s, u) => s + price(u), 0)
            const avgP  = pu.length > 0 ? tv / pu.length : 0
            const sp    = pct(pSold.length + pRes.length, pTotal)
            return {
                id:        p.id,
                name:      p.name,
                status:    p.project_status,
                pTotal,
                sold:      pSold.length,
                reserved:  pRes.length,
                available: pAvail.length,
                soldValue: sv,
                resValue:  rv,
                availValue:av,
                totalValue:tv,
                avgPrice:  avgP,
                salesPct:  sp,
            }
        })
        .sort((a, b) => b.salesPct - a.salesPct)

    // ── chart data ──────────────────────────────────────────────────────────

    // Stacked bar: unit counts per project
    const projectBarData = projectRows.map(r => ({
        name:      trunc(r.name, 14),
        fullName:  r.name,
        Sold:      r.sold,
        Reserved:  r.reserved,
        Available: r.available,
    }))

    // Grouped bar: revenue per project
    const revenueBarData = projectRows
        .filter(r => r.totalValue > 0)
        .map(r => ({
            name:      trunc(r.name, 14),
            fullName:  r.name,
            'Sold Value':     Math.round(r.soldValue    / 100000),  // in Lakhs
            'Available Value':Math.round(r.availValue   / 100000),
        }))

    // Unit type breakdown with conversion
    const byType = units.reduce((acc, u) => {
        const t = u.config?.config_name || u.config?.property_type || (u.bedrooms ? `${u.bedrooms} BHK` : 'Unknown')
        if (!acc[t]) acc[t] = { total: 0, sold: 0, reserved: 0, available: 0, value: 0 }
        acc[t].total++
        acc[t].value += price(u)
        if (u.status === 'sold')      acc[t].sold++
        if (u.status === 'reserved')  acc[t].reserved++
        if (u.status === 'available') acc[t].available++
        return acc
    }, {})
    const typeRows = Object.entries(byType)
        .map(([type, d]) => ({ type, ...d, conv: pct(d.sold + d.reserved, d.total), avgPrice: d.total > 0 ? d.value / d.total : 0 }))
        .sort((a, b) => b.total - a.total)

    const typeBarData = typeRows.map(t => ({
        name: t.type.replace(/_/g, ' '),
        Sold: t.sold,
        Reserved: t.reserved,
        Available: t.available,
    }))

    // ── render ──────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 p-6 animate-in fade-in duration-300">

            {/* ── Revenue KPI Strip ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    {
                        label:   'Total Portfolio Value',
                        value:   formatINR(totalValue),
                        sub:     `${totalUnits} units across ${projects.length} projects`,
                        icon:    Wallet,
                        bg:      'bg-blue-600',
                        glow:    'shadow-blue-200',
                    },
                    {
                        label:   'Realised Revenue',
                        value:   formatINR(soldValue),
                        sub:     `${sold} units sold · ${pct(sold, totalUnits)}% of inventory`,
                        icon:    BadgeDollarSign,
                        bg:      'bg-indigo-600',
                        glow:    'shadow-indigo-200',
                    },
                    {
                        label:   'Pipeline Value',
                        value:   formatINR(reservedValue),
                        sub:     `${reserved} units reserved · pending conversion`,
                        icon:    PiggyBank,
                        bg:      'bg-amber-500',
                        glow:    'shadow-amber-200',
                    },
                    {
                        label:   'Available Opportunity',
                        value:   formatINR(availValue),
                        sub:     `${available} units · ${pct(available, totalUnits)}% still available`,
                        icon:    TrendingUp,
                        bg:      'bg-emerald-600',
                        glow:    'shadow-emerald-200',
                    },
                ].map(({ label, value, sub, icon: Icon, bg, glow }) => (
                    <div key={label} className={cn('rounded-xl text-white p-5 space-y-3 shadow-lg', bg, glow)}>
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">{label}</p>
                            <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
                                <Icon className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <p className="text-2xl font-black tabular-nums leading-none">{value}</p>
                        <p className="text-[11px] text-white/60 font-medium leading-snug">{sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Two-col: Project Inventory Chart + Conversion ──────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Stacked bar: unit counts per project */}
                <SectionCard
                    title="Project Inventory Breakdown"
                    subtitle="Unit distribution across projects"
                    action={
                        <Link href="/dashboard/admin/inventory/projects" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                            Projects <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    }
                >
                    <div className="p-5">
                        {projectBarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(180, projectBarData.length * 44)}>
                                <BarChart
                                    data={projectBarData}
                                    layout="vertical"
                                    margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
                                    barCategoryGap="28%"
                                >
                                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={96}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(val, name, props) => [`${val} units`, name]}
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                                    />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                                    />
                                    <Bar dataKey="Sold"      stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Reserved"  stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Available" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart />
                        )}
                    </div>
                </SectionCard>

                {/* Sales conversion panel */}
                <SectionCard title="Sales Conversion" subtitle="Overall and per-project velocity">
                    <div className="p-5 space-y-5">
                        {/* Big conversion rate */}
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                <Percent className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 tabular-nums">{convRate}%</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Overall conversion rate</p>
                                <p className="text-[11px] text-slate-400">{sold + reserved} of {totalUnits} units sold or reserved</p>
                            </div>
                        </div>

                        {/* Per-project velocity */}
                        <div className="space-y-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Per Project</p>
                            {projectRows.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">No projects</p>
                            ) : (
                                projectRows.map(p => (
                                    <div key={p.id} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-slate-700 truncate max-w-[140px]">{p.name}</span>
                                            <span className={cn(
                                                'font-bold tabular-nums',
                                                p.salesPct >= 80 ? 'text-rose-500' :
                                                p.salesPct >= 50 ? 'text-amber-600' :
                                                'text-indigo-600'
                                            )}>
                                                {p.salesPct}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-indigo-500" style={{ width: `${pct(p.sold, p.pTotal)}%`     }} />
                                            <div className="h-full bg-amber-400"  style={{ width: `${pct(p.reserved, p.pTotal)}%` }} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* ── Two-col: Revenue by Project + Unit Type Analysis ───────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Revenue by project — grouped bar */}
                <SectionCard
                    title="Revenue by Project"
                    subtitle="Sold value vs available opportunity (₹ Lakhs)"
                >
                    <div className="p-5">
                        {revenueBarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(200, revenueBarData.length * 52)}>
                                <BarChart
                                    data={revenueBarData}
                                    layout="vertical"
                                    margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
                                    barCategoryGap="30%"
                                    barGap={4}
                                >
                                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={v => `${v}L`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={96}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(val, name, props) => [`₹${val.toLocaleString('en-IN')}L`, name]}
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                                    />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                                    />
                                    <Bar dataKey="Sold Value"      fill="#6366f1" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="Available Value" fill="#10b981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart />
                        )}
                    </div>
                </SectionCard>

                {/* Unit type analysis */}
                <SectionCard
                    title="Unit Type Analysis"
                    subtitle="Conversion rate and inventory by configuration"
                >
                    {typeRows.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 text-sm">No unit data</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {/* header */}
                            <div className="grid grid-cols-[1fr_60px_60px_60px_72px] gap-2 px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                <span>Type</span>
                                <span className="text-center">Total</span>
                                <span className="text-center">Sold</span>
                                <span className="text-center">Avail</span>
                                <span className="text-right">Conv.</span>
                            </div>
                            {typeRows.map(t => {
                                const convColor =
                                    t.conv >= 70 ? 'text-rose-600 bg-rose-50 border-rose-200' :
                                    t.conv >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                    'text-emerald-700 bg-emerald-50 border-emerald-200'
                                return (
                                    <div key={t.type} className="grid grid-cols-[1fr_60px_60px_60px_72px] gap-2 items-center px-5 py-3 hover:bg-slate-50/60 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 uppercase tracking-wide truncate">
                                                {t.type.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                Avg {formatINR(t.avgPrice)}
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 text-center tabular-nums">{t.total}</p>
                                        <p className="text-sm font-bold text-indigo-600 text-center tabular-nums">{t.sold}</p>
                                        <p className="text-sm font-bold text-emerald-600 text-center tabular-nums">{t.available}</p>
                                        <div className="flex justify-end">
                                            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border tabular-nums', convColor)}>
                                                {t.conv}%
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* ── Unit type chart ─────────────────────────────────────────── */}
            {typeBarData.length > 0 && (
                <SectionCard
                    title="Inventory by Configuration"
                    subtitle="Sold, reserved, and available units per unit type"
                >
                    <div className="p-5">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart
                                data={typeBarData}
                                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                                barCategoryGap="30%"
                            >
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                                />
                                <Bar dataKey="Sold"      fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Reserved"  fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>
            )}

            {/* ── Full Project Performance Table ─────────────────────────── */}
            <SectionCard
                title="Full Project Performance"
                subtitle="Detailed metrics for each project"
                action={
                    <Link href="/dashboard/admin/inventory/projects" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Manage <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                }
            >
                {projectRows.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-25" />
                        <p className="text-sm font-medium text-slate-500">No projects yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50/50">
                                    {['Project', 'Status', 'Total', 'Sold', 'Reserved', 'Available', 'Avg Price', 'Portfolio Value', 'Sold Value', 'Sales %'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap first:sticky first:left-0 first:bg-slate-50/50 first:z-10">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {projectRows.map(p => {
                                    const sc = PROJECT_STATUS[p.status] || PROJECT_STATUS.planning
                                    const barWidth = pct(p.sold + p.reserved, p.pTotal)
                                    return (
                                        <tr
                                            key={p.id}
                                            className="hover:bg-slate-50/60 transition-colors group"
                                        >
                                            {/* Project name — sticky */}
                                            <td className="px-5 py-3.5 sticky left-0 bg-white group-hover:bg-slate-50/60 z-10">
                                                <div className="flex items-center gap-2.5 min-w-[160px]">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 shrink-0">
                                                        {p.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <Link
                                                        href={`/dashboard/admin/inventory/projects/${p.id}`}
                                                        className="font-semibold text-slate-800 hover:text-blue-600 transition-colors truncate max-w-[140px]"
                                                    >
                                                        {p.name}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', sc.bg, sc.text, sc.border)}>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center font-bold text-slate-700 tabular-nums">{p.pTotal}</td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className="font-bold text-indigo-600 tabular-nums">{p.sold}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className="font-bold text-amber-600 tabular-nums">{p.reserved}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className="font-bold text-emerald-600 tabular-nums">{p.available}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-600 font-medium whitespace-nowrap tabular-nums">
                                                {p.avgPrice > 0 ? formatINR(p.avgPrice) : '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700 font-semibold whitespace-nowrap tabular-nums">
                                                {p.totalValue > 0 ? formatINR(p.totalValue) : '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-indigo-700 font-semibold whitespace-nowrap tabular-nums">
                                                {p.soldValue > 0 ? formatINR(p.soldValue) : '—'}
                                            </td>
                                            <td className="px-5 py-3.5 w-[160px]">
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="text-slate-400">{p.sold + p.reserved} / {p.pTotal}</span>
                                                        <span className={cn('font-bold tabular-nums', p.salesPct >= 80 ? 'text-rose-500' : 'text-slate-700')}>
                                                            {p.salesPct}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                                        <div className="h-full bg-indigo-500" style={{ width: `${pct(p.sold, p.pTotal)}%`     }} />
                                                        <div className="h-full bg-amber-400"  style={{ width: `${pct(p.reserved, p.pTotal)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            {/* Footer totals */}
                            <tfoot>
                                <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                                    <td className="px-5 py-3 sticky left-0 bg-slate-50/80 z-10">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Totals</span>
                                    </td>
                                    <td />
                                    <td className="px-5 py-3 text-center font-black text-slate-800 tabular-nums">{totalUnits}</td>
                                    <td className="px-5 py-3 text-center font-black text-indigo-700 tabular-nums">{sold}</td>
                                    <td className="px-5 py-3 text-center font-black text-amber-600 tabular-nums">{reserved}</td>
                                    <td className="px-5 py-3 text-center font-black text-emerald-700 tabular-nums">{available}</td>
                                    <td />
                                    <td className="px-5 py-3 font-black text-slate-800 whitespace-nowrap tabular-nums">{formatINR(totalValue)}</td>
                                    <td className="px-5 py-3 font-black text-indigo-700 whitespace-nowrap tabular-nums">{formatINR(soldValue)}</td>
                                    <td className="px-5 py-3">
                                        <span className="text-sm font-black text-slate-700 tabular-nums">{convRate}%</span>
                                        <span className="text-[11px] text-slate-400 ml-1">overall</span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </SectionCard>
        </div>
    )
}

function EmptyChart() {
    return (
        <div className="h-40 flex items-center justify-center text-slate-400">
            <p className="text-sm">No data available</p>
        </div>
    )
}
