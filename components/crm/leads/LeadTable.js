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
import { Edit, Trash2, Phone, Mail, User, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
    onDelete,
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
    onBulkDelete,
    users = [],
    sortBy = 'created_at',
    sortOrder = 'desc',
    onSort,
    limit = 20,
    onLimitChange,
    totalLeads = 0
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

    return (
        <div className="rounded-md border-0 sm:border">
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

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Status</span>
                                    <div>
                                        {lead.stage ? (
                                            <Badge
                                                variant="outline"
                                                className="px-2 py-0.5 font-medium text-xs whitespace-nowrap"
                                                style={{
                                                    backgroundColor: lead.stage.color ? `${lead.stage.color}15` : undefined,
                                                    borderColor: lead.stage.color,
                                                    color: lead.stage.color
                                                }}
                                            >
                                                {lead.stage.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground italic">No Stage</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Assigned To</span>
                                    <div className="flex items-center gap-1.5">
                                        {lead.assigned_to_user ? (
                                            <>
                                                <Avatar className="h-5 w-5 border border-slate-200">
                                                    <AvatarImage src={lead.assigned_to_user.avatar_url} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {lead.assigned_to_user.full_name?.substring(0, 1)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="truncate max-w-[100px] text-xs">
                                                    {lead.assigned_to_user.full_name}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                        )}
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
                                    {canEditLead(lead) && (
                                        <Button variant="ghost" size="sm" onClick={() => onEdit(lead)} className="h-8 w-8 p-0">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button variant="ghost" size="sm" onClick={() => onDelete(lead)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
                        <TableRow>
                            <TableHead className="w-[50px]">
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
                                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                                >
                                    <span>Lead</span>
                                    {sortBy === 'name' ? (
                                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                    ) : (
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    )}
                                </Button>
                            </TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Pipeline Stage</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSort('created_at')}
                                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                                >
                                    <span>Created At</span>
                                    {sortBy === 'created_at' ? (
                                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                    ) : (
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    )}
                                </Button>
                            </TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No leads found
                                </TableCell>
                            </TableRow>
                        ) : (
                            leads.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedLeads.has(lead.id)}
                                            onCheckedChange={() => toggleSelect(lead.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <Link href={`/dashboard/admin/crm/leads/${lead.id}`} className="font-medium hover:underline flex items-center gap-4">
                                                <Avatar className="h-10 w-10 border-2 border-slate-100">
                                                    <AvatarImage src={lead.avatar_url || getDefaultAvatar(lead.name)} />
                                                    <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                                                        {lead.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="flex items-center gap-2 text-base font-semibold text-slate-800">
                                                        {lead.name}
                                                        {lead.is_new && <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 h-4 font-medium">New</Badge>}
                                                    </span>
                                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                        {lead.email && (
                                                            <div className="flex items-center gap-1" title={lead.email}>
                                                                <Mail className="h-3.5 w-3.5" />
                                                                <span className="truncate max-w-[180px]">{lead.email}</span>
                                                            </div>
                                                        )}
                                                        {lead.phone && (
                                                            <div className="flex items-center gap-1" title={lead.phone}>
                                                                <Phone className="h-3.5 w-3.5" />
                                                                <span>{lead.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {lead.project ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-slate-700">{lead.project.name}</span>
                                                <span className="text-xs text-muted-foreground capitalize">
                                                    {'Project'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="w-[180px]">
                                            {/* Stage Dropdown */}
                                            {(() => {
                                                const projectStages = lead.stage
                                                    ? stages.filter(s => s.pipeline_id === lead.stage.pipeline_id)
                                                    : stages

                                                projectStages.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

                                                return onStatusUpdate && projectStages.length > 0 ? (
                                                    <Select
                                                        value={lead.stage_id || "none"}
                                                        onValueChange={(val) => onStatusUpdate(lead.id, val)}
                                                        disabled={updatingStatus}
                                                    >
                                                        <SelectTrigger className="h-9 w-full bg-background border-slate-200 hover:bg-slate-50 transition-colors">
                                                            <SelectValue placeholder="Set Stage">
                                                                {lead.stage ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div
                                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                                                                            style={{ backgroundColor: lead.stage.color || '#cbd5e1' }}
                                                                        />
                                                                        <span className="font-medium text-sm truncate">{lead.stage.name}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground">No Stage</span>
                                                                )}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {projectStages.map(s => (
                                                                <SelectItem key={s.id} value={s.id} className="cursor-pointer">
                                                                    <div className="flex items-center gap-2">
                                                                        <div
                                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                            style={{ backgroundColor: s.color || '#cbd5e1' }}
                                                                        />
                                                                        <span className="font-medium">{s.name}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    lead.stage ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="px-3 py-1 font-medium"
                                                            style={{
                                                                backgroundColor: lead.stage.color ? `${lead.stage.color}15` : undefined,
                                                                borderColor: lead.stage.color,
                                                                color: lead.stage.color
                                                            }}
                                                        >
                                                            {lead.stage.name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm italic">No Stage</span>
                                                    )
                                                )
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {lead.assigned_to_user ? (
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-slate-200">
                                                    <AvatarImage src={lead.assigned_to_user.avatar_url} />
                                                    <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                                                        {lead.assigned_to_user.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {lead.assigned_to_user.full_name}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic pl-2">Unassigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(lead.created_at).toLocaleDateString()}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {canEditLead(lead) && (
                                                <Button variant="ghost" size="icon" onClick={() => onEdit(lead)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(lead)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
            <div className="flex items-center justify-between p-4 border-t">
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

                    {/* Bulk Delete */}
                    {onBulkDelete && (canDelete || true) && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 rounded-full px-4"
                            onClick={onBulkDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
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
