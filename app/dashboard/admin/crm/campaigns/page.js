'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MultiSelect } from "@/components/ui/multi-select"
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
  Lock,
  RefreshCw,
  AlertTriangle,
  Zap,
  Settings,
  Users,
  Shield,
  Mic,
  CreditCard,
  SlidersHorizontal,
  Sparkles,
  ChevronRight,
  Info,
  X,
  Search
} from 'lucide-react'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'
import { toast } from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useCampaigns } from '@/hooks/useCampaigns'

// ─── Phone validation (client-side, mirrors server) ──────────────────────────
function normalizePhone(raw) {
  if (!raw) return null
  let p = raw.replace(/[\s-]/g, '')
  if (p.startsWith('+91')) p = p.slice(3)
  else if (p.startsWith('91') && p.length === 12) p = p.slice(2)
  return /^[6-9]\d{9}$/.test(p) ? '+91' + p : null
}
function isValidPhone(raw) { return !!normalizePhone(raw) }

const WON_LOST = ['won', 'lost']
const CLOSED_DEAL = ['reserved', 'won']

function getEligibility(lead) {
  if (lead.archived_at) return { eligible: false, reason: 'Lead is archived' }
  if (lead.do_not_call) return { eligible: false, reason: 'Do Not Call (DNC) enabled' }
  if (!isValidPhone(lead.phone) && !isValidPhone(lead.mobile)) return { eligible: false, reason: 'No valid phone number' }
  if (lead.stage && WON_LOST.includes(lead.stage.name?.toLowerCase())) return { eligible: false, reason: `Lead in '${lead.stage.name}' stage` }
  if (lead.deals?.some(d => CLOSED_DEAL.includes(d.status))) return { eligible: false, reason: 'Has closed deals' }
  return { eligible: true }
}

function isEligibleLead(lead) {
  return getEligibility(lead).eligible
}

// ─── Status Badge ───────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const statusConfig = {
    draft:      { color: 'bg-zinc-500/10 text-zinc-600 border-zinc-200',     icon: <Clock className="w-3 h-3" /> },
    scheduled:  { color: 'bg-blue-500/10 text-blue-600 border-blue-200',     icon: <Clock className="w-3 h-3" /> },
    active:     { color: 'bg-green-500/10 text-green-600 border-green-200',  icon: <PlayCircle className="w-3 h-3" /> },
    running:    { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    paused:     { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200', icon: <PauseCircle className="w-3 h-3" /> },
    completed:  { color: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: <CheckCircle2 className="w-3 h-3" /> },
    cancelled:  { color: 'bg-red-500/10 text-red-600 border-red-200',        icon: <XCircle className="w-3 h-3" /> },
    archived:   { color: 'bg-gray-400/10 text-gray-500 border-gray-200',     icon: <XCircle className="w-3 h-3" /> },
    failed:     { color: 'bg-rose-500/10 text-rose-600 border-rose-200',     icon: <AlertTriangle className="w-3 h-3" /> },
  }
  const config = statusConfig[status] || statusConfig.scheduled
  return (
    <Badge variant="outline" className={`${config.color} border font-medium flex items-center gap-1.5 w-fit px-2 py-0.5 h-5 text-[10px] uppercase tracking-wider`}>
      {config.icon}
      {status?.toUpperCase()}
    </Badge>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTodayString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function getCurrentTimeString() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }).substring(0, 5)
}

/**
 * Returns true if current date/time is within campaign's schedule window
 */
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
  getProjectName,
  canEdit,
  canDelete,
  canRun,
  starting,
  startingCampaignId,
  pausingCampaignId,
  deleting,
  onEdit,
  onDelete,
  onStart,
  onPause,
  onCancel,
  onOpenPipeline,
  subExpired
}) {
  const withinWindow = isWithinCampaignWindow(campaign)
  const s = campaign.status || 'scheduled'

  // Start/Resume button: show for scheduled/paused campaigns
  const showStartBtn = (s === 'scheduled' || s === 'paused') && s !== 'completed' && s !== 'cancelled' && s !== 'running'
  // Can actually click start: need permission + window (or resuming paused)
  const isResume = s === 'paused'
  const canClickStart = canRun && (isResume || withinWindow) && s !== 'completed'

  // Pause/Cancel: show when actively running
  const isLive = s === 'active' || s === 'running'
  const canPauseCancel = canRun && isLive

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

          {/* Action Buttons */}
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <PermissionTooltip hasPermission={canEdit} message="You need 'Edit Campaigns' permission.">
              <Button
                variant="ghost" size="sm"
                onClick={() => { if (!canEdit) return; onEdit(campaign) }}
                disabled={!canEdit}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Edit className="w-4 h-4" />
                <span className="sr-only">Edit</span>
              </Button>
            </PermissionTooltip>
            <PermissionTooltip hasPermission={canDelete} message="You need 'Delete Campaigns' permission.">
              <Button
                variant="ghost" size="sm"
                onClick={() => { if (!canDelete) return; onDelete(campaign) }}
                disabled={deleting || !canDelete}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </PermissionTooltip>
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
          <div className="flex items-start gap-1 flex-wrap mt-0.5">
            <Building2 className="w-3 h-3 flex-shrink-0 opacity-70 mt-0.5" />
            {(campaign.projects?.length > 0 ? campaign.projects : [{ id: campaign.project_id, name: getProjectName(campaign.project_id) }]).map(p => (
              <span key={p.id} className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground leading-none">
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {campaign.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
        )}

        {/* Status Badge */}
        <div className="pt-1 flex items-center gap-2 flex-wrap">
          <StatusBadge status={campaign.status || 'scheduled'} />
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
              <div className="text-muted-foreground">Answered</div>
              <div className="font-semibold text-blue-600">{campaign.answered_calls || 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Transferred</div>
              <div className="font-semibold text-green-600">{campaign.transferred_calls || 0}</div>
            </div>
            {campaign.avg_sentiment_score != null && (
              <div>
                <div className="text-muted-foreground">Avg Sentiment</div>
                <div className={`font-semibold ${parseFloat(campaign.avg_sentiment_score) >= 0.3 ? 'text-green-600' : parseFloat(campaign.avg_sentiment_score) < -0.1 ? 'text-red-500' : 'text-yellow-600'}`}>
                  {parseFloat(campaign.avg_sentiment_score) >= 0.3 ? '😊' : parseFloat(campaign.avg_sentiment_score) < -0.1 ? '😞' : '😐'} {parseFloat(campaign.avg_sentiment_score).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="pt-2 border-t border-border/50 space-y-2" onClick={(e) => e.stopPropagation()}>

          {/* Row 1: Start/Resume (manual only) + Pipeline */}
          <div className="flex gap-2">
            {showStartBtn && (
              <PermissionTooltip
                hasPermission={canRun && !subExpired}
                message={subExpired ? 'Subscription expired. Renew to run campaigns.' : "You need 'Run Campaigns' permission."}
              >
                <Button
                  onClick={() => { if (!canClickStart || isStarting || subExpired) return; onStart(campaign) }}
                  disabled={!canClickStart || isStarting || subExpired}
                  className="flex-1 text-xs h-8 disabled:opacity-50"
                  size="sm"
                  title={subExpired ? 'Subscription expired' : !canRun ? 'No permission' : (!withinWindow && !isResume) ? 'Outside schedule window' : undefined}
                >
                  {isStarting ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Starting...</>
                  ) : !canRun ? (
                    <><Lock className="w-3.5 h-3.5 mr-1.5" /> Start</>
                  ) : isResume ? (
                    <><PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Resume</>
                  ) : !withinWindow ? (
                    <><Clock className="w-3.5 h-3.5 mr-1.5" /> Out of Window</>
                  ) : (
                    <><PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Start</>
                  )}
                </Button>
              </PermissionTooltip>
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

          {/* Row 2: Pause + Cancel (shown when live: active or running) */}
          {isLive && (
            <div className="flex gap-2">
              <PermissionTooltip hasPermission={canRun} message="You need 'Run Campaigns' permission.">
                <Button
                  variant="outline"
                  onClick={() => { if (!canRun) return; onPause(campaign) }}
                  disabled={!canRun || isPausing}
                  className="flex-1 h-8 text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 hover:text-yellow-800 disabled:opacity-50"
                  size="sm"
                >
                  {isPausing ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Pausing...</>
                  ) : (
                    <><PauseCircle className="w-3.5 h-3.5 mr-1.5" /> Pause</>
                  )}
                </Button>
              </PermissionTooltip>

              <PermissionTooltip hasPermission={canRun} message="You need 'Run Campaigns' permission.">
                <Button
                  variant="outline"
                  onClick={() => { if (!canRun) return; onCancel(campaign) }}
                  disabled={!canRun}
                  className="flex-1 h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 disabled:opacity-50"
                  size="sm"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
                </Button>
              </PermissionTooltip>
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

// ─── Create Campaign Dialog ────────────────────────────────────────────────
function CreateCampaignDialog({ open, onOpenChange, projects, loadingProjects, onCreate }) {
  const today = getTodayString()

  const [selectedProjectIds, setSelectedProjectIds] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [timeStart, setTimeStart] = useState('09:00')
  const [timeEnd, setTimeEnd] = useState('21:00')
  const [dndCompliance, setDndCompliance] = useState(true)
  const [creditCap, setCreditCap] = useState('')
  const [aiScript, setAiScript] = useState('')
  const [callSettings, setCallSettings] = useState({ language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 })
  const [enrollMode, setEnrollMode] = useState('auto') // 'auto' | 'manual'
  const [selectedLeads, setSelectedLeads] = useState(new Set())
  const [leadSearch, setLeadSearch] = useState('')
  const [projectLeads, setProjectLeads] = useState([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [creating, setCreating] = useState(false)
  const [touched, setTouched] = useState(false)
  const [creditBalance, setCreditBalance] = useState(null) // total available minutes

  useEffect(() => {
    if (!open) return
    fetch('/api/billing/credits')
      .then(r => r.json())
      .then(d => setCreditBalance(d.credits?.balance ?? null))
      .catch(() => setCreditBalance(null))
  }, [open])

  function toggleProject(id) {
    setSelectedProjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  useEffect(() => {
    if (!selectedProjectIds.length) { setProjectLeads([]); return }
    setLoadingLeads(true)
    Promise.all(
      selectedProjectIds.map(pid =>
        fetch(`/api/leads?project_id=${pid}&limit=200&view_mode=active`)
          .then(r => r.json()).then(d => d.leads || [])
      )
    ).then(results => {
      const seen = new Set()
      const merged = results.flat().filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true })
      setProjectLeads(merged)
    }).catch(() => setProjectLeads([]))
      .finally(() => setLoadingLeads(false))
  }, [selectedProjectIds])

  const eligibleLeads = useMemo(() => projectLeads.filter(isEligibleLead), [projectLeads])
  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return projectLeads
    const q = leadSearch.toLowerCase()
    return projectLeads.filter(l => l.name?.toLowerCase().includes(q) || l.phone?.includes(q))
  }, [projectLeads, leadSearch])

  function toggleLead(id) {
    setSelectedLeads(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAllVisible() {
    const ids = filteredLeads.filter(isEligibleLead).map(l => l.id)
    const allOn = ids.every(id => selectedLeads.has(id)) && ids.length > 0
    setSelectedLeads(prev => { const n = new Set(prev); allOn ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n })
  }

  const errors_ = useMemo(() => {
    const e = {}
    if (!selectedProjectIds.length) e.projectIds = 'Select at least one project'
    if (!name.trim()) e.name = 'Campaign name is required'
    if (!startDate) e.startDate = 'Start date is required'
    if (!endDate) e.endDate = 'End date is required'
    if (startDate && endDate && endDate < startDate) e.endDate = 'End date must be ≥ start date'
    if (!timeStart) e.timeStart = 'Start time is required'
    if (!timeEnd) e.timeEnd = 'End time is required'
    if (timeStart && timeEnd && timeEnd <= timeStart) e.timeEnd = 'End time must be after start time'
    return e
  }, [selectedProjectIds, name, startDate, endDate, timeStart, timeEnd])

  const isValid = Object.keys(errors_).length === 0
  const fieldErr = (key) => touched && errors_[key] ? errors_[key] : null
  const maxCallsHint = creditCap !== '' && !isNaN(parseFloat(creditCap)) && parseFloat(creditCap) > 0
    ? Math.floor(parseFloat(creditCap) / (callSettings.max_duration / 60)) : null

  function handleClose() {
    if (creating) return
    setSelectedProjectIds([]); setName(''); setDescription(''); setStartDate(''); setEndDate('')
    setTimeStart('09:00'); setTimeEnd('21:00'); setDndCompliance(true); setTouched(false)
    setCreditCap(''); setAiScript(''); setEnrollMode('auto'); setSelectedLeads(new Set()); setLeadSearch('')
    setCallSettings({ language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 })
    setProjectLeads([]); setCreditBalance(null); onOpenChange(false)
  }

  async function handleCreate() {
    setTouched(true)
    if (!isValid) return
    setCreating(true)
    try {
      await onCreate({
        projectIds: selectedProjectIds, name, description, startDate, endDate, timeStart, timeEnd, dndCompliance,
        creditCap: creditCap !== '' ? parseFloat(creditCap) : null,
        aiScript: aiScript.trim() || null,
        callSettings: { ...callSettings, max_duration: parseInt(callSettings.max_duration), silence_timeout: parseInt(callSettings.silence_timeout) },
        autoEnroll: enrollMode === 'auto',
        leadIds: enrollMode === 'manual' ? [...selectedLeads] : []
      })
      handleClose()
    } catch (err) {
      // Error is already handled by toast in parent handleCreate
    } finally { setCreating(false) }
  }

  // shared input sizing
  const inputSm = 'h-8 text-sm bg-white dark:bg-zinc-900'
  const selectSm = 'h-8 text-sm bg-white dark:bg-zinc-900'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">

        {/* ── Sticky Header ── */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 pt-5 pb-4 flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <div className="p-1.5 bg-primary/10 rounded-md shrink-0">
                <Radio className="w-5 h-5 text-primary animate-pulse" />
              </div>
              Create New Campaign
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Schedule an outbound AI call campaign for your project
            </DialogDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose}
            className="h-9 w-9 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        <div className="px-6 py-0 space-y-4">

          {/* ── Basic Info ── */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Projects <span className="text-destructive">*</span></Label>
              <MultiSelect
                options={projects.map(p => ({ value: p.id, label: p.name }))}
                selected={selectedProjectIds}
                onChange={setSelectedProjectIds}
                placeholder={loadingProjects ? "Loading projects..." : "Select projects..."}
                className={fieldErr('projectIds') ? 'border-destructive' : ''}
              />
              {fieldErr('projectIds') && <p className="text-xs text-destructive">{fieldErr('projectIds')}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Campaign Name <span className="text-destructive">*</span></Label>
              <Input
                className={`${inputSm} ${fieldErr('name') ? 'border-destructive' : ''}`}
                placeholder="e.g., Summer 2025 Outreach"
                value={name} onChange={e => setName(e.target.value)}
              />
              {fieldErr('name') && <p className="text-xs text-destructive">{fieldErr('name')}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Description <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
            <Textarea
              className="text-sm bg-white dark:bg-zinc-900 resize-none"
              placeholder="Briefly describe the goal of this campaign…"
              value={description} onChange={e => setDescription(e.target.value)} rows={2}
            />
          </div>

          {/* ── Schedule ── */}
          <div className="rounded-xl border border-border/60 bg-white dark:bg-zinc-950 p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Schedule</span>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Start Date <span className="text-destructive">*</span></Label>
                <Input type="date" className={`${inputSm} ${fieldErr('startDate') ? 'border-destructive' : ''}`}
                  value={startDate} min={today} onChange={e => setStartDate(e.target.value)} />
                {fieldErr('startDate') && <p className="text-xs text-destructive">{fieldErr('startDate')}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">End Date <span className="text-destructive">*</span></Label>
                <Input type="date" className={`${inputSm} ${fieldErr('endDate') ? 'border-destructive' : ''}`}
                  value={endDate} min={startDate || today} onChange={e => setEndDate(e.target.value)} />
                {fieldErr('endDate') && <p className="text-xs text-destructive">{fieldErr('endDate')}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Daily Start <span className="text-destructive">*</span></Label>
                <Input type="time" className={`${inputSm} ${fieldErr('timeStart') ? 'border-destructive' : ''}`}
                  value={timeStart} onChange={e => setTimeStart(e.target.value)} />
                {fieldErr('timeStart') && <p className="text-xs text-destructive">{fieldErr('timeStart')}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Daily End <span className="text-destructive">*</span></Label>
                <Input type="time" className={`${inputSm} ${fieldErr('timeEnd') ? 'border-destructive' : ''}`}
                  value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
                {fieldErr('timeEnd') && <p className="text-xs text-destructive">{fieldErr('timeEnd')}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 px-1">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <div>
                  <p className="text-xs font-medium text-foreground">DND Compliance</p>
                  <p className="text-[11px] text-muted-foreground">Enforce TRAI 9am–9pm rules</p>
                </div>
              </div>
              <Switch checked={dndCompliance} onCheckedChange={setDndCompliance} />
            </div>
          </div>

          {/* ── Call Settings ── */}
          <div className="rounded-xl border border-border/60 bg-white dark:bg-zinc-950 p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Call Settings</span>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Language</Label>
                <Select value={callSettings.language} onValueChange={v => setCallSettings(s => ({ ...s, language: v }))}>
                  <SelectTrigger className={`${selectSm} w-full`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hinglish">Hinglish</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="gujarati">Gujarati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">AI Voice</Label>
                <Select value={callSettings.voice_id} onValueChange={v => setCallSettings(s => ({ ...s, voice_id: v }))}>
                  <SelectTrigger className={`${selectSm} w-full`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shimmer">Shimmer — Female</SelectItem>
                    <SelectItem value="alloy">Alloy — Neutral</SelectItem>
                    <SelectItem value="echo">Echo — Male</SelectItem>
                    <SelectItem value="fable">Fable — Male</SelectItem>
                    <SelectItem value="nova">Nova — Female</SelectItem>
                    <SelectItem value="onyx">Onyx — Male (Deep)</SelectItem>
                    <SelectItem value="sage">Sage — Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Max Duration</Label>
                <div className="relative">
                  <Input type="number" min={60} max={3600} step={30}
                    className={`${inputSm} pr-9`}
                    value={callSettings.max_duration}
                    onChange={e => setCallSettings(s => ({ ...s, max_duration: e.target.value }))} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">sec</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{Math.floor(callSettings.max_duration / 60)} min / call</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Silence Timeout</Label>
                <div className="relative">
                  <Input type="number" min={5} max={120}
                    className={`${inputSm} pr-9`}
                    value={callSettings.silence_timeout}
                    onChange={e => setCallSettings(s => ({ ...s, silence_timeout: e.target.value }))} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">sec</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Hang up after silence</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Credit Cap <span className="font-normal text-muted-foreground/60">(optional)</span>
                </Label>
                {creditBalance !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      Balance: <span className="font-semibold text-foreground">{creditBalance} min</span>
                    </span>
                    {creditCap === '' && (
                      <button type="button"
                        onClick={() => setCreditCap(String(creditBalance))}
                        className="text-[11px] text-primary hover:underline font-medium">
                        Use all
                      </button>
                    )}
                    {creditCap !== '' && (
                      <button type="button"
                        onClick={() => setCreditCap('')}
                        className="text-[11px] text-muted-foreground hover:text-foreground hover:underline">
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <Input type="number" min={1} max={creditBalance ?? undefined} step={5}
                  placeholder={creditBalance !== null ? `Empty = use all ${creditBalance} min` : 'No limit (use full balance)'}
                  className={`${inputSm} pr-10`}
                  value={creditCap} onChange={e => setCreditCap(e.target.value)} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">min</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {maxCallsHint
                  ? <>≈ {maxCallsHint} calls at {Math.round(callSettings.max_duration / 60)} min/call max · {creditBalance !== null && creditCap !== '' && parseFloat(creditCap) > creditBalance ? <span className="text-amber-600 font-medium">exceeds balance</span> : null}</>
                  : 'Leave empty to use your full credit balance for this campaign'
                }
              </p>
            </div>
          </div>

          {/* ── AI Instructions ── */}
          <div className="rounded-xl border border-border/60 bg-white dark:bg-zinc-950 p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">AI Instructions</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Optional</Badge>
            </div>
            <Textarea
              className="text-sm bg-white dark:bg-zinc-900 resize-none placeholder:text-xs"
              placeholder="e.g., Focus on 2BHK units. Mention the monsoon offer — 5% off for bookings this week. Always ask for a site visit."
              value={aiScript} onChange={e => setAiScript(e.target.value)} rows={2}
            />
            <p className="text-[11px] text-gray-400 !mt-[0.3rem]">Appended to the auto-generated AI system prompt.</p>
          </div>

          {/* ── Lead Enrollment ── */}
          <div className="rounded-xl border border-border/60 bg-white dark:bg-zinc-950 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-500/10 rounded-lg">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Lead Enrollment</h4>
                  <p className="text-[11px] text-muted-foreground">Select which leads to include in this campaign</p>
                </div>
              </div>
              {selectedProjectIds.length > 0 && !loadingLeads && (
                <Badge variant="outline" className="bg-background text-[10px] font-bold px-2 py-0.5">
                  {enrollMode === 'auto' ? eligibleLeads.length : selectedLeads.size} Total
                </Badge>
              )}
            </div>

            {/* 2-option toggle (Segmented Control) */}
            <div className="flex p-0.5 bg-background rounded-xl border border-border shadow-sm">
              {[
                { key: 'auto', label: 'Automatic', sub: 'All eligible leads' },
                { key: 'manual', label: 'Manual', sub: 'Pick specific leads' },
              ].map(m => (
                <button key={m.key} type="button"
                  disabled={!selectedProjectIds.length}
                  onClick={() => setEnrollMode(m.key)}
                  className={`flex-1 flex flex-col items-center py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed
                    ${enrollMode === m.key 
                      ? 'bg-primary text-primary-foreground shadow-md transform scale-[1.01]' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  <span className="text-xs font-bold">{m.label}</span>
                  <span className={`text-[9px] ${enrollMode === m.key ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>{m.sub}</span>
                </button>
              ))}
            </div>

            {!selectedProjectIds.length && (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-background/50 rounded-lg border border-dashed border-border">
                <Building2 className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground px-4">Select at least one project first to see available leads</p>
              </div>
            )}

            {/* Auto preview */}
            {selectedProjectIds.length > 0 && enrollMode === 'auto' && (
              <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-bold text-foreground">Enrolling Automatically</span>
                  </div>
                  {loadingLeads
                    ? <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Syncing…</span>
                    : <span className="text-[10px] font-bold bg-green-500/10 text-green-700 px-2 py-0.5 rounded-full">{eligibleLeads.length} Leads</span>
                  }
                </div>
                <div className="max-h-[250px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
                  {loadingLeads
                    ? <div className="p-3 space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
                    : eligibleLeads.length === 0
                      ? <div className="flex flex-col items-center justify-center py-8 opacity-60">
                          <Users className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="text-xs font-medium">No eligible leads found</p>
                        </div>
                      : eligibleLeads.map(lead => (
                        <div key={lead.id} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/20 transition-colors group">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10 group-hover:scale-105 transition-transform">
                            <span className="text-[11px] font-bold text-primary">{lead.name?.[0]?.toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground truncate">{lead.name}</span>
                              {lead.interest_level && (
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  lead.interest_level.toLowerCase() === 'hot' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                                  lead.interest_level.toLowerCase() === 'warm' ? 'bg-orange-400' : 'bg-blue-400'
                                }`} title={`Interest: ${lead.interest_level}`} />
                              )}
                              {lead.source && (
                                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/50 uppercase tracking-tighter">
                                  {lead.source}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-medium">{lead.phone || lead.mobile}</span>
                              <span className="text-[10px] text-muted-foreground/40">•</span>
                              <span className="text-[10px] text-muted-foreground">{lead.preferred_location || lead.mailing_city || 'No Loc'}</span>
                              {(lead.budget_range || lead.max_budget) && (
                                <>
                                  <span className="text-[10px] text-muted-foreground/40">•</span>
                                  <span className="text-[10px] text-green-600 font-bold">{lead.budget_range || `₹${lead.max_budget}`}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {lead.stage && (
                            <Badge variant="outline" className="text-[9px] px-2 py-0 shrink-0 h-5 font-bold border-2" style={{ borderColor: lead.stage.color + '40', color: lead.stage.color, backgroundColor: lead.stage.color + '08' }}>
                              {lead.stage.name}
                            </Badge>
                          )}
                        </div>
                      ))
                  }
                </div>
                {!loadingLeads && projectLeads.length > eligibleLeads.length && (
                  <div className="px-4 py-2 bg-amber-50/50 border-t border-amber-100 flex items-center gap-2">
                    <Info className="w-3 h-3 text-amber-600" />
                    <p className="text-[10px] text-amber-700 font-medium">
                      {projectLeads.length - eligibleLeads.length} leads excluded (Closed, DNC, or missing phone)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual selection */}
            {selectedProjectIds.length > 0 && enrollMode === 'manual' && (
              <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border-b border-border/60">
                  <div className="flex items-center gap-2 flex-1">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search by name or phone…"
                      className="h-6 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                      value={leadSearch} onChange={e => setLeadSearch(e.target.value)} />
                  </div>
                  <button type="button" onClick={toggleAllVisible}
                    className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold hover:bg-primary/20 transition-colors">
                    {filteredLeads.filter(isEligibleLead).every(l => selectedLeads.has(l.id)) && filteredLeads.filter(isEligibleLead).length > 0 ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="max-h-[250px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
                  {loadingLeads
                    ? <div className="p-3 space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
                    : filteredLeads.length === 0
                      ? <div className="flex flex-col items-center justify-center py-8 opacity-60">
                          <Search className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="text-xs font-medium">No leads match your search</p>
                        </div>
                      : filteredLeads.map(lead => {
                          const { eligible, reason } = getEligibility(lead)
                          const checked = selectedLeads.has(lead.id)
                          return (
                            <label key={lead.id}
                              className={`flex items-center gap-3 px-4 py-2 transition-all group
                                ${eligible ? 'cursor-pointer hover:bg-primary/5' : 'opacity-40 cursor-not-allowed bg-muted/10'}`}
                            >
                              <div className="relative flex items-center">
                                <input type="checkbox" checked={checked} disabled={!eligible}
                                  onChange={() => eligible && toggleLead(lead.id)}
                                  className="w-4 h-4 rounded-md border-border text-primary focus:ring-primary accent-primary cursor-pointer disabled:cursor-not-allowed" />
                              </div>
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border group-hover:border-primary/30 transition-colors">
                                <span className="text-[10px] font-bold text-muted-foreground">{lead.name?.[0]?.toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold truncate ${checked ? 'text-primary' : 'text-foreground'}`}>{lead.name}</span>
                                  {lead.interest_level && (
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      lead.interest_level.toLowerCase() === 'hot' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                                      lead.interest_level.toLowerCase() === 'warm' ? 'bg-orange-400' : 'bg-blue-400'
                                    }`} />
                                  )}
                                  {!eligible && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-[8px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-black uppercase cursor-help border border-destructive/20">Ineligible</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-destructive text-destructive-foreground border-none">
                                          <p className="text-[11px] font-bold">{reason}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-muted-foreground font-medium">{lead.phone || lead.mobile || 'No phone'}</span>
                                  <span className="text-[10px] text-muted-foreground/40">•</span>
                                  <span className="text-[10px] text-muted-foreground">{lead.preferred_location || lead.mailing_city || 'Unknown'}</span>
                                  {(lead.budget_range || lead.max_budget) && (
                                    <>
                                      <span className="text-[10px] text-muted-foreground/40">•</span>
                                      <span className="text-[10px] text-green-600 font-bold">{lead.budget_range || `₹${lead.max_budget}`}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {lead.stage && (
                                <Badge variant="outline" className="text-[9px] px-2 py-0 h-5 shrink-0 font-bold" style={{ borderColor: lead.stage.color + '40', color: lead.stage.color, backgroundColor: lead.stage.color + '05' }}>
                                  {lead.stage.name}
                                </Badge>
                              )}
                            </label>
                          )
                        })
                  }
                </div>
                {selectedLeads.size > 0 && (
                  <div className="px-4 py-2 bg-primary/10 border-t border-primary/20 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary">{selectedLeads.size} Leads Selected</span>
                    <button type="button" onClick={() => setSelectedLeads(new Set())} className="text-[10px] text-muted-foreground hover:text-destructive font-medium transition-colors">Clear Selection</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Validation ── */}
          {touched && !isValid && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <ul className="text-xs text-destructive space-y-0.5">
                {Object.values(errors_).map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* ── Sticky Footer ── */}
        <div className="sticky bottom-0 z-10 bg-background border-t border-border px-6 py-3 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={creating}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={creating || !isValid} className="min-w-[130px]">
            {creating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Creating…</> : <><Plus className="w-3.5 h-3.5 mr-1.5" />Create Campaign</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirmation Dialog ──────────────────────────────────────────────
function DeleteConfirmDialog({ open, campaign, onConfirm, onCancel, deleting }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !deleting) onCancel() }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-destructive text-lg font-bold">
              <AlertTriangle className="w-5 h-5" /> Delete Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This action is permanent and cannot be undone.
            </DialogDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel}
            disabled={deleting}
            className="h-8 w-8 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
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
            {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4 mr-2" /> Delete Campaign</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const canView = usePermission('view_campaigns')
  const canCreate = usePermission('create_campaigns')
  const canEdit = usePermission('edit_campaigns')
  const canDelete = usePermission('delete_campaigns')
  const canRun = usePermission('run_campaigns')
  const { isExpired: subExpired } = useSubscription()

  const [page, setPage] = useState(1)
  const [statusTab, setStatusTab] = useState('active')
  const [selectedProjectId, setSelectedProjectId] = useState(() => searchParams.get('project_id') || 'all')
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [creditBalance, setCreditBalance] = useState(null)

  // Map tab to status filter(s)
  const statusFilter = statusTab === 'active'
    ? 'draft,scheduled,running,paused'
    : statusTab === 'completed'
    ? 'completed,cancelled'
    : 'archived'

  // Campaign Data
  const { data: campaignsResponse, isLoading: loading, isPlaceholderData } = useCampaigns({
    projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
    status: statusFilter,
    page,
    limit: 20
  })
  const campaigns = campaignsResponse?.campaigns || []
  const metadata = campaignsResponse?.metadata || {}

  // UI State
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCampaign, setDeletingCampaign] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startingCampaignId, setStartingCampaignId] = useState(null)
  const [pausingCampaignId, setPausingCampaignId] = useState(null)
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false)
  const [campaignResults, setCampaignResults] = useState(null)

  // Edit form state
  const [editProjectIds, setEditProjectIds] = useState([])
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editTimeStart, setEditTimeStart] = useState('')
  const [editTimeEnd, setEditTimeEnd] = useState('')
  const [editStatus, setEditStatus] = useState('scheduled')
  const [editAiScript, setEditAiScript] = useState('')
  const [editCallSettings, setEditCallSettings] = useState({ language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 })

  useEffect(() => { fetchProjectsOnly(); fetchCreditBalance() }, [])
  useEffect(() => { if (showCreateDialog) fetchProjectsOnly() }, [showCreateDialog])

  // Sync filter when URL query param changes (e.g. navigating from project page)
  useEffect(() => {
    const pid = searchParams.get('project_id')
    setSelectedProjectId(pid || 'all')
    setPage(1)
  }, [searchParams])

  async function fetchCreditBalance() {
    try {
      const res = await fetch('/api/crm/credits')
      if (res.ok) {
        const data = await res.json()
        setCreditBalance(data.balance ?? null)
      }
    } catch (_) {}
  }

  async function fetchProjectsOnly() {
    setLoadingProjects(true)
    try {
      const pRes = await fetch('/api/projects')
      const pData = await pRes.json()
      setProjects(pData.projects || [])
    } catch (e) {
      console.error(e)
      toast.error("Failed to load projects")
    } finally {
      setLoadingProjects(false)
    }
  }

  async function handleCreate({ projectIds, name, description, startDate, endDate, timeStart, timeEnd, dndCompliance, creditCap, aiScript, callSettings, autoEnroll, leadIds }) {
    if (!canCreate) { toast.error("You do not have permission to create campaigns"); return }
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_ids: projectIds, name, description,
          start_date: startDate, end_date: endDate,
          time_start: timeStart, time_end: timeEnd,
          dnd_compliance: dndCompliance,
          credit_cap: creditCap,
          ai_script: aiScript,
          call_settings: callSettings,
          auto_enroll: autoEnroll,
          lead_ids: leadIds
        })
      })
      if (!res.ok) {
        const payload = await res.json()
        throw new Error(payload?.error || 'Failed to create campaign')
      }
      const payload = await res.json()
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      
      if (payload.enrollment) {
        toast.success(`Campaign created & enrolled ${payload.enrollment.enrolled} leads!`)
      } else {
        toast.success("Campaign created successfully!")
      }
    } catch (err) {
      console.error('Campaign creation error:', err)
      toast.error(err.message || 'Failed to create campaign')
      throw err // Re-throw to prevent dialog from closing
    }
  }

  function getProjectName(projectId) {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project'
  }

  function openDeleteDialog(campaign) {
    setDeletingCampaign(campaign)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (!canDelete) { toast.error("You do not have permission to delete campaigns"); return }
    setDeleting(true)
    try {
      const res = await fetch(`/api/campaigns/${deletingCampaign.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed') }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success("Campaign deleted successfully!")
      setDeleteDialogOpen(false)
      setDeletingCampaign(null)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  function toggleEditProject(id) {
    setEditProjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function openEditModal(campaign) {
    setEditingCampaign(campaign)
    setEditProjectIds(campaign.projects?.map(p => p.id) || (campaign.project_id ? [campaign.project_id] : []))
    setEditName(campaign.name || '')
    setEditDescription(campaign.description || '')
    setEditStartDate(campaign.start_date || '')
    setEditEndDate(campaign.end_date || '')
    setEditTimeStart(campaign.time_start || '')
    setEditTimeEnd(campaign.time_end || '')
    setEditStatus(campaign.status || 'scheduled')
    setEditAiScript(campaign.ai_script || '')
    setEditCallSettings(campaign.call_settings || { language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 })
    setEditModalOpen(true)
  }

  async function handleUpdate() {
    if (!editingCampaign) return
    if (!canEdit) { toast.error("You do not have permission to edit campaigns"); return }
    try {
      const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_ids: editProjectIds, name: editName, description: editDescription,
          start_date: editStartDate, end_date: editEndDate,
          time_start: editTimeStart, time_end: editTimeEnd,
          status: editStatus,
          ai_script: editAiScript || null,
          call_settings: editCallSettings
        })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Update failed') }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setEditModalOpen(false)
      toast.success("Campaign updated successfully!")
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Update failed')
    }
  }

  async function handleCancel(campaignId) {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/cancel`, { method: 'POST' })
      if (!res.ok) throw new Error('Cancel failed')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success("Campaign cancelled.")
    } catch (e) {
      toast.error("Failed to cancel campaign")
    }
  }

  async function handleStartCampaign(campaign) {
    if (!canRun) { toast.error("You do not have permission to run campaigns"); return }
    const isResume = campaign.status === 'paused'
    setStarting(true)
    setStartingCampaignId(campaign.id)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/start`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start campaign')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      if (isResume) {
        toast.success("Campaign resumed!")
      } else if (data.mode === 'queued') {
        toast.success(`Queued ${data.summary?.queued || 0} calls — background worker is processing.`)
      } else {
        setCampaignResults(data.summary)
        setResultsDialogOpen(true)
        toast.success("Campaign started!")
      }
      // Always redirect to live calls on start/resume
      setTimeout(() => router.push('/dashboard/admin/crm/calls/live'), 1500)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to start campaign')
    } finally {
      setStarting(false)
      setStartingCampaignId(null)
    }
  }

  async function handlePauseCampaign(campaign) {
    if (!canRun) { toast.error("You do not have permission to pause campaigns"); return }
    setPausingCampaignId(campaign.id)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/pause`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to pause') }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success("Campaign paused!")
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to pause campaign')
    } finally {
      setPausingCampaignId(null)
    }
  }

  async function handleCancelCampaign(campaign) {
    if (!canRun) { toast.error("You do not have permission to cancel campaigns"); return }
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/cancel`, { method: 'POST' })
      if (!res.ok) throw new Error('Cancel failed')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success("Campaign cancelled.")
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to cancel campaign')
    }
  }

  return (
    <div className="min-h-screen bg-muted/5">
      {/* Header */}
      {/* Header Toolbar */}
      <div className="p-6 border-b border-border bg-background space-y-4">
        {/* Title row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Campaigns</h1>
            {creditBalance != null && (
              <Badge variant={creditBalance < 5 ? 'destructive' : 'secondary'} className="text-xs px-2.5 py-0.5 rounded-full font-medium">
                {creditBalance < 5 && <AlertTriangle className="w-3 h-3 mr-1" />}
                {creditBalance.toFixed(1)} Credits
              </Badge>
            )}
          </div>
        </div>

        {/* Toolbar row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="p-1 bg-muted rounded-lg flex items-center w-full sm:w-auto overflow-x-auto shrink-0 shadow-inner">
            {[
              { key: 'active', label: 'Active' },
              { key: 'completed', label: 'Completed' },
              { key: 'archived', label: 'Archived' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setStatusTab(tab.key); setPage(1) }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusTab === tab.key
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Project Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <div className="w-[180px] sm:w-[220px]">
                <Select
                  value={selectedProjectId}
                  onValueChange={(v) => {
                    setSelectedProjectId(v)
                    setPage(1)
                    const url = v === 'all'
                      ? '/dashboard/admin/crm/campaigns'
                      : `/dashboard/admin/crm/campaigns?project_id=${v}`
                    router.replace(url, { scroll: false })
                  }}
                >
                  <SelectTrigger className="w-full bg-background shadow-sm h-9">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline" size="icon"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })}
                disabled={loading} className="shrink-0 h-9 w-9 bg-background shadow-sm text-muted-foreground"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* New Campaign Action */}
            <PermissionTooltip
              hasPermission={canCreate && !subExpired}
              message={subExpired ? 'Subscription expired. Renew to create campaigns.' : "You need 'Create Campaigns' permission."}
            >
              <Button
                onClick={() => { if (!canCreate || subExpired) return; setShowCreateDialog(true) }}
                disabled={!canCreate || subExpired}
                className="h-9 shadow-sm shrink-0"
              >
                {(!canCreate || subExpired) ? <Lock className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                <span className="hidden sm:inline">New Campaign</span>
                <span className="sm:hidden">New</span>
              </Button>
            </PermissionTooltip>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Campaigns Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex gap-2"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div>
                </div>
                <div className="space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                <Skeleton className="h-4 w-full" />
                <div className="pt-2"><Skeleton className="h-5 w-20 rounded-full" /></div>
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <div className="flex justify-between"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-24" /></div>
                  <div className="flex justify-between"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-16" /></div>
                </div>
                <div className="pt-3 space-y-2"><Skeleton className="h-8 w-full rounded-md" /></div>
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
              <p className="text-muted-foreground mb-4">Create your first campaign to start scheduling calls</p>
              <PermissionTooltip hasPermission={canCreate} message="You need 'Create Campaigns' permission.">
                <Button onClick={() => { if (!canCreate) return; setShowCreateDialog(true) }} disabled={!canCreate}>
                  {!canCreate ? <Lock className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Campaign
                </Button>
              </PermissionTooltip>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                getProjectName={getProjectName}
                canEdit={canEdit}
                canDelete={canDelete}
                canRun={canRun && !subExpired}
                starting={starting}
                startingCampaignId={startingCampaignId}
                pausingCampaignId={pausingCampaignId}
                deleting={deleting}
                onEdit={openEditModal}
                onDelete={openDeleteDialog}
                onStart={handleStartCampaign}
                onPause={handlePauseCampaign}
                onCancel={handleCancelCampaign}
                onOpenPipeline={(c) => router.push(`/dashboard/admin/crm/campaigns/${c.id}`)}
                subExpired={subExpired}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {campaigns.length > 0 && (
          <div className="flex items-center justify-end space-x-2 py-4 mt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isPlaceholderData}>
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">Page {page}</div>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!metadata?.hasMore || isPlaceholderData}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateCampaignDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projects={projects}
        loadingProjects={loadingProjects}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Edit className="w-6 h-6 text-purple-600" /> Edit Campaign
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Modify the details and schedule of your campaign
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setEditModalOpen(false)}
              className="h-9 w-9 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Projects *</Label>
                <MultiSelect
                  options={projects.map(p => ({ value: p.id, label: p.name }))}
                  selected={editProjectIds}
                  onChange={setEditProjectIds}
                  placeholder={loadingProjects ? "Loading projects..." : "Select projects..."}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Campaign Name *</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
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
                <Input
                  type="date"
                  value={editEndDate}
                  min={editStartDate}
                  onChange={e => setEditEndDate(e.target.value)}
                />
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

            {/* AI Call Settings */}
            <div className="pt-2 border-t border-border/50">
              <Label className="text-sm font-semibold mb-3 block text-foreground">AI Call Settings</Label>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Language</Label>
                    <select
                      value={editCallSettings.language || 'hinglish'}
                      onChange={e => setEditCallSettings(s => ({ ...s, language: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="hinglish">Hinglish (Default)</option>
                      <option value="hindi">Hindi</option>
                      <option value="english">English</option>
                      <option value="gujarati">Gujarati</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">AI Voice</Label>
                    <select
                      value={editCallSettings.voice_id || 'shimmer'}
                      onChange={e => setEditCallSettings(s => ({ ...s, voice_id: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="shimmer">Shimmer (Female, Default)</option>
                      <option value="alloy">Alloy (Neutral)</option>
                      <option value="echo">Echo (Male)</option>
                      <option value="fable">Fable (Male)</option>
                      <option value="nova">Nova (Female)</option>
                      <option value="onyx">Onyx (Male, Deep)</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Max Call Duration (seconds)</Label>
                    <Input
                      type="number" min={60} max={1800}
                      value={editCallSettings.max_duration || 600}
                      onChange={e => setEditCallSettings(s => ({ ...s, max_duration: parseInt(e.target.value) || 600 }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Silence Timeout (seconds)</Label>
                    <Input
                      type="number" min={5} max={60}
                      value={editCallSettings.silence_timeout || 30}
                      onChange={e => setEditCallSettings(s => ({ ...s, silence_timeout: parseInt(e.target.value) || 30 }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">AI Script / Custom Instructions (optional)</Label>
                  <Textarea
                    value={editAiScript}
                    onChange={e => setEditAiScript(e.target.value)}
                    rows={4}
                    placeholder="e.g. Focus on 2BHK units in Tower A. Mention the monsoon offer — 5% discount for bookings this week. Always ask for a site visit."
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This overrides the default AI persona script for this campaign.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Update Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Modal (while starting) */}
      <Dialog open={!!startingCampaignId} onOpenChange={() => { }}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" /> Campaign Running...
            </DialogTitle>
            <CardDescription>Calling leads for this campaign. Please do not close this window.</CardDescription>
          </DialogHeader>
          <CampaignProgress campaignId={startingCampaignId} onCancel={handleCancel} />
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <CheckCircle2 className="w-6 h-6 text-green-600" /> Campaign Completed
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Overview of the campaign results and call outcomes
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setResultsDialogOpen(false)}
              className="h-9 w-9 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>
          </DialogHeader>
          {campaignResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="pt-6"><div className="text-center"><div className="text-3xl font-bold text-foreground">{campaignResults.totalCalls || campaignResults.processed || 0}</div><div className="text-sm text-muted-foreground mt-1">Total Calls</div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-center"><div className="text-3xl font-bold text-green-600">{campaignResults.transferredCalls || 0}</div><div className="text-sm text-muted-foreground mt-1">Transferred</div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-center"><div className="text-3xl font-bold text-purple-600">{campaignResults.conversionRate || "0%"}</div><div className="text-sm text-muted-foreground mt-1">Conversion Rate</div></div></CardContent></Card>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-2">
                <h4 className="font-medium text-sm px-2 sticky top-0 bg-background pb-2">Call Results</h4>
                {campaignResults.callLogs?.map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                    <div>
                      <div className="font-medium flex items-center gap-2"><Phone className="w-3 h-3 text-muted-foreground" />{log.leadName}</div>
                      <div className="text-muted-foreground text-xs mt-0.5 capitalize">{log.outcome || log.status}</div>
                    </div>
                    {log.transferred && <Badge className="bg-green-100 text-green-800 border-green-200">Transferred</Badge>}
                  </div>
                ))}
                {!campaignResults.callLogs?.length && <div className="text-center py-8 text-muted-foreground">No calls made yet</div>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResultsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Campaign Progress Component ──────────────────────────────────────────────
function CampaignProgress({ campaignId, onCancel }) {
  const [progress, setProgress] = useState({ percentage: 0, processed: 0, total: 0 })
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let interval
    if (campaignId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/campaigns/${campaignId}/progress`)
          if (res.ok) { const data = await res.json(); setProgress(data) }
        } catch (e) { console.error("Poll error", e) }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [campaignId])

  const handleCancelClick = async () => {
    setCancelling(true)
    await onCancel(campaignId)
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress.percentage}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-purple-600 transition-all duration-500 ease-out" style={{ width: `${progress.percentage}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress.processed} called</span>
          <span>{progress.total} total</span>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="destructive" size="sm" onClick={handleCancelClick} disabled={cancelling}>
          {cancelling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling...</> : <><XCircle className="w-4 h-4 mr-2" /> Cancel Campaign</>}
        </Button>
      </div>
    </div>
  )
}
