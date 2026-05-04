'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { LeadEnrollmentDialog } from '@/components/crm/campaigns/LeadEnrollmentDialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
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
  Calendar as CalendarIcon,
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
  Search,
  ArrowRight,
  Archive
} from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, parse, startOfDay } from 'date-fns'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'
import { toast } from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useDynamicTitle } from '@/hooks/useDynamicTitle'
import { CampaignCard as NewCampaignCard } from '@/components/crm/campaigns/CampaignCard'

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
              <CalendarIcon className="w-3 h-3 opacity-70" /> Duration
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
function CreateCampaignDialog({ open, onOpenChange, projects, loadingProjects, onCreate, onUpdate, editingCampaign }) {
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
  const [projectLeads, setProjectLeads] = useState([])
  const [inclusionFilters, setInclusionFilters] = useState([])
  const [exclusionFilters, setExclusionFilters] = useState([])
  const [inclusionLogic, setInclusionLogic] = useState('AND')
  const [exclusionLogic, setExclusionLogic] = useState('AND')
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [confirmedEnrollCount, setConfirmedEnrollCount] = useState(null)
  const [previewLeads, setPreviewLeads] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [creating, setCreating] = useState(false)
  const [touched, setTouched] = useState(false)
  const [hasConfirmedEnrollment, setHasConfirmedEnrollment] = useState(false)
  const [creditBalance, setCreditBalance] = useState(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/billing/credits')
      .then(r => r.json())
      .then(d => setCreditBalance(d.credits?.balance ?? null))
      .catch(() => setCreditBalance(null))
  }, [open])

  useEffect(() => {
    if (!open) return
    if (editingCampaign) {
      setSelectedProjectIds(editingCampaign.projects?.map(p => p.id) || [editingCampaign.project_id].filter(Boolean))
      setName(editingCampaign.name || '')
      setDescription(editingCampaign.description || '')
      setStartDate(editingCampaign.start_date || '')
      setEndDate(editingCampaign.end_date || '')
      setTimeStart(editingCampaign.time_start || '09:00')
      setTimeEnd(editingCampaign.time_end || '21:00')
      setDndCompliance(editingCampaign.dnd_compliance !== false)
      setCreditCap(editingCampaign.credit_cap?.toString() || '')
      setCallSettings(editingCampaign.call_settings || { language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 })
    } else {
      setSelectedProjectIds([])
      setName('')
      setDescription('')
      setStartDate('')
      setEndDate('')
      setTimeStart('09:00')
      setTimeEnd('21:00')
      setDndCompliance(true)
      setCreditCap('')
      setAiScript('')
      setCallSettings({ language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 })
    }
  }, [open, editingCampaign])

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

  const filteredLeads = useMemo(() => projectLeads, [projectLeads])

  // Derives unique stages/users/sources from loaded project leads
  const derivedStages = useMemo(() => {
    const map = new Map()
    projectLeads.forEach(l => { if (l.stage?.id) map.set(l.stage.id, l.stage) })
    return [...map.values()]
  }, [projectLeads])

  const derivedUsers = useMemo(() => {
    const map = new Map()
    projectLeads.forEach(l => { if (l.assigned_to_user?.id) map.set(l.assigned_to_user.id, l.assigned_to_user) })
    return [...map.values()]
  }, [projectLeads])

  const derivedSources = useMemo(() => {
    const set = new Set()
    projectLeads.forEach(l => { if (l.source) set.add(l.source) })
    return [...set]
  }, [projectLeads])

  // Converts filter row objects into a flat spec for the API
  function buildFilterSpec(rows) {
    const spec = {}
    rows.forEach(row => {
      if (row.dimension === 'stage' && row.stage_ids?.length) spec.stage_ids = [...(spec.stage_ids || []), ...row.stage_ids]
      if (row.dimension === 'interest_level' && row.interest_levels?.length) spec.interest_levels = [...(spec.interest_levels || []), ...row.interest_levels]
      if (row.dimension === 'score') { spec.score_min = row.score_min; spec.score_max = row.score_max }
      if (row.dimension === 'assigned_to' && row.assigned_to_ids?.length) spec.assigned_to_ids = [...(spec.assigned_to_ids || []), ...row.assigned_to_ids]
      if (row.dimension === 'source' && row.sources?.length) spec.sources = [...(spec.sources || []), ...row.sources]
      if (row.dimension === 'previously_called') spec.exclude_previously_called = true
    })
    return spec
  }

  // Reactive preview fetching — only runs if NOT manually confirmed
  useEffect(() => {
    if (!open || !selectedProjectIds.length || hasConfirmedEnrollment) return
    
    setPreviewLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch('/api/campaigns/preview-enrollment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_ids: selectedProjectIds,
            inclusion: { filters: buildFilterSpec(inclusionFilters), logic: inclusionLogic },
            exclusion: { filters: buildFilterSpec(exclusionFilters), logic: exclusionLogic },
          })
        })
        if (res.ok) {
          const data = await res.json()
          setConfirmedEnrollCount(data.net)
          setPreviewLeads(data.leads || [])
        }
      } catch (_) { } finally { setPreviewLoading(false) }
    }, 500)
    return () => clearTimeout(timeout)
  }, [open, selectedProjectIds, inclusionFilters, exclusionFilters, inclusionLogic, exclusionLogic])


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
    
    // Enrollment check
    if (!editingCampaign && confirmedEnrollCount === 0) {
      e.enrollment = 'Select at least one lead for enrollment'
    }
    return e
  }, [selectedProjectIds, name, startDate, endDate, timeStart, timeEnd, confirmedEnrollCount, editingCampaign])

  const isValid = Object.keys(errors_).length === 0
  const fieldErr = (key) => touched && errors_[key] ? errors_[key] : null
  const maxCallsHint = creditCap !== '' && !isNaN(parseFloat(creditCap)) && parseFloat(creditCap) > 0
    ? Math.floor(parseFloat(creditCap) / (callSettings.max_duration / 60)) : null

  function handleClose() {
    if (creating) return
    setSelectedProjectIds([]); setName(''); setDescription(''); setStartDate(''); setEndDate('')
    setTimeStart('09:00'); setTimeEnd('21:00'); setDndCompliance(true); setTouched(false)
    setCreditCap(''); setAiScript(''); setPreviewLeads([]); setPreviewLoading(false)
    setCallSettings({ language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 })
    setProjectLeads([]); setCreditBalance(null)
    setInclusionFilters([]); setExclusionFilters([]); setInclusionLogic('AND'); setExclusionLogic('AND')
    setEnrollDialogOpen(false); setConfirmedEnrollCount(null); setHasConfirmedEnrollment(false)
    onOpenChange(false)
  }

  // Reset confirmation when filters or projects change
  useEffect(() => {
    setHasConfirmedEnrollment(false)
  }, [selectedProjectIds, inclusionFilters, exclusionFilters, inclusionLogic, exclusionLogic])

  async function handleSubmit() {
    setTouched(true)
    if (!isValid) return
    setCreating(true)
    try {
      const data = {
        projectIds: selectedProjectIds, name, description, startDate, endDate, timeStart, timeEnd, dndCompliance,
        creditCap: creditCap !== '' ? parseFloat(creditCap) : null,
        aiScript: aiScript.trim() || null,
        callSettings: { ...callSettings, max_duration: parseInt(callSettings.max_duration), silence_timeout: parseInt(callSettings.silence_timeout) },
        autoEnroll: false,
        leadIds: hasConfirmedEnrollment ? previewLeads.map(l => l.id) : [],
        enrollFilters: hasConfirmedEnrollment ? null : {
          inclusion: { filters: buildFilterSpec(inclusionFilters), logic: inclusionLogic },
          exclusion: { filters: buildFilterSpec(exclusionFilters), logic: exclusionLogic },
        },
      }

      if (editingCampaign) {
        await onUpdate(editingCampaign.id, data)
      } else {
        await onCreate(data)
      }
      handleClose()
    } catch (err) {
      // Error is already handled by toast in parent
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
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {editingCampaign ? 'Modify campaign configuration' : 'Schedule an outbound AI call campaign for your project'}
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
                className={`h-10 text-sm shadow-sm border-border/80 focus:border-primary/50 focus:ring-primary/20 bg-white dark:bg-zinc-900 ${fieldErr('name') ? 'border-destructive' : ''}`}
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
              <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Schedule</span>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Start Date <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-8 px-3 justify-start text-left font-normal text-sm bg-white dark:bg-zinc-900",
                        !startDate && "text-muted-foreground",
                        fieldErr('startDate') && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                      {startDate ? format(parse(startDate, 'yyyy-MM-dd', new Date()), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : undefined}
                      onSelect={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => date < startOfDay(new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {fieldErr('startDate') && <p className="text-xs text-destructive">{fieldErr('startDate')}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">End Date <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-8 px-3 justify-start text-left font-normal text-sm bg-white dark:bg-zinc-900",
                        !endDate && "text-muted-foreground",
                        fieldErr('endDate') && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                      {endDate ? format(parse(endDate, 'yyyy-MM-dd', new Date()), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate ? parse(endDate, 'yyyy-MM-dd', new Date()) : undefined}
                      onSelect={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => {
                        const minDate = startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : startOfDay(new Date())
                        return date < minDate
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {fieldErr('endDate') && <p className="text-xs text-destructive">{fieldErr('endDate')}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Daily Start <span className="text-destructive">*</span></Label>
                <div className="flex gap-1.5">
                  <Select 
                    value={timeStart.split(':')[0]} 
                    onValueChange={(h) => setTimeStart(`${h}:${timeStart.split(':')[1] || '00'}`)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                      <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={timeStart.split(':')[1]} 
                    onValueChange={(m) => setTimeStart(`${timeStart.split(':')[0] || '09'}:${m}`)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {['00', '15', '30', '45'].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fieldErr('timeStart') && <p className="text-xs text-destructive">{fieldErr('timeStart')}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Daily End <span className="text-destructive">*</span></Label>
                <div className="flex gap-1.5">
                  <Select 
                    value={timeEnd.split(':')[0]} 
                    onValueChange={(h) => setTimeEnd(`${h}:${timeEnd.split(':')[1] || '00'}`)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                      <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={timeEnd.split(':')[1]} 
                    onValueChange={(m) => setTimeEnd(`${timeEnd.split(':')[0] || '21'}:${m}`)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {['00', '15', '30', '45'].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              {/* Language selector — temporarily hidden
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
              */}
              {/* AI Voice selector — temporarily hidden
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
              */}
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
          {!editingCampaign && (
            <div className="rounded-xl border border-border/60 bg-white dark:bg-zinc-950 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-500/10 rounded-lg">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Lead Enrollment</h4>
                    <p className="text-[11px] text-muted-foreground">
                      {confirmedEnrollCount != null
                        ? `${confirmedEnrollCount} leads configured via filters`
                        : (inclusionFilters.length || exclusionFilters.length)
                          ? 'Filters set — confirm in enrollment panel'
                          : 'All eligible leads from selected projects'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!selectedProjectIds.length}
                      onClick={() => setEnrollDialogOpen(true)}
                      className="h-8 text-xs gap-1.5 px-4 rounded-lg font-bold bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all shadow-sm"
                    >
                      Configure Enrollment
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
              </div>


              {/* Lead Preview List */}
              {selectedProjectIds.length > 0 && (
                <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
                  <div className="px-4 py-2 border-b border-border/60 bg-muted/40 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled Leads Preview</span>
                    {previewLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  </div>
                  <div className="max-h-[200px] overflow-y-auto divide-y divide-border/40 scrollbar-thin bg-white/50">
                    {previewLoading && previewLeads.length === 0 ? (
                      <div className="p-3 space-y-2">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                      </div>
                    ) : previewLeads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 opacity-40">
                        <Users className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-bold">No leads matched by filters</p>
                      </div>
                    ) : (
                      previewLeads.map(lead => (
                        <div key={lead.id} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-white/80">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500">{lead.name?.[0]?.toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{lead.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{lead.phone || lead.mobile || 'No phone'}</p>
                          </div>
                          {lead.stage && (
                            <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 font-bold border-slate-200 bg-slate-50 text-slate-500">
                              {lead.stage.name}
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {confirmedEnrollCount != null && (
                    <div className="px-4 py-2 bg-slate-50 border-t border-border/60">
                      <p className="text-[10px] font-bold text-slate-500">
                        Total <span className="text-primary">{confirmedEnrollCount}</span> leads will be enrolled
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
          <Button size="sm" onClick={handleSubmit} disabled={creating || !isValid} className="min-w-[130px]">
            {creating ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {editingCampaign ? 'Updating...' : 'Creating...'}</>
            ) : (
              <>{editingCampaign ? 'Save Changes' : 'Create Campaign'}</>
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Enrollment configuration dialog */}
      <LeadEnrollmentDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        projectIds={selectedProjectIds}
        stages={derivedStages}
        users={derivedUsers}
        sources={derivedSources}
        inclusionFilters={inclusionFilters}
        setInclusionFilters={setInclusionFilters}
        inclusionLogic={inclusionLogic}
        setInclusionLogic={setInclusionLogic}
        exclusionFilters={exclusionFilters}
        setExclusionFilters={setExclusionFilters}
        exclusionLogic={exclusionLogic}
        setExclusionLogic={setExclusionLogic}
        onConfirm={(count, breakdown, leads) => {
          setConfirmedEnrollCount(count)
          setPreviewLeads(leads || [])
          setHasConfirmedEnrollment(true)
        }}
        previewLoading={previewLoading}
        setPreviewLoading={setPreviewLoading}
      />
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
        </DialogHeader>
        <div className="p-4">
          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm">
            <span className="font-medium text-foreground">"{campaign?.name}"</span>
            <span className="text-muted-foreground"> will be permanently deleted.</span>
          </div>
        </div>
        <DialogFooter className="gap-2 p-4">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4 mr-2" /> Delete Campaign</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}

// ─── Archive Confirmation Dialog ──────────────────────────────────────────────
function ArchiveConfirmDialog({ open, campaign, onConfirm, onCancel, archiving }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !archiving) onCancel() }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-amber-600 text-lg font-bold">
              <Archive className="w-5 h-5" /> Archive Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Archiving hides the campaign from active lists but preserves all logs.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="p-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="font-medium text-foreground">"{campaign?.name}"</span>
            <span className="text-muted-foreground"> will be moved to the archives.</span>
          </div>
        </div>
        <DialogFooter className="gap-2 p-4">
          <Button variant="outline" onClick={onCancel} disabled={archiving}>Cancel</Button>
          <Button variant="default" className="bg-amber-600 hover:bg-amber-700 text-white border-none" onClick={onConfirm} disabled={archiving}>
            {archiving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Archiving...</> : <><Archive className="w-4 h-4 mr-2" /> Archive Campaign</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  useDynamicTitle('Campaigns')
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
    ? 'scheduled,running,paused'
    : statusTab === 'completed'
    ? 'completed,cancelled,failed'
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
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [archivingCampaign, setArchivingCampaign] = useState(null)
  const [archiving, setArchiving] = useState(false)
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

  async function handleCreate(data) {
    if (!canCreate) { toast.error("You do not have permission to create campaigns"); return }
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_ids: data.projectIds,
          name: data.name,
          description: data.description,
          start_date: data.startDate,
          end_date: data.endDate,
          time_start: data.timeStart,
          time_end: data.timeEnd,
          dnd_compliance: data.dndCompliance,
          credit_cap: data.creditCap,
          ai_script: data.aiScript,
          call_settings: data.callSettings,
          auto_enroll: data.autoEnroll,
          lead_ids: data.leadIds,
          enroll_filters: data.enrollFilters,
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
      throw err 
    }
  }

  async function handleUpdate(campaignId, data) {
    if (!canEdit) { toast.error("You do not have permission to edit campaigns"); return }
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_ids: data.projectIds,
          name: data.name,
          description: data.description,
          start_date: data.startDate,
          end_date: data.endDate,
          time_start: data.timeStart,
          time_end: data.timeEnd,
          dnd_compliance: data.dndCompliance,
          credit_cap: data.creditCap,
          ai_script: data.aiScript,
          call_settings: data.callSettings,
        })
      })
      if (!res.ok) {
        const payload = await res.json()
        throw new Error(payload?.error || 'Failed to update campaign')
      }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success("Campaign updated successfully!")
    } catch (err) {
      console.error('Campaign update error:', err)
      toast.error(err.message || 'Failed to update campaign')
      throw err
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

  async function handleArchive(campaignId) {
    const campaign = campaigns.find(c => c.id === campaignId)
    setArchivingCampaign(campaign)
    setArchiveDialogOpen(true)
  }

  async function confirmArchive() {
    if (!archivingCampaign) return
    if (!canDelete) { toast.error("You do not have permission to archive campaigns"); return }
    setArchiving(true)
    try {
      const res = await fetch(`/api/campaigns/${archivingCampaign.id}/archive`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Archive failed') }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success("Campaign archived successfully!")
      setArchiveDialogOpen(false)
      setArchivingCampaign(null)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Archive failed')
    } finally {
      setArchiving(false)
    }
  }

  // Client-side name search on top of server-filtered results
  const [nameSearch, setNameSearch] = useState('')
  const visibleCampaigns = useMemo(() => {
    if (!nameSearch.trim()) return campaigns
    const q = nameSearch.toLowerCase()
    return campaigns.filter(c => c.name?.toLowerCase().includes(q))
  }, [campaigns, nameSearch])

  const STATUS_TABS = [
    { key: 'active',    label: 'Active',    countColor: 'bg-emerald-100 text-emerald-700' },
    { key: 'completed', label: 'Completed', countColor: 'bg-indigo-100 text-indigo-700' },
    { key: 'archived',  label: 'Archived',  countColor: 'bg-gray-200 text-gray-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50/60 py-4">
      <div className="bg-white shadow-sm rounded-xl mx-6">
        {/* Row 1: Title and Credits */}
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl group transition-all duration-300">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Campaigns</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Manage and monitor your AI call campaigns</p>
            </div>
          </div>
          
          {creditBalance != null && (
            <div className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm transition-all duration-300",
              creditBalance < 10 
                ? "bg-red-50 text-red-700 border-red-100" 
                : "bg-emerald-50 text-emerald-700 border-emerald-100"
            )}>
              <div className={cn(
                "p-1.5 rounded-lg",
                creditBalance < 10 ? "bg-red-100/50" : "bg-emerald-100/50"
              )}>
                <CreditCard className={cn("w-4 h-4", creditBalance < 10 ? "text-red-600" : "text-emerald-600")} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 leading-none mb-1">Available Minutes</span>
                <span className="text-base font-bold tabular-nums">
                  {creditBalance.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Tabs, Search, Filters, Refresh, New Campaign */}
        <div className="px-6 py-3.5 flex items-center gap-4 flex-wrap bg-white rounded-xl">
          {/* Segmented tabs */}
          <div className="inline-flex items-center gap-1 bg-gray-100/80 rounded-xl p-1 shrink-0">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setStatusTab(tab.key); setPage(1); setNameSearch('') }}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                  statusTab === tab.key
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-200/50'
                )}
              >
                {tab.label}
                {metadata.statusGroups?.[tab.key] > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors",
                    statusTab === tab.key ? tab.countColor : "bg-gray-200 text-gray-500"
                  )}>
                    {metadata.statusGroups[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="w-px h-8 bg-gray-200/60 mx-1 hidden xl:block" />

          {/* Search */}
          <div className="relative flex-1 min-w-[280px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
              className="pl-9 h-10 bg-white border-border rounded-xl"
            />
            {nameSearch && (
              <button 
                onClick={() => setNameSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Actions & Filters Group */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Project Filter */}
            <Select
              value={selectedProjectId}
              onValueChange={(v) => {
                setSelectedProjectId(v); setPage(1)
                router.replace(v === 'all' ? '/dashboard/admin/crm/campaigns' : `/dashboard/admin/crm/campaigns?project_id=${v}`, { scroll: false })
              }}
            >
              <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white border-border">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {(nameSearch || selectedProjectId !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setNameSearch(''); setSelectedProjectId('all'); setPage(1); router.replace('/dashboard/admin/crm/campaigns', { scroll: false }) }}
                className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-bold h-10 px-4 rounded-xl transition-all"
              >
                <X className="w-4 h-4 mr-1.5" /> Clear
              </Button>
            )}

            <div className="w-px h-8 bg-gray-200/60 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10 text-muted-foreground border-border rounded-xl"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })} 
                      disabled={loading}
                    >
                      <RefreshCw className={cn("h-4 h-4", loading && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="font-bold">Refresh Data</TooltipContent>
                </Tooltip>
              </TooltipProvider>

                  <PermissionTooltip
                hasPermission={canCreate && !subExpired}
                message={subExpired ? 'Subscription expired.' : "You need 'Create Campaigns' permission."}
              >
                <Button
                  onClick={() => { if (!canCreate || subExpired) return; setEditingCampaign(null); setShowCreateDialog(true) }}
                  disabled={!canCreate || subExpired}
                  className="gap-2 h-10 px-4 rounded-xl font-semibold bg-primary shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Campaign
                </Button>
              </PermissionTooltip>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Campaigns Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
                
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>

                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full rounded-md" />
                  <Skeleton className="h-3 w-5/6 rounded-md" />
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-24" /></div>
                  <div className="flex justify-between"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-20" /></div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-28" /></div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white backdrop-blur-sm rounded-xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Radio className="w-8 h-8 text-slate-400" />
            </div>
            {nameSearch || selectedProjectId !== 'all' ? (
              <div className="max-w-md px-6">
                <h3 className="text-lg font-bold text-foreground mb-1">No campaigns found</h3>
                <p className="text-sm text-muted-foreground mb-6">We couldn't find any campaigns matching your current search or filters.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setNameSearch(''); setSelectedProjectId('all'); setPage(1); router.replace('/dashboard/admin/crm/campaigns', { scroll: false }) }}
                  className="rounded-lg px-4 h-9 font-bold"
                >
                  <X className="w-3.5 h-3.5 mr-2" /> Clear filters
                </Button>
              </div>
            ) : statusTab === 'active' ? (
              <div className="max-w-md px-6">
                <h3 className="text-lg font-bold text-foreground mb-1">Start a campaign</h3>
                <p className="text-sm text-muted-foreground mb-6">Create your first AI-powered calling campaign to automate your outreach.</p>
                <PermissionTooltip hasPermission={canCreate && !subExpired} message={subExpired ? 'Subscription expired.' : "You need 'Create Campaigns' permission."}>
                  <Button 
                    onClick={() => { if (!canCreate || subExpired) return; setShowCreateDialog(true) }} 
                    disabled={!canCreate || subExpired} 
                    className="gap-2 h-10 px-6 rounded-lg font-semibold shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Create Campaign
                  </Button>
                </PermissionTooltip>
              </div>
            ) : (
              <div className="max-w-md px-6">
                <h3 className="text-lg font-bold text-foreground mb-1">No {statusTab} campaigns</h3>
                <p className="text-sm text-muted-foreground">There are currently no campaigns in the {statusTab} status.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleCampaigns.map(campaign => (
              <NewCampaignCard
                key={campaign.id}
                campaign={campaign}
                permissions={{ canRun: canRun && !subExpired, canEdit, canDelete }}
                orgCredits={creditBalance}
                subscriptionStatus={subExpired ? 'expired' : 'active'}
                mutations={{
                  start:    (id) => handleStartCampaign(campaigns.find(c => c.id === id)),
                  pause:    (id) => handlePauseCampaign(campaigns.find(c => c.id === id)),
                  resume:   (id) => handleStartCampaign(campaigns.find(c => c.id === id)),
                  cancel:   (id) => handleCancelCampaign(campaigns.find(c => c.id === id)),
                  delete:   (id) => openDeleteDialog(campaigns.find(c => c.id === id)),
                  edit:     (id) => {
                    const c = campaigns.find(x => x.id === id)
                    setEditingCampaign(c)
                    setShowCreateDialog(true)
                  },
                  archive:  (id) => handleArchive(id),
                  complete: undefined,
                  enroll:   undefined,
                }}
                loadingStates={{
                  starting:  starting && startingCampaignId === campaign.id,
                  pausing:   pausingCampaignId === campaign.id,
                  resuming:  starting && startingCampaignId === campaign.id,
                  archiving: false,
                  deleting:  deleting,
                }}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {campaigns.length > 0 && !nameSearch && (
          <div className="flex items-center justify-end gap-3 py-6 border-t border-border mt-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1 || isPlaceholderData}
              className="rounded-lg px-4 h-9 font-bold"
            >
              <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Previous
            </Button>
            <div className="flex items-center gap-2">
              <span className="h-9 px-4 flex items-center justify-center rounded-lg bg-slate-50 text-slate-700 text-xs font-bold border border-border min-w-[80px]">
                Page {page}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => p + 1)} 
              disabled={!metadata?.hasMore || isPlaceholderData}
              className="rounded-lg px-4 h-9 font-bold"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
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
        onUpdate={handleUpdate}
        editingCampaign={editingCampaign}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        campaign={deletingCampaign}
        onConfirm={handleDelete}
        onCancel={() => { if (!deleting) { setDeleteDialogOpen(false); setDeletingCampaign(null) } }}
        deleting={deleting}
      />

      {/* Archive Confirmation Dialog */}
      <ArchiveConfirmDialog
        open={archiveDialogOpen}
        campaign={archivingCampaign}
        onConfirm={confirmArchive}
        onCancel={() => { if (!archiving) { setArchiveDialogOpen(false); setArchivingCampaign(null) } }}
        archiving={archiving}
      />

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-xl">
          <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Edit className="w-5 h-5 text-indigo-600" />
                Edit Campaign
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 font-medium">
                Modify campaign details and scheduling
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setEditModalOpen(false)}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Projects *</Label>
                <MultiSelect
                  options={projects.map(p => ({ value: p.id, label: p.name }))}
                  selected={editProjectIds}
                  onChange={setEditProjectIds}
                  placeholder={loadingProjects ? "Loading projects..." : "Select projects..."}
                  className="rounded-lg border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campaign Name *</Label>
                <Input 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  className="rounded-lg border-slate-200 h-10 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</Label>
              <Textarea 
                value={editDescription} 
                onChange={e => setEditDescription(e.target.value)} 
                rows={3} 
                className="rounded-lg border-slate-200 resize-none font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campaign Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="h-10 rounded-lg border-slate-200 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Schedule</span>
              </div>
              
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date *</Label>
                  <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="rounded-lg border-slate-200 h-10 font-medium" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date *</Label>
                  <Input
                    type="date"
                    value={editEndDate}
                    min={editStartDate}
                    onChange={e => setEditEndDate(e.target.value)}
                    className="rounded-lg border-slate-200 h-10 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Start *</Label>
                  <Input type="time" value={editTimeStart} onChange={e => setEditTimeStart(e.target.value)} className="rounded-lg border-slate-200 h-10 font-medium" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily End *</Label>
                  <Input type="time" value={editTimeEnd} onChange={e => setEditTimeEnd(e.target.value)} className="rounded-lg border-slate-200 h-10 font-medium" />
                </div>
              </div>
            </div>

            {/* AI Configuration Section */}
            <div className="rounded-xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI Configuration</span>
              </div>
              
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Call Duration (sec)</Label>
                  <Input
                    type="number" min={60} max={1800}
                    value={editCallSettings.max_duration || 600}
                    onChange={e => setEditCallSettings(s => ({ ...s, max_duration: parseInt(e.target.value) || 600 }))}
                    className="rounded-lg border-slate-200 h-10 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Silence Timeout (sec)</Label>
                  <Input
                    type="number" min={5} max={60}
                    value={editCallSettings.silence_timeout || 30}
                    onChange={e => setEditCallSettings(s => ({ ...s, silence_timeout: parseInt(e.target.value) || 30 }))}
                    className="rounded-lg border-slate-200 h-10 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Instructions</Label>
                <Textarea
                  value={editAiScript}
                  onChange={e => setEditAiScript(e.target.value)}
                  rows={4}
                  placeholder="e.g. Focus on 2BHK units..."
                  className="rounded-lg border-slate-200 font-medium p-3 bg-white text-sm"
                />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 bg-slate-50 border-t border-border px-6 py-4 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditModalOpen(false)} className="font-bold">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              className="font-bold bg-primary text-white px-6"
            >
              Save Changes
            </Button>
          </div>
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
