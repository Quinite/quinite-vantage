'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
    Building2, MapPin,
    Eye, Megaphone, MoreHorizontal, Edit,
    Globe, EyeOff, Archive, RefreshCw,
    FileText, Download, Copy,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { usePermission } from '@/contexts/PermissionContext'
import { formatCurrency } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

function WhatsAppIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    )
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS = {
    planning:            { label: 'Planning',           cls: 'bg-blue-50 text-blue-700 border-blue-200'     },
    under_construction:  { label: 'Under Construction', cls: 'bg-amber-50 text-amber-700 border-amber-200'  },
    ready_to_move:       { label: 'Ready to Move',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    completed:           { label: 'Completed',          cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    draft:               { label: 'Draft',              cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    archived:            { label: 'Archived',           cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

function resolveStatus(project, isArchived) {
    if (isArchived)                                                return STATUS.archived
    if (project.is_draft || project.project_status === 'draft')   return STATUS.draft
    return STATUS[project.project_status] ?? STATUS.planning
}

function resolvePriceRange(project) {
    if (project.unit_configs?.length) {
        const prices = project.unit_configs.map(u => u.base_price).filter(p => p > 0)
        if (prices.length) return { min: Math.min(...prices), max: Math.max(...prices) }
    }
    if (project.min_price || project.max_price) return { min: project.min_price, max: project.max_price }
    return null
}

// ── Card ──────────────────────────────────────────────────────────────────
export default function ProjectCard({
    project, onEdit, onDelete, onView, onStartCampaign,
    onToggleVisibility, deleting, isArchived, onRestore,
    currency = 'INR', locale = 'en-IN',
}) {
    const canEdit   = usePermission('edit_projects')
    const canDelete = usePermission('delete_projects')

    const status     = resolveStatus(project, isArchived)
    const priceRange = resolvePriceRange(project)

    const total     = project.total_units || (project.units?.[0]?.count) || 0
    const sold      = project.sold_units      || 0
    const reserved  = project.reserved_units  || 0
    const available = project.available_units ?? Math.max(0, total - sold - reserved)

    const soldPct     = total > 0 ? (sold     / total) * 100 : 0
    const reservedPct = total > 0 ? (reserved / total) * 100 : 0
    const occupiedPct = Math.round(soldPct + reservedPct)

    const configs = [...new Set(
        (project.unit_configs ?? []).map(u => u.config_name ?? u.property_type).filter(Boolean)
    )]

    const locationStr = [project.locality, project.city].filter(Boolean).join(', ')

    return (
        <div className={cn(
            'group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden',
            'shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200',
            isArchived && 'opacity-60 grayscale-[0.5]',
        )}>

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <div className="relative h-44 bg-slate-100 shrink-0 overflow-hidden">
                {project.image_url ? (
                    <img
                        src={project.image_url}
                        alt={project.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-slate-200" />
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />

                {/* Top badges */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-sm whitespace-nowrap', status.cls)}>
                        {status.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {project.brochure_url && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-red-600 shadow-sm backdrop-blur-sm">
                                <FileText className="w-2.5 h-2.5" />
                                Brochure
                            </span>
                        )}
                        {project.public_visibility && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white">
                                Public
                            </span>
                        )}
                    </div>
                </div>

                {/* Bottom: name + location */}
                <div className="absolute bottom-0 inset-x-0 p-4">
                    <p className="text-white font-bold text-[15px] leading-tight truncate">{project.name}</p>
                    {locationStr && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-white/60 shrink-0" />
                            <p className="text-white/75 text-xs truncate">{locationStr}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Body ──────────────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 p-4 gap-3">

                {/* RERA + Price */}
                {project.rera_number && (
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                        RERA {project.rera_number}
                    </p>
                )}

                {/* Price */}
                {priceRange ? (
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Price Range</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight">
                            {formatCurrency(priceRange.min, currency, locale)}
                            {priceRange.max && priceRange.max !== priceRange.min && (
                                <span className="font-normal text-slate-400 text-xs">
                                    {' '}–{' '}{formatCurrency(priceRange.max, currency, locale)}
                                </span>
                            )}
                        </p>
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 italic">Pricing not configured</p>
                )}

                {/* Unit stats */}
                {total > 0 && (
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-1.5">
                            {[
                                { label: 'Available', value: available, bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-500/70' },
                                { label: 'Sold',      value: sold,      bg: 'bg-red-50',     text: 'text-red-600',    sub: 'text-red-400/80'    },
                                { label: 'Reserved',  value: reserved,  bg: 'bg-amber-50',   text: 'text-amber-600',  sub: 'text-amber-500/70'  },
                            ].map(({ label, value, bg, text, sub }) => (
                                <div key={label} className={cn('rounded-xl py-2 text-center', bg)}>
                                    <p className={cn('text-base font-black leading-none', text)}>{value}</p>
                                    <p className={cn('text-[9px] font-bold uppercase tracking-wide mt-0.5', sub)}>{label}</p>
                                </div>
                            ))}
                        </div>
                        {/* Progress bar */}
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full flex">
                                <div className="bg-red-400 transition-all"   style={{ width: `${soldPct}%` }} />
                                <div className="bg-amber-400 transition-all" style={{ width: `${reservedPct}%` }} />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 text-right tabular-nums">
                            {occupiedPct}% occupied · {total} total units
                        </p>
                    </div>
                )}

                {/* Config chips */}
                {configs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {configs.slice(0, 5).map((cfg, i) => (
                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {cfg}
                            </span>
                        ))}
                        {configs.length > 5 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                +{configs.length - 5}
                            </span>
                        )}
                    </div>
                )}

                <div className="flex-1" />

                {/* ── Actions ───────────────────────────────────────────── */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => onView(project)}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        View
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => onStartCampaign(project)}
                        disabled={!!(project.is_draft || isArchived)}
                    >
                        <Megaphone className="w-3.5 h-3.5" />
                        Campaign
                    </Button>

                    {/* ⋯ Overflow actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {project.brochure_url && (
                                <>
                                    <DropdownMenuItem asChild>
                                        <a href={project.brochure_url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
                                            <Download className="w-3.5 h-3.5 text-blue-500" />
                                            Download Brochure
                                        </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        navigator.clipboard.writeText(project.brochure_url)
                                        toast.success('Brochure link copied!')
                                    }}>
                                        <Copy className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                        Copy Brochure Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const msg = encodeURIComponent(`Hi! Please find the brochure for *${project.name}*:\n${project.brochure_url}`)
                                            window.open(`https://wa.me/?text=${msg}`, '_blank')
                                        }}
                                        className="text-[#25D366] focus:text-[#128C7E] focus:bg-green-50"
                                    >
                                        <WhatsAppIcon className="w-3.5 h-3.5 mr-2" />
                                        Share via WhatsApp
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem
                                disabled={!canEdit || !!isArchived}
                                onClick={() => canEdit && !isArchived && onEdit(project)}
                            >
                                <Edit className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                Edit project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!canEdit || !!isArchived}
                                onClick={() => canEdit && !isArchived && onToggleVisibility?.(project)}
                            >
                                {project.public_visibility
                                    ? <><EyeOff className="w-3.5 h-3.5 mr-2 text-slate-400" />Set private</>
                                    : <><Globe  className="w-3.5 h-3.5 mr-2 text-slate-400" />Make public</>
                                }
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isArchived ? (
                                <DropdownMenuItem onClick={() => onRestore?.(project)}>
                                    <RefreshCw className={cn('w-3.5 h-3.5 mr-2 text-blue-500', deleting && 'animate-spin')} />
                                    <span className="text-blue-600">Restore</span>
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    disabled={!canDelete}
                                    onClick={() => canDelete && onDelete?.(project)}
                                    className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                                >
                                    <Archive className="w-3.5 h-3.5 mr-2" />
                                    Archive
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}
