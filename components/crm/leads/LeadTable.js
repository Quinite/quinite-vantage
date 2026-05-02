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

    const toggleSelectAll = () => {
        if (selectedLeads.size === leads.length) {
            setSelectedLeads(new Set())
        } else {
            setSelectedLeads(new Set(leads.map(l => l.id)))
        }
    }

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedLeads)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedLeads(newSelected)
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
                    <div className="mx-4 my-8 text-center py-16 px-6 text-muted-foreground border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center ring-8 ring-slate-50">
                                <Users className="w-10 h-10 text-slate-200" />
                            </div>
                            <div className="max-w-[240px] mx-auto">
                                <h4 className="text-lg font-bold text-slate-900 leading-tight">No leads discovered</h4>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    We couldn't find any leads matching your current criteria. Try broading your search or filters.
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 rounded-xl border-slate-200 font-bold text-xs"
                                onClick={() => window.location.reload()}
                            >
                                Refresh Leads
                            </Button>
                        </div>
                    </div>
                ) : (
                    leads.map((lead) => (
                        <div key={lead.id} className="bg-card border rounded-lg p-4 shadow-sm space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-slate-100">
                                        <AvatarImage src={lead.avatar_url || getDefaultAvatar(lead.name)} />
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
                                <Checkbox
                                    checked={selectedLeads.has(lead.id)}
                                    onCheckedChange={() => toggleSelect(lead.id)}
                                />
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
                                                <Avatar className="h-5 w-5 border border-white shadow-sm ring-1 ring-slate-200">
                                                    <AvatarImage src={lead.assigned_to_user.avatar_url} />
                                                    <AvatarFallback className="text-[9px] font-bold">
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
                                <TableCell colSpan={7} className="h-96 text-center">
                                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center shadow-inner">
                                            <Users className="w-12 h-12 text-slate-200" />
                                        </div>
                                        <div className="max-w-sm mx-auto">
                                            <h3 className="text-xl font-bold text-slate-900">No matching leads</h3>
                                            <p className="text-sm text-slate-500 mt-2">
                                                Your current filters didn't return any results. Try adjusting your search query or removing some filters to see more leads.
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            leads.map((lead) => (
                                <TableRow key={lead.id} className="group hover:bg-indigo-50/30 transition-colors duration-150 border-b border-slate-100 last:border-0">
                                    <TableCell className="pl-4">
                                        <Checkbox
                                            checked={selectedLeads.has(lead.id)}
                                            onCheckedChange={() => toggleSelect(lead.id)}
                                        />
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
                                                <Avatar className="h-6 w-6 border border-white shadow-sm ring-1 ring-slate-100">
                                                    <AvatarImage src={lead.assigned_to_user.avatar_url} />
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
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" onClick={() => onArchive?.(lead)} title="Archive">
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-white">
                <div className="text-sm text-slate-500 font-medium order-2 sm:order-1">
                    Showing <span className="font-bold text-slate-900">{leads.length}</span> of <span className="font-bold text-slate-900">{totalLeads}</span> leads
                </div>
                
                <div className="flex items-center gap-4 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="hidden md:flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Rows</span>
                        <Select
                            value={String(limit)}
                            onValueChange={(val) => onLimitChange?.(parseInt(val))}
                        >
                            <SelectTrigger className="h-7 w-[65px] border-0 bg-transparent p-0 focus:ring-0 text-xs font-bold text-slate-700">
                                <SelectValue placeholder={limit} />
                            </SelectTrigger>
                            <SelectContent side="top" className="rounded-xl shadow-xl border-slate-100">
                                {[10, 20, 50, 100].map((pageSize) => (
                                    <SelectItem key={pageSize} value={String(pageSize)} className="text-xs">
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page === 1 || loading || isLoadingMore}
                            className="h-9 px-4 rounded-xl border-slate-200 bg-white shadow-sm disabled:opacity-50 flex-1 sm:flex-none font-semibold text-xs"
                        >
                            Previous
                        </Button>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl h-9 px-4 flex items-center justify-center min-w-[90px] shadow-inner">
                            <span className="text-xs font-bold text-slate-600">Page {page}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={!hasMore || loading || isLoadingMore}
                            className="h-9 px-4 rounded-xl border-slate-200 bg-white shadow-sm disabled:opacity-50 flex-1 sm:flex-none font-semibold text-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
            {/* Bulk Action Bar */}
            {selectedLeads.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4 duration-200">
                    <span className="font-medium text-sm">
                        {selectedLeads.size} selected
                    </span>
                    <div className="h-4 w-px bg-border" />

                    {/* Bulk Assign */}
                    {onBulkAssign && (
                        <Select onValueChange={onBulkAssign}>
                            <SelectTrigger className="h-8 w-[140px] border-0 bg-secondary/50 hover:bg-secondary focus:ring-0">
                                <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                                {users && users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
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
                            className="h-8 rounded-full px-4 text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={onBulkArchive}
                        >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                        </Button>
                    )}

                    {/* Bulk Restore */}
                    {onBulkRestore && viewMode === 'archived' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full px-4 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={onBulkRestore}
                        >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Restore
                        </Button>
                    )}



                    {/* Clear Selection */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full ml-2 hover:bg-muted"
                        onClick={() => setSelectedLeads(new Set())}
                    >
                        <span className="sr-only">Dismiss</span>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-50"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.50009L3.21846 10.9685C2.99391 11.1931 2.99391 11.5571 3.21846 11.7816C3.44301 12.0062 3.80708 12.0062 4.03164 11.7816L7.50005 8.31327L10.9685 11.7816C11.193 12.0062 11.5571 12.0062 11.7816 11.7816C12.0062 11.5571 12.0062 11.1931 11.7816 10.9685L8.31322 7.50009L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                    </Button>
                </div>
            )}
        </div>
    )
}
