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
import { Edit, Trash2, Eye, Megaphone, Building2, MapPin, Lock, Globe, Archive, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'

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
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium text-foreground">{project.name}</div>
                                            {(project.is_draft || project.project_status === 'draft') && (
                                                <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-600 font-bold uppercase tracking-wider border border-orange-200">
                                                    Draft
                                                </span>
                                            )}
                                            {isArchived && (
                                                <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border border-slate-200">
                                                    Archived
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{project.address}</div>
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
