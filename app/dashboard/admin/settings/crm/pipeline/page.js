'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Check, X, Plus, Trash2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePermission } from '@/contexts/PermissionContext'
import { usePipelines } from '@/hooks/usePipelines'
import Link from 'next/link'

function PipelineRow({ pipeline, onRename, onSetDefault, onDelete }) {
    const [editing, setEditing] = useState(false)
    const [name, setName] = useState(pipeline.name)
    const [saving, setSaving] = useState(false)

    const commitRename = async () => {
        const trimmed = name.trim()
        if (!trimmed || trimmed === pipeline.name) { setEditing(false); setName(pipeline.name); return }
        setSaving(true)
        await onRename(pipeline.id, trimmed)
        setSaving(false)
        setEditing(false)
    }

    return (
        <div className="flex items-center gap-3 py-3 px-4 rounded-xl border border-border bg-card hover:border-border/80 transition-colors">
            {editing ? (
                <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setName(pipeline.name) } }}
                    autoFocus
                    className="h-8 text-sm flex-1"
                />
            ) : (
                <span className="flex-1 text-sm font-medium text-foreground">{pipeline.name}</span>
            )}

            {pipeline.is_default && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0">Default</Badge>
            )}

            <div className="flex items-center gap-1 shrink-0">
                {editing ? (
                    <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={commitRename} disabled={saving}>
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-primary" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(false); setName(pipeline.name) }}>
                            <X className="w-3 h-3" />
                        </Button>
                    </>
                ) : (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditing(true)}>
                        <Pencil className="w-3 h-3" />
                    </Button>
                )}
                {!pipeline.is_default && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onSetDefault(pipeline.id)}>
                        Set default
                    </Button>
                )}
                {!pipeline.is_default && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(pipeline)}>
                        <Trash2 className="w-3 h-3" />
                    </Button>
                )}
            </div>
        </div>
    )
}

export default function PipelineSettingsPage() {
    const canEdit = usePermission('manage_crm_settings')
    const { data: pipelines = [], isLoading, refetch } = usePipelines()

    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const handleRename = async (id, name) => {
        const res = await fetch(`/api/pipelines/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        })
        if (res.ok) { toast.success('Pipeline renamed'); refetch() }
        else toast.error('Failed to rename')
    }

    const handleSetDefault = async (id) => {
        const res = await fetch(`/api/pipelines/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_default: true }),
        })
        if (res.ok) { toast.success('Default pipeline updated'); refetch() }
        else toast.error('Failed to update')
    }

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        const res = await fetch('/api/pipelines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() }),
        })
        if (res.ok) { toast.success('Pipeline created'); setNewName(''); refetch() }
        else toast.error('Failed to create pipeline')
        setCreating(false)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        const res = await fetch(`/api/pipelines/${deleteTarget.id}`, { method: 'DELETE' })
        if (res.ok) { toast.success('Pipeline deleted'); refetch() }
        else {
            const data = await res.json()
            toast.error(data.error || 'Cannot delete pipeline with active leads')
        }
        setDeleting(false)
        setDeleteTarget(null)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Pipeline Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your sales pipelines. To edit stages and automation rules, open a pipeline from the CRM.</p>
            </div>

            {/* Edit stages CTA */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-foreground">Stage & Automation Editing</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Click any stage header in the pipeline board to rename, recolor, set stale thresholds, or manage automation rules inline.</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
                        <Link href="/dashboard/admin/crm/projects">
                            Open Pipeline <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            {/* Pipelines list */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pipelines</CardTitle>
                    <CardDescription>Rename, set default, or delete empty pipelines.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
                    ) : pipelines.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No pipelines found.</p>
                    ) : (
                        pipelines.map(p => (
                            <PipelineRow
                                key={p.id}
                                pipeline={p}
                                onRename={handleRename}
                                onSetDefault={handleSetDefault}
                                onDelete={setDeleteTarget}
                            />
                        ))
                    )}

                    {/* Create new pipeline */}
                    {canEdit && (
                        <div className="flex gap-2 pt-2 border-t border-border mt-2">
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                placeholder="New pipeline name…"
                                className="h-8 text-sm flex-1"
                            />
                            <Button size="sm" className="h-8 gap-1.5" onClick={handleCreate} disabled={creating || !newName.trim()}>
                                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Create
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>This pipeline and all its stages will be permanently deleted. Leads must be moved out first.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleting && <Loader2 className="w-3 h-3 animate-spin mr-1" />} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
