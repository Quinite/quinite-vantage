'use client'

import React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Edit, Trash2, Phone, Mail, User, ArrowUpDown, ArrowUp, ArrowDown, Archive, RefreshCcw, Star, Zap, Globe, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { getDefaultAvatar } from '@/lib/avatar-utils'
import Link from 'next/link'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'

export function LeadTable({
    leads,
    loading,
    selectedLeads,
    setSelectedLeads,
    onEdit,
    canEditLead,
    canDelete,
    stages = [], // For inline status update
    onStatusUpdate,
    updatingStatus,
    page = 1,
    onPageChange,
    hasMore = false,
    isLoadingMore = false,
    onBulkAssign,
    users = [],
    sortBy = 'created_at',
    sortOrder = 'desc',
    onSort,
    limit = 20,
    onLimitChange,
    totalLeads = 0,
    onArchive,
    onBulkArchive,
    onRestore,
    onBulkRestore,
    isPlatformAdmin = false,
    viewMode = 'active'
}) {

    const [lastSelectedIndex, setLastSelectedIndex] = React.useState(null)

    const toggleSelectAll = () => {
        if (selectedLeads.size === leads.length && leads.length > 0) {
            setSelectedLeads(new Set())
        } else {
            setSelectedLeads(new Set(leads.map(l => l.id)))
        }
        setLastSelectedIndex(null)
    }

    const toggleSelect = (id, index, event) => {
        const newSelected = new Set(selectedLeads)
        
        if (event?.shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index)
            const end = Math.max(lastSelectedIndex, index)
            const rangeIds = leads.slice(start, end + 1).map(l => l.id)
            
            // If the start item was selected, select the range. Otherwise deselect.
            const shouldSelect = selectedLeads.has(leads[lastSelectedIndex].id)
            rangeIds.forEach(rangeId => {
                if (shouldSelect) newSelected.add(rangeId)
                else newSelected.delete(rangeId)
            })
        } else {
            if (newSelected.has(id)) {
                newSelected.delete(id)
            } else {
                newSelected.add(id)
            }
        }
        
        setSelectedLeads(newSelected)
        setLastSelectedIndex(index)
    }

    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        )
    }

    const getInterestConfig = (level) => {
        switch(level?.toLowerCase()) {
            case 'high': return { label: 'High', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
            case 'medium': return { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
            case 'low': return { label: 'Low', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' }
            default: return null
        }
    }

    return (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-4">
                {leads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card text-sm">
                        No leads found
                    </div>
                ) : (
                    leads.map((lead) => (
                        <div key={lead.id} className="bg-card border rounded-lg p-4 shadow-sm space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-slate-100">
                                        <AvatarImage src={lead.avatar_url || getDefaultAvatar(lead.email || lead.name)} />
                                        <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                                            {lead.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <Link href={`/dashboard/admin/crm/leads/${lead.id}`} className="font-semibold text-foreground hover:underline">
                                            {lead.name}
                                        </Link>
                                        <div className="text-xs text-muted-foreground flex flex-col gap-0.5 mt-0.5">
                                            {lead.project && (
                                                <span className="flex items-center gap-1">
                                                    <span className="font-medium text-foreground">{lead.project.name}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div onClick={(e) => toggleSelect(lead.id, leads.indexOf(lead), e)}>
                                    <Checkbox
                                        checked={selectedLeads.has(lead.id)}
                                        onCheckedChange={() => {}}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Status</span>
                                    <div>
                                        {lead.stage ? (
                                            <Badge
                                                variant="outline"
                                                className="px-2 py-0.5 font-semibold text-[10px] whitespace-nowrap"
                                                style={{
                                                    backgroundColor: lead.stage.color ? `${lead.stage.color}15` : undefined,
                                                    borderColor: lead.stage.color,
                                                    color: lead.stage.color
                                                }}
                                            >
                                                {lead.stage.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Assigned To</span>
                                    <div className="flex items-center gap-1.5">
                                        {lead.assigned_to_user ? (
                                            <>
                                                <Avatar className="h-5 w-5 border border-white shadow-sm ring-1 ring-slate-200 bg-slate-100">
                                                    <AvatarFallback className="text-[9px] font-bold text-slate-600 bg-slate-100">
                                                        {lead.assigned_to_user.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="truncate max-w-[80px] text-[11px] font-medium text-slate-600">
                                                    {lead.assigned_to_user.full_name}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-[11px] text-slate-300 italic">Unassigned</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Score</span>
                                    <div className="flex items-center gap-1">
                                        {typeof lead.score === 'number' ? (
                                            <>
                                                <Star className={cn("w-3 h-3", lead.score >= 70 ? 'text-amber-400' : lead.score >= 40 ? 'text-slate-400' : 'text-slate-300')} />
                                                <span className={cn("text-[11px] font-bold", lead.score >= 70 ? 'text-amber-700' : lead.score >= 40 ? 'text-slate-600' : 'text-slate-400')}>{lead.score}</span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Interest</span>
                                    <div>
                                        {(() => {
                                            const cfg = getInterestConfig(lead.interest_level)
                                            return cfg ? (
                                                <Badge variant="outline" className={cn('text-[9px] font-bold px-1.5 py-0 capitalize border', cfg.bg, cfg.text, cfg.border)}>
                                                    {cfg.label}
                                                </Badge>
                                            ) : <span className="text-xs text-slate-300">—</span>
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t">
                                <div className="flex gap-3">
                                    {lead.phone && (
                                        <a href={`tel:${lead.phone}`} className="p-2 rounded-full bg-secondary/50 text-muted-foreground hover:text-foreground">
                                            <Phone className="h-4 w-4" />
                                        </a>
                                    )}
                                    {lead.email && (
                                        <a href={`mailto:${lead.email}`} className="p-2 rounded-full bg-secondary/50 text-muted-foreground hover:text-foreground">
                                            <Mail className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <Link href={`/dashboard/admin/crm/leads/${lead.id}`}>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    {viewMode === 'archived' && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => onRestore?.(lead)} 
                                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            title="Restore Lead"
                                        >
                                            <RefreshCcw className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {viewMode !== 'archived' && (
                                        <>
                                            {canEditLead(lead) && (
                                                <>
                                                    <Button variant="ghost" size="sm" onClick={() => onEdit(lead)} className="h-8 w-8 p-0">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => onArchive?.(lead)} className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                            <TableHead className="w-[44px] pl-4">
                                <Checkbox
                                    checked={leads.length > 0 && selectedLeads.size === leads.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSort('name')}
                                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
                                >
                                    <span>Lead</span>
                                    {sortBy === 'name' ? (
                                        sortOrder === 'asc' ? <ArrowUp className="ml-1.5 h-3.5 w-3.5" /> : <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
                                    ) : (
                                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
                                    )}
                                </Button>
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Project</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Stage</TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSort('score')}
                                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
                                >
                                    <span>Score</span>
                                    {sortBy === 'score' ? (
                                        sortOrder === 'asc' ? <ArrowUp className="ml-1.5 h-3.5 w-3.5" /> : <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
                                    ) : (
                                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
                                    )}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSort('interest_level')}
                                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
                                >
                                    <span>Interest</span>
                                    {sortBy === 'interest_level' ? (
                                        sortOrder === 'asc' ? <ArrowUp className="ml-1.5 h-3.5 w-3.5" /> : <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
                                    ) : (
                                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
                                    )}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSort('source')}
                                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
                                >
                                    <span>Source</span>
                                    {sortBy === 'source' ? (
                                        sortOrder === 'asc' ? <ArrowUp className="ml-1.5 h-3.5 w-3.5" /> : <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
                                    ) : (
                                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
                                    )}
                                </Button>
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned To</TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSort('created_at')}
                                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
                                >
                                    <span>Created</span>
                                    {sortBy === 'created_at' ? (
                                        sortOrder === 'asc' ? <ArrowUp className="ml-1.5 h-3.5 w-3.5" /> : <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
                                    ) : (
                                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
                                    )}
                                </Button>
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right pr-4">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <User className="w-8 h-8 text-slate-200" />
                                        <p className="text-sm font-medium text-slate-500">No leads found</p>
                                        <p className="text-xs text-slate-400">Try adjusting your filters</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            leads.map((lead) => (
                                <TableRow key={lead.id} className="group hover:bg-indigo-50/30 transition-colors duration-150 border-b border-slate-100 last:border-0">
                                    <TableCell className="pl-4">
                                        <div onClick={(e) => toggleSelect(lead.id, leads.indexOf(lead), e)}>
                                            <Checkbox
                                                checked={selectedLeads.has(lead.id)}
                                                onCheckedChange={() => {}}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <Link href={`/dashboard/admin/crm/leads/${lead.id}`} className="flex items-center gap-3 group/name">
                                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-slate-100 shrink-0">
                                                <AvatarImage src={lead.avatar_url || getDefaultAvatar(lead.name)} />
                                                <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                                                    {lead.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 group-hover/name:text-indigo-600 transition-colors">
                                                    {lead.name}
                                                    {lead.is_new && <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0 h-4 font-semibold">New</Badge>}
                                                </span>
                                                <div className="flex items-center gap-2.5 mt-0.5">
                                                    {lead.email && (
                                                        <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[160px]" title={lead.email}>
                                                            <Mail className="h-3 w-3 shrink-0" />{lead.email}
                                                        </span>
                                                    )}
                                                    {lead.phone && (
                                                        <span className="flex items-center gap-1 text-[11px] text-slate-400" title={lead.phone}>
                                                            <Phone className="h-3 w-3 shrink-0" />{lead.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        {lead.project ? (
                                            <span className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-md px-2 py-1 truncate max-w-[120px] inline-block">{lead.project.name}</span>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {lead.stage ? (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap"
                                                style={{
                                                    backgroundColor: lead.stage.color ? `${lead.stage.color}12` : undefined,
                                                    borderColor: lead.stage.color || '#cbd5e1',
                                                    color: lead.stage.color || '#64748b'
                                                }}
                                            >
                                                <div
                                                    className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0"
                                                    style={{ backgroundColor: lead.stage.color || '#cbd5e1' }}
                                                />
                                                {lead.stage.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </TableCell>
                                    {/* Score */}
                                    <TableCell>
                                        {typeof lead.score === 'number' ? (
                                            <div className="flex items-center gap-1.5">
                                                <Star className={cn("w-3.5 h-3.5", lead.score >= 70 ? 'text-amber-400' : lead.score >= 40 ? 'text-slate-400' : 'text-slate-300')} />
                                                <span className={cn("text-sm font-semibold", lead.score >= 70 ? 'text-amber-700' : lead.score >= 40 ? 'text-slate-600' : 'text-slate-400')}>{lead.score}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </TableCell>
                                    {/* Interest */}
                                    <TableCell>
                                        {(() => {
                                            const cfg = getInterestConfig(lead.interest_level)
                                            return cfg ? (
                                                <Badge variant="outline" className={cn('text-[10px] font-semibold px-2 py-0.5 capitalize border', cfg.bg, cfg.text, cfg.border)}>
                                                    <Zap className="w-3 h-3 mr-1" />{cfg.label}
                                                </Badge>
                                            ) : <span className="text-xs text-slate-300">—</span>
                                        })()}
                                    </TableCell>
                                    {/* Source */}
                                    <TableCell>
                                        {lead.source ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5 capitalize">
                                                <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                                                {lead.source.replace(/_/g, ' ')}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </TableCell>
                                    {/* Assigned To */}
                                    <TableCell>
                                        {lead.assigned_to_user ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 border border-white shadow-sm ring-1 ring-slate-100 bg-slate-100">
                                                    <AvatarFallback className="text-[9px] font-bold bg-slate-100 text-slate-600">
                                                        {lead.assigned_to_user.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">
                                                    {lead.assigned_to_user.full_name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-slate-300 italic">Unassigned</span>
                                        )}
                                    </TableCell>
                                    {/* Created */}
                                    <TableCell>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="pr-4">
                                        <div className="flex items-center justify-end gap-1">
                                            {lead.phone && (
                                                <a href={`tel:${lead.phone}`}>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                                        title={`Call ${lead.name}`}
                                                    >
                                                        <Phone className="h-3.5 w-3.5" />
                                                    </Button>
                                                </a>
                                            )}
                                            <Link href={`/dashboard/admin/crm/leads/${lead.id}`}>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                                                    title="View Profile"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            </Link>
                                            {viewMode === 'archived' && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => onRestore?.(lead)} 
                                                    className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                                    title="Restore Lead"
                                                >
                                                    <RefreshCcw className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {viewMode !== 'archived' && (
                                                <>
                                                    {canEditLead(lead) && (
                                                        <>
                                                            <Button variant="ghost" size="icon" onClick={() => onEdit(lead)} className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                                                <Edit className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg" onClick={() => onArchive?.(lead)} title="Archive">
                                                                <Archive className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        {totalLeads} leads found
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
                        <Select
                            value={String(limit)}
                            onValueChange={(val) => onLimitChange?.(parseInt(val))}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={limit} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 50, 100].map((pageSize) => (
                                    <SelectItem key={pageSize} value={String(pageSize)}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1 || loading || isLoadingMore}
                    >
                        Previous
                    </Button>
                    <div className="text-sm text-muted-foreground min-w-[60px] text-center">
                        Page {page}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page + 1)}
                        disabled={!hasMore || loading || isLoadingMore}
                    >
                        Next
                    </Button>
                </div>
            </div>
            {/* Bulk Action Bar */}
            {selectedLeads.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-8 duration-300 border border-slate-800">
                    <div className="flex flex-col">
                        <span className="font-bold text-sm">
                            {selectedLeads.size} leads selected
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Perform bulk action</span>
                    </div>
                    
                    <div className="h-8 w-px bg-slate-700" />

                    <div className="flex items-center gap-3">
                        {/* Bulk Assign */}
                        {onBulkAssign && (
                            <Select onValueChange={onBulkAssign}>
                                <SelectTrigger className="h-9 w-[160px] border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-xl focus:ring-0">
                                    <Users className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                                    <SelectValue placeholder="Assign To..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    {users && users.map(user => (
                                        <SelectItem key={user.id} value={user.id} className="focus:bg-slate-800 focus:text-white">
                                            {user.full_name || user.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Bulk Archive */}
                        {onBulkArchive && viewMode === 'active' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl px-4 bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all font-bold text-xs"
                                onClick={onBulkArchive}
                            >
                                <Archive className="w-3.5 h-3.5 mr-2" />
                                Archive
                            </Button>
                        )}

                        {/* Bulk Restore */}
                        {onBulkRestore && viewMode === 'archived' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl px-4 bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all font-bold text-xs"
                                onClick={onBulkRestore}
                            >
                                <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                                Restore
                            </Button>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-700" />

                    {/* Clear Selection */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        onClick={() => setSelectedLeads(new Set())}
                    >
                        <span className="sr-only">Dismiss</span>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
