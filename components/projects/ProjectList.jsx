'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Edit, Trash2, Eye, Megaphone, Building2, MapPin, Lock, Globe, Archive, RefreshCw, FileText, Download, Copy } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from 'react-hot-toast'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'

function WhatsAppIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    )
}

export default function ProjectList({
    projects,
    onEdit,
    onDelete,
    onView,
    onStartCampaign,
    onToggleVisibility, // Add this
    deletingId,

    page = 1,
    onPageChange,
    hasMore = false,
    isLoadingMore = false,
    loading = false,
    isArchived: globalIsArchived = false,
    onRestore
}) {
    const canEdit = usePermission('edit_projects')
    const canDelete = usePermission('delete_projects')

    if (loading) {
        return (
            <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[100px]"><Skeleton className="h-4 w-12" /></TableHead>
                                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                                <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                                <TableHead className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-12 w-16 rounded-lg" /></TableCell>
                                    <TableCell>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-48" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Skeleton className="h-8 w-8" />
                                            <Skeleton className="h-8 w-8" />
                                            <Skeleton className="h-8 w-8" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        )
    }

    if (!projects || projects.length === 0) {
        return (
            <div className="text-center py-10 border border-dashed border-border rounded-lg bg-muted/10">
                <p className="text-muted-foreground text-sm">No projects to display.</p>
            </div>
        )
    }

    return (
        <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[100px]">Image</TableHead>
                            <TableHead>Project Info</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projects.map((project) => {
                            let meta = {}
                            try {
                                meta = typeof project.metadata === 'string'
                                    ? JSON.parse(project.metadata)
                                    : project.metadata || {}
                            } catch (e) {
                                // ignore
                            }
                            const re = meta.real_estate || {}
                            const prop = re.property || {}
                            const loc = re.location || {}
                            const isArchived = globalIsArchived || !!project.archived_at

                            return (
                                <TableRow key={project.id} className={`hover:bg-muted/30 transition-all ${isArchived ? 'grayscale-[0.6] opacity-80 bg-slate-50/50' : ''}`}>
                                    <TableCell>
                                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted border border-border">
                                            {project.image_url ? (
                                                <img
                                                    src={project.image_url}
                                                    alt={project.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    <Building2 className="w-6 h-6 opacity-30" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5 min-w-0 max-w-[220px]">
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-sm text-foreground truncate">{project.name}</div>
                                                {(project.is_draft || project.project_status === 'draft') && (
                                                    <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-600 font-bold uppercase tracking-wider border border-orange-200 shrink-0">
                                                        Draft
                                                    </span>
                                                )}
                                                {isArchived && (
                                                    <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border border-slate-200 shrink-0">
                                                        Archived
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">{project.address}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                            <MapPin className="w-3 h-3 opacity-70" />
                                            {loc.city || 'N/A'}, {loc.locality || ''}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <span className="capitalize px-2 py-1 bg-muted rounded text-muted-foreground text-xs font-medium border border-border/50">
                                                {prop.category || 'Project'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onStartCampaign(project)}
                                                disabled={project.is_draft || project.project_status === 'draft' || isArchived}
                                                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 disabled:opacity-30"
                                                title="Start Campaign"
                                            >
                                                <Megaphone className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onView(project)}
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                title="View Details"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>

                                            {project.brochure_url && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50/50"
                                                            title="Share Brochure"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem asChild>
                                                            <a href={project.brochure_url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
                                                                <Download className="w-3.5 h-3.5 text-blue-500" />
                                                                Download PDF
                                                            </a>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                            navigator.clipboard.writeText(project.brochure_url)
                                                            toast.success('Brochure link copied!')
                                                        }}>
                                                            <Copy className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                                            Copy Link
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
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
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}

                                            <PermissionTooltip
                                                hasPermission={canEdit}
                                                message="You need 'Edit Projects' permission to change visibility."
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (!canEdit) return
                                                        onToggleVisibility && onToggleVisibility(project)
                                                    }}
                                                    disabled={!canEdit || !onToggleVisibility || isArchived}
                                                    className={`h-8 w-8 p-0 ${project.public_visibility ? 'text-green-600 hover:text-green-700 bg-green-50/50' : 'text-slate-400 hover:text-slate-600'}`}
                                                    title={project.public_visibility ? 'Public (Click to Hide)' : 'Hidden (Click to Publish)'}
                                                >
                                                    <Globe className="w-3.5 h-3.5" />
                                                </Button>
                                            </PermissionTooltip>

                                            <PermissionTooltip
                                                hasPermission={canEdit}
                                                message="You need 'Edit Projects' permission to edit projects."
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (!canEdit) return
                                                        onEdit(project)
                                                    }}
                                                    disabled={!canEdit || isArchived}
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Button>
                                            </PermissionTooltip>

                                            <PermissionTooltip
                                                hasPermission={canDelete}
                                                message={isArchived ? "Restore to active list" : "Archive project"}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (isArchived) {
                                                            onRestore?.(project)
                                                        } else {
                                                            if (!canDelete) return
                                                            onDelete?.(project)
                                                        }
                                                    }}
                                                    disabled={deletingId === project.id || (isArchived ? !onRestore : (!onDelete || !canDelete))}
                                                    className={`h-8 w-8 p-0 ${isArchived ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50/50' : 'text-orange-500 hover:text-orange-700 hover:bg-orange-50/50'}`}
                                                    title={isArchived ? "Restore" : "Archive"}
                                                >
                                                    {isArchived ? (
                                                        <RefreshCw className={deletingId === project.id ? "animate-spin w-3.5 h-3.5" : "w-3.5 h-3.5"} />
                                                    ) : (
                                                        <Archive className="w-3.5 h-3.5" />
                                                    )}
                                                </Button>
                                            </PermissionTooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>

                {/* Pagination Footer */}
                <div className="flex items-center justify-end space-x-2 p-4 border-t bg-slate-50">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange && onPageChange(page - 1)}
                        disabled={page === 1 || isLoadingMore}
                    >
                        Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        Page {page}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange && onPageChange(page + 1)}
                        disabled={!hasMore || isLoadingMore}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
