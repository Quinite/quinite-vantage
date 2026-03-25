'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from "@/components/ui/skeleton"
import {
    Loader2,
    Megaphone,
    Calendar,
    Clock,
    Edit,
    Trash2,
    Plus,
    Radio,
    Building2,
    CheckCircle2,
    PlayCircle,
    PauseCircle,
    XCircle,
    Phone,
    KanbanSquare,
    ArrowLeft,
    AlertTriangle,
    Zap,
    Hand,
    RefreshCw,
    Lock
} from 'lucide-react'
import { toast } from 'react-hot-toast'

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const statusConfig = {
        scheduled:  { color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: <Clock className="w-3 h-3" /> },
        active:     { color: 'bg-green-500/10 text-green-600 border-green-200', icon: <PlayCircle className="w-3 h-3" /> },
        running:    { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
        paused:     { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200', icon: <PauseCircle className="w-3 h-3" /> },
        completed:  { color: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: <CheckCircle2 className="w-3 h-3" /> },
        cancelled:  { color: 'bg-red-500/10 text-red-600 border-red-200', icon: <XCircle className="w-3 h-3" /> }
    }
    const config = statusConfig[status] || statusConfig.scheduled
    return (
        <Badge variant="outline" className={`${config.color} border font-medium flex items-center gap-1.5 w-fit px-2 py-0.5 h-5 text-[10px] uppercase tracking-wider`}>
            {config.icon}
            {status?.toUpperCase()}
        </Badge>
    )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTodayString() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
function getCurrentTimeString() {
    return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }).substring(0, 5)
}
function isWithinCampaignWindow(campaign) {
    if (!campaign.start_date || !campaign.end_date || !campaign.time_start || !campaign.time_end) return false
    const today = getTodayString()
    const now = getCurrentTimeString()
    return today >= campaign.start_date && today <= campaign.end_date &&
        now >= campaign.time_start && now <= campaign.time_end
}

// ─── Campaign Card ────────────────────────────────────────────────────────────
function CampaignCard({
    campaign,
    projectName,
    starting,
    startingCampaignId,
    pausingCampaignId,
    deleting,
    onEdit,
    onDelete,
    onStart,
    onPause,
    onCancel,
    onOpenPipeline
}) {
    const withinWindow = isWithinCampaignWindow(campaign)
    const isManual = campaign.manual_start === true
    const s = campaign.status || 'scheduled'

    // Start/Resume: show for manual campaigns not running/completed/cancelled
    const showStartBtn = isManual && s !== 'completed' && s !== 'cancelled' && s !== 'running'
    const isResume = s === 'paused'
    const canClickStart = isResume || withinWindow

    // Live: active or running
    const isLive = s === 'active' || s === 'running'

    const isStarting = starting && startingCampaignId === campaign.id
    const isPausing = pausingCampaignId === campaign.id

    return (
        <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-border bg-card rounded-xl">
            {/* Card Header */}
            <div
                className="relative bg-muted/30 p-4 border-b border-border/50 cursor-pointer"
                onClick={() => onOpenPipeline(campaign)}
                title="Click to Open Pipeline"
            >
                <div className="flex items-start justify-between">
                    <div className="p-2 bg-background rounded-lg border border-border shadow-sm">
                        <Phone className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => onEdit(campaign)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                            <Edit className="w-4 h-4" /><span className="sr-only">Edit</span>
                        </Button>
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => onDelete(campaign)}
                            disabled={deleting}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="w-4 h-4" /><span className="sr-only">Delete</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Card Content */}
            <CardContent
                className="p-5 space-y-3 cursor-pointer"
                onClick={() => onOpenPipeline(campaign)}
            >
                <div>
                    <h3 className="text-base font-semibold text-foreground mb-1 truncate hover:text-primary transition-colors">
                        {campaign.name}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3 flex-shrink-0 opacity-70" />
                        <span className="truncate">{projectName || 'Project'}</span>
                    </p>
                </div>

                {campaign.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
                )}

                {/* Status + Mode Badge */}
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                    <StatusBadge status={campaign.status || 'scheduled'} />
                    {isManual ? (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 bg-orange-500/10 text-orange-600 border-orange-200 flex items-center gap-1">
                            <Hand className="w-3 h-3" /> MANUAL
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 bg-sky-500/10 text-sky-600 border-sky-200 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> AUTO
                        </Badge>
                    )}
                </div>

                {/* Campaign Schedule */}
                <div className="pt-3 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3 opacity-70" /> Duration
                        </span>
                        <span className="text-foreground font-medium text-right">
                            {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                            {' – '}
                            {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3 opacity-70" /> Time Window
                        </span>
                        <span className="text-foreground font-medium">
                            {campaign.time_start || '—'} – {campaign.time_end || '—'}
                        </span>
                    </div>
                </div>

                {/* Stats */}
                {campaign.total_calls > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                            <div className="text-muted-foreground">Total Calls</div>
                            <div className="font-semibold text-foreground">{campaign.total_calls}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Transferred</div>
                            <div className="font-semibold text-green-600">{campaign.transferred_calls || 0}</div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-border/50 space-y-2" onClick={(e) => e.stopPropagation()}>

                    {/* Row 1: Start/Resume + Pipeline */}
                    <div className="flex gap-2">
                        {showStartBtn && (
                            <Button
                                onClick={() => { if (!canClickStart || isStarting) return; onStart(campaign) }}
                                disabled={!canClickStart || isStarting}
                                className="flex-1 text-xs h-8 disabled:opacity-50"
                                size="sm"
                                title={(!withinWindow && !isResume) ? 'Outside schedule window' : undefined}
                            >
                                {isStarting ? (
                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Starting...</>
                                ) : isResume ? (
                                    <><PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Resume</>
                                ) : !withinWindow ? (
                                    <><Clock className="w-3.5 h-3.5 mr-1.5" /> Out of Window</>
                                ) : (
                                    <><PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Start</>
                                )}
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={() => onOpenPipeline(campaign)}
                            className={`${showStartBtn ? 'flex-1' : 'w-full'} h-8 text-xs border-border text-muted-foreground hover:text-foreground hover:bg-muted`}
                            size="sm"
                        >
                            <KanbanSquare className="w-3.5 h-3.5 mr-1.5" /> Pipeline
                        </Button>
                    </div>

                    {/* Row 2: Pause + Cancel (shown when live) */}
                    {isLive && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => onPause(campaign)}
                                disabled={isPausing}
                                className="flex-1 h-8 text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 hover:text-yellow-800 disabled:opacity-50"
                                size="sm"
                            >
                                {isPausing ? (
                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Pausing...</>
                                ) : (
                                    <><PauseCircle className="w-3.5 h-3.5 mr-1.5" /> Pause</>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => onCancel(campaign)}
                                className="flex-1 h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 disabled:opacity-50"
                                size="sm"
                            >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
                            </Button>
                        </div>
                    )}

                    <div className="text-[10px] text-muted-foreground text-center">
                        Created {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Create Campaign Dialog ───────────────────────────────────────────────────
function CreateCampaignDialog({ open, onOpenChange, projectName, onCreate }) {
    const today = getTodayString()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [timeStart, setTimeStart] = useState('')
    const [timeEnd, setTimeEnd] = useState('')
    const [manualStart, setManualStart] = useState(false)
    const [creating, setCreating] = useState(false)
    const [touched, setTouched] = useState(false)

    const errors_ = useMemo(() => {
        const e = {}
        if (!name.trim()) e.name = 'Campaign name is required'
        if (!startDate) e.startDate = 'Start date is required'
        if (!endDate) e.endDate = 'End date is required'
        if (startDate && endDate && endDate < startDate) e.endDate = 'End date must be ≥ start date'
        if (!timeStart) e.timeStart = 'Start time is required'
        if (!timeEnd) e.timeEnd = 'End time is required'
        if (timeStart && timeEnd && timeEnd <= timeStart) e.timeEnd = 'End time must be after start time'
        return e
    }, [name, startDate, endDate, timeStart, timeEnd])

    const isValid = Object.keys(errors_).length === 0

    function handleClose() {
        if (creating) return
        setName(''); setDescription(''); setStartDate(''); setEndDate('')
        setTimeStart(''); setTimeEnd(''); setManualStart(false); setTouched(false)
        onOpenChange(false)
    }

    async function handleCreate() {
        setTouched(true)
        if (!isValid) return
        setCreating(true)
        try {
            await onCreate({ name, description, startDate, endDate, timeStart, timeEnd, manualStart })
            handleClose()
        } finally {
            setCreating(false)
        }
    }

    const fieldErr = (key) => touched && errors_[key] ? errors_[key] : null

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
            <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Radio className="w-5 h-5 text-primary" /> Create New Campaign
                    </DialogTitle>
                    <DialogDescription>
                        Schedule a new outbound call campaign{projectName ? ` for ${projectName}` : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Megaphone className="w-3.5 h-3.5 opacity-70" /> Campaign Name *
                        </Label>
                        <Input
                            placeholder="e.g., Summer Promotion"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={fieldErr('name') ? 'border-destructive ring-1 ring-destructive' : ''}
                        />
                        {fieldErr('name') && <p className="text-xs text-destructive">{fieldErr('name')}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                        <Textarea
                            placeholder="Describe the purpose of this campaign..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Campaign Schedule */}
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4">
                        <h4 className="font-medium text-foreground flex items-center gap-2 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-primary" /> Campaign Schedule
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Start Date *</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    min={today}
                                    onChange={e => setStartDate(e.target.value)}
                                    className={fieldErr('startDate') ? 'border-destructive ring-1 ring-destructive' : ''}
                                />
                                {fieldErr('startDate') && <p className="text-xs text-destructive">{fieldErr('startDate')}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">End Date *</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    min={startDate || today}
                                    onChange={e => setEndDate(e.target.value)}
                                    className={fieldErr('endDate') ? 'border-destructive ring-1 ring-destructive' : ''}
                                />
                                {fieldErr('endDate') && <p className="text-xs text-destructive">{fieldErr('endDate')}</p>}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5 opacity-70" /> Start Time *
                                </Label>
                                <Input
                                    type="time"
                                    value={timeStart}
                                    onChange={e => setTimeStart(e.target.value)}
                                    className={fieldErr('timeStart') ? 'border-destructive ring-1 ring-destructive' : ''}
                                />
                                {fieldErr('timeStart') && <p className="text-xs text-destructive">{fieldErr('timeStart')}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5 opacity-70" /> End Time *
                                </Label>
                                <Input
                                    type="time"
                                    value={timeEnd}
                                    onChange={e => setTimeEnd(e.target.value)}
                                    className={fieldErr('timeEnd') ? 'border-destructive ring-1 ring-destructive' : ''}
                                />
                                {fieldErr('timeEnd') && <p className="text-xs text-destructive">{fieldErr('timeEnd')}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Start Mode */}
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                        <h4 className="font-medium text-foreground flex items-center gap-2 text-sm mb-3">
                            <Zap className="w-3.5 h-3.5 text-primary" /> Campaign Start Mode
                        </h4>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setManualStart(false)}
                                className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${!manualStart ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                            >
                                <Zap className="w-4 h-4" />
                                <div className="text-left">
                                    <div className="font-medium">Auto Start</div>
                                    <div className="text-xs opacity-70">Starts automatically on schedule</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setManualStart(true)}
                                className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${manualStart ? 'border-orange-400 bg-orange-500/10 text-orange-700 font-medium' : 'border-border bg-background text-muted-foreground hover:border-orange-300'}`}
                            >
                                <Hand className="w-4 h-4" />
                                <div className="text-left">
                                    <div className="font-medium">Manual Start</div>
                                    <div className="text-xs opacity-70">You manually trigger the start</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Validation banner */}
                    {touched && !isValid && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            Please fill in all required fields correctly before creating the campaign.
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={creating}>Cancel</Button>
                    <Button
                        onClick={handleCreate}
                        disabled={creating || (touched && !isValid)}
                    >
                        {creating
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                            : <><Plus className="w-4 h-4 mr-2" /> Create Campaign</>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────
function DeleteConfirmDialog({ open, campaign, onConfirm, onCancel, deleting }) {
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v && !deleting) onCancel() }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" /> Delete Campaign
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. The campaign and all associated call logs will be permanently deleted.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm">
                        <span className="font-medium text-foreground">"{campaign?.name}"</span>
                        <span className="text-muted-foreground"> will be permanently deleted.</span>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onCancel} disabled={deleting}>Cancel</Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
                        {deleting
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                            : <><Trash2 className="w-4 h-4 mr-2" /> Delete Campaign</>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectCampaignsPage() {
    const router = useRouter()
    const params = useParams()
    const projectId = params.id

    const [campaigns, setCampaigns] = useState([])
    const [project, setProject] = useState(null)
    const [loading, setLoading] = useState(true)

    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingCampaign, setEditingCampaign] = useState(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingCampaign, setDeletingCampaign] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [starting, setStarting] = useState(false)
    const [startingCampaignId, setStartingCampaignId] = useState(null)
    const [pausingCampaignId, setPausingCampaignId] = useState(null)

    // Edit form state
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editStartDate, setEditStartDate] = useState('')
    const [editEndDate, setEditEndDate] = useState('')
    const [editTimeStart, setEditTimeStart] = useState('')
    const [editTimeEnd, setEditTimeEnd] = useState('')
    const [editStatus, setEditStatus] = useState('scheduled')
    const [editManualStart, setEditManualStart] = useState(false)

    useEffect(() => { if (projectId) fetchData() }, [projectId])

    async function fetchData() {
        setLoading(true)
        try {
            const [cRes, pRes] = await Promise.all([
                fetch(`/api/campaigns?project_id=${projectId}`),
                fetch(`/api/projects`)
            ])
            const cData = await cRes.json()
            setCampaigns(cData.campaigns || [])
            const pData = await pRes.json()
            const found = pData.projects?.find(p => p.id === projectId)
            if (found) setProject(found)
        } catch (e) {
            console.error(e)
            toast.error("Failed to load data")
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate({ name, description, startDate, endDate, timeStart, timeEnd, manualStart }) {
        const res = await fetch('/api/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId, name, description,
                start_date: startDate, end_date: endDate,
                time_start: timeStart, time_end: timeEnd,
                manual_start: manualStart
            })
        })
        if (!res.ok) {
            const payload = await res.json()
            throw new Error(payload?.error || 'Failed to create campaign')
        }
        const payload = await res.json()
        setCampaigns(prev => [payload.campaign, ...prev])
        toast.success("Campaign created successfully!")
    }

    function openDeleteDialog(campaign) {
        setDeletingCampaign(campaign)
        setDeleteDialogOpen(true)
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            const res = await fetch(`/api/campaigns/${deletingCampaign.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
            setCampaigns(prev => prev.filter(c => c.id !== deletingCampaign.id))
            toast.success("Campaign deleted successfully!")
            setDeleteDialogOpen(false)
            setDeletingCampaign(null)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setDeleting(false)
        }
    }

    function openEditModal(campaign) {
        setEditingCampaign(campaign)
        setEditName(campaign.name || '')
        setEditDescription(campaign.description || '')
        setEditStartDate(campaign.start_date || '')
        setEditEndDate(campaign.end_date || '')
        setEditTimeStart(campaign.time_start || '')
        setEditTimeEnd(campaign.time_end || '')
        setEditStatus(campaign.status || 'scheduled')
        setEditManualStart(campaign.manual_start === true)
        setEditModalOpen(true)
    }

    async function handleUpdate() {
        if (!editingCampaign) return
        try {
            const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    name: editName, description: editDescription,
                    start_date: editStartDate, end_date: editEndDate,
                    time_start: editTimeStart, time_end: editTimeEnd,
                    status: editStatus, manual_start: editManualStart
                })
            })
            if (!res.ok) throw new Error('Update failed')
            const data = await res.json()
            setCampaigns(prev => prev.map(c => c.id === data.campaign.id ? data.campaign : c))
            setEditModalOpen(false)
            toast.success("Campaign updated successfully!")
        } catch (err) {
            toast.error(err.message)
        }
    }

    async function handleStartCampaign(campaign) {
        const isResume = campaign.status === 'paused'
        setStarting(true)
        setStartingCampaignId(campaign.id)
        try {
            const res = await fetch(`/api/campaigns/${campaign.id}/start`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to start')
            // Optimistically update UI
            if (data.campaign) {
                setCampaigns(prev => prev.map(c => c.id === data.campaign.id ? { ...c, ...data.campaign } : c))
            }
            if (isResume) {
                toast.success("Campaign resumed!")
            } else if (data.mode === 'queued') {
                toast.success(`Queued ${data.summary?.queued || 0} calls — background worker is processing.`)
            } else {
                toast.success("Campaign started successfully!")
            }
        } catch (err) {
            toast.error(err.message)
        } finally {
            setStarting(false)
            setStartingCampaignId(null)
        }
    }

    async function handlePauseCampaign(campaign) {
        setPausingCampaignId(campaign.id)
        try {
            const res = await fetch(`/api/campaigns/${campaign.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'paused' })
            })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to pause') }
            const data = await res.json()
            setCampaigns(prev => prev.map(c => c.id === data.campaign?.id ? data.campaign : c))
            toast.success("Campaign paused!")
        } catch (err) {
            toast.error(err.message)
        } finally {
            setPausingCampaignId(null)
        }
    }

    async function handleCancelCampaign(campaign) {
        try {
            const res = await fetch(`/api/campaigns/${campaign.id}/cancel`, { method: 'POST' })
            if (!res.ok) throw new Error('Cancel failed')
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: 'cancelled' } : c))
            toast.success("Campaign cancelled.")
        } catch (err) {
            toast.error(err.message || 'Failed to cancel campaign')
        }
    }

    return (
        <div className="min-h-screen bg-muted/5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-border bg-background shadow-sm">
                <div>
                    <Button
                        variant="ghost" size="sm"
                        className="mb-2 pl-0 -ml-2 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push('/dashboard/admin/crm/projects')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Megaphone className="w-7 h-7 text-foreground" />
                        {project ? `${project.name} Campaigns` : 'Project Campaigns'}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage outbound campaigns specifically for this project
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline" size="sm"
                        onClick={fetchData} disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="gap-2 h-9 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                        size="sm"
                    >
                        <Plus className="w-4 h-4" /> New Campaign
                    </Button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Campaigns Grid */}
                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <div className="flex gap-2"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div>
                                </div>
                                <div className="space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                                <Skeleton className="h-4 w-full" />
                                <div className="pt-2"><Skeleton className="h-5 w-20 rounded-full" /></div>
                                <div className="pt-3 border-t space-y-2">
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-full" />
                                </div>
                                <Skeleton className="h-8 w-full rounded-md" />
                            </div>
                        ))}
                    </div>
                ) : campaigns.length === 0 ? (
                    <Card className="py-20 border-border bg-card shadow-sm">
                        <CardContent className="text-center">
                            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Radio className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No campaigns yet</h3>
                            <p className="text-muted-foreground mb-4">Create your first campaign for this project</p>
                            <Button onClick={() => setShowCreateDialog(true)}>
                                <Plus className="w-4 h-4 mr-2" /> Create Campaign
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {campaigns.map(campaign => (
                            <CampaignCard
                                key={campaign.id}
                                campaign={campaign}
                                projectName={project?.name}
                                starting={starting}
                                startingCampaignId={startingCampaignId}
                                pausingCampaignId={pausingCampaignId}
                                deleting={deleting}
                                onEdit={openEditModal}
                                onDelete={openDeleteDialog}
                                onStart={handleStartCampaign}
                                onPause={handlePauseCampaign}
                                onCancel={handleCancelCampaign}
                                onOpenPipeline={(c) => router.push(`/dashboard/admin/crm/projects/${projectId}/campaigns/${c.id}/pipeline`)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <CreateCampaignDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                projectName={project?.name}
                onCreate={handleCreate}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                open={deleteDialogOpen}
                campaign={deletingCampaign}
                onConfirm={handleDelete}
                onCancel={() => { if (!deleting) { setDeleteDialogOpen(false); setDeletingCampaign(null) } }}
                deleting={deleting}
            />

            {/* Edit Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="w-5 h-5 text-purple-600" /> Edit Campaign
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">Campaign Name *</Label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">Description</Label>
                            <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">Status</Label>
                            <select
                                value={editStatus}
                                onChange={e => setEditStatus(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="scheduled">Scheduled</option>
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label className="text-sm font-medium mb-1.5 block">Start Date *</Label>
                                <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-sm font-medium mb-1.5 block">End Date *</Label>
                                <Input type="date" value={editEndDate} min={editStartDate} onChange={e => setEditEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label className="text-sm font-medium mb-1.5 block">Start Time *</Label>
                                <Input type="time" value={editTimeStart} onChange={e => setEditTimeStart(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-sm font-medium mb-1.5 block">End Time *</Label>
                                <Input type="time" value={editTimeEnd} onChange={e => setEditTimeEnd(e.target.value)} />
                            </div>
                        </div>
                        {/* Start Mode */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Start Mode</Label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditManualStart(false)}
                                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${!editManualStart ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                                >
                                    <Zap className="w-4 h-4" /><span>Auto Start</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditManualStart(true)}
                                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${editManualStart ? 'border-orange-400 bg-orange-500/10 text-orange-700 font-medium' : 'border-border bg-background text-muted-foreground hover:border-orange-300'}`}
                                >
                                    <Hand className="w-4 h-4" /><span>Manual Start</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdate}>Update Campaign</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
