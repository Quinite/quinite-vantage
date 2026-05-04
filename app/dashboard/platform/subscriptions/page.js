'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DollarSign, TrendingUp, Users, CreditCard, MoreHorizontal,
    CheckCircle, XCircle, Clock, Plus, Edit, Archive, IndianRupee,
    AlertTriangle, Zap, ChevronRight, RotateCcw, PauseCircle,
    PlayCircle, Coins, History, BarChart2, Settings
} from 'lucide-react'
import { toast } from 'react-hot-toast'

// ─── Utility helpers ──────────────────────────────────────────────────────────

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0)

const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatusBadge({ status }) {
    const variants = {
        active: 'bg-green-100 text-green-800',
        trialing: 'bg-blue-100 text-blue-800',
        cancelled: 'bg-red-100 text-red-800',
        past_due: 'bg-yellow-100 text-yellow-800',
        suspended: 'bg-orange-100 text-orange-800',
        inactive: 'bg-gray-100 text-gray-800',
    }
    return <Badge className={`${variants[status] || variants.inactive} hover:opacity-80`}>{status}</Badge>
}

function UtilizationBadge({ pct }) {
    if (pct == null) return <span className="text-gray-400 text-xs">—</span>
    const color = pct >= 90 ? 'bg-red-100 text-red-800' : pct >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
    return <Badge className={`${color} hover:opacity-80`}>{pct}%</Badge>
}

function ResourceBar({ label, active = 0, archived = 0, limit = 0, isOverLimit }) {
    const total = active + archived
    const pct = limit > 0 ? Math.min(Math.round((total / limit) * 100), 100) : 0
    const barColor = isOverLimit ? 'bg-red-500' : pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-green-500'
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
                <span className="font-medium">{label}</span>
                <span>{active} active{archived > 0 ? ` + ${archived} archived` : ''} = {total} / {limit === -1 ? '∞' : limit}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${limit === -1 ? 10 : pct}%` }} />
            </div>
            {isOverLimit && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Over limit
                </p>
            )}
        </div>
    )
}

// ─── Org Detail Drawer ────────────────────────────────────────────────────────

function OrgDetailDrawer({ sub, open, onClose, plans, onRefresh }) {
    const [drawerTab, setDrawerTab] = useState('subscription')
    const [actionLoading, setActionLoading] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState(sub?.plan?.id || '')
    const [confirmDialog, setConfirmDialog] = useState(null) // { type, message, onConfirm }
    const [customLimits, setCustomLimits] = useState({
        max_users: '',
        max_projects: '',
        max_campaigns: '',
        max_leads: '',
    })
    const [creditsForm, setCreditsForm] = useState({ minutes: '', reason: '' })
    const [creditsLoading, setCreditsLoading] = useState(false)
    const [limitsLoading, setLimitsLoading] = useState(false)

    useEffect(() => {
        if (sub) {
            setSelectedPlan(sub.plan?.id || '')
            const cl = sub.custom_limits || {}
            setCustomLimits({
                max_users: cl.max_users ?? '',
                max_projects: cl.max_projects ?? '',
                max_campaigns: cl.max_campaigns ?? '',
                max_leads: cl.max_leads ?? '',
            })
        }
    }, [sub])

    if (!sub) return null

    const orgName = sub.organization?.company_name || sub.organization?.name || 'Unknown'
    const credits = sub.credits || {}
    const usage = sub.usage || {}
    const txns = credits.transactions || []

    const postAction = async (body, successMsg) => {
        setActionLoading(true)
        const t = toast.loading('Processing...')
        try {
            const res = await fetch('/api/platform/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(successMsg, { id: t })
                onRefresh()
            } else {
                toast.error(data.error || 'Action failed', { id: t })
            }
        } catch {
            toast.error('Action failed', { id: t })
        } finally {
            setActionLoading(false)
        }
    }

    const handleChangePlan = () =>
        postAction({ action: 'change_plan', id: sub.id, plan_id: selectedPlan }, 'Plan changed successfully')

    const handleStatusAction = (action) => {
        const destructive = action === 'cancel'
        if (destructive) {
            setConfirmDialog({
                type: 'cancel',
                message: `This will cancel ${orgName}'s subscription. Are you sure?`,
                onConfirm: () => {
                    setConfirmDialog(null)
                    postAction({ action: 'cancel', id: sub.id }, 'Subscription cancelled')
                },
            })
        } else {
            postAction({ action, id: sub.id }, `Subscription ${action}d successfully`)
        }
    }

    const handleSaveLimits = async () => {
        setLimitsLoading(true)
        const t = toast.loading('Saving overrides...')
        const parsed = {}
        Object.entries(customLimits).forEach(([k, v]) => {
            if (v !== '') parsed[k] = Number(v)
        })
        try {
            const res = await fetch('/api/platform/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_org_limits', org_id: sub.organization?.id, custom_limits: parsed }),
            })
            const data = await res.json()
            if (res.ok) { toast.success('Overrides saved', { id: t }); onRefresh() }
            else toast.error(data.error || 'Failed', { id: t })
        } catch { toast.error('Failed', { id: t }) }
        finally { setLimitsLoading(false) }
    }

    const handleClearLimits = () =>
        postAction({ action: 'update_org_limits', org_id: sub.organization?.id, custom_limits: null }, 'Overrides cleared')

    const handleAddCredits = async () => {
        if (!creditsForm.minutes || !creditsForm.reason) {
            toast.error('Minutes and reason are required')
            return
        }
        setCreditsLoading(true)
        const t = toast.loading('Adding credits...')
        try {
            const res = await fetch('/api/platform/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_credits',
                    org_id: sub.organization?.id,
                    minutes: Number(creditsForm.minutes),
                    reason: creditsForm.reason,
                }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('Credits added', { id: t })
                setCreditsForm({ minutes: '', reason: '' })
                onRefresh()
            } else {
                toast.error(data.error || 'Failed', { id: t })
            }
        } catch { toast.error('Failed', { id: t }) }
        finally { setCreditsLoading(false) }
    }

    const historyEntries = sub.metadata?.history || []

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
            )}

            {/* Slide-over panel */}
            <div
                className={`fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{orgName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={sub.status} />
                            <Badge variant="outline">{sub.plan?.name || 'No Plan'}</Badge>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <XCircle className="w-5 h-5" />
                    </Button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto">
                    <Tabs value={drawerTab} onValueChange={setDrawerTab} className="h-full flex flex-col">
                        <TabsList className="grid grid-cols-4 mx-6 mt-4">
                            <TabsTrigger value="subscription" className="text-xs"><Settings className="w-3 h-3 mr-1" />Subscription</TabsTrigger>
                            <TabsTrigger value="usage" className="text-xs"><BarChart2 className="w-3 h-3 mr-1" />Usage</TabsTrigger>
                            <TabsTrigger value="credits" className="text-xs"><Coins className="w-3 h-3 mr-1" />AI Credits</TabsTrigger>
                            <TabsTrigger value="history" className="text-xs"><History className="w-3 h-3 mr-1" />History</TabsTrigger>
                        </TabsList>

                        {/* Tab 1: Subscription */}
                        <TabsContent value="subscription" className="px-6 py-4 space-y-6">
                            {/* Plan info */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Plan Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium">{sub.plan?.name || '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Status</span><StatusBadge status={sub.status} /></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Billing Cycle</span><span className="capitalize">{sub.billing_cycle || '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Period Start</span><span>{formatDate(sub.current_period_start)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Period End</span><span>{formatDate(sub.current_period_end)}</span></div>
                                </CardContent>
                            </Card>

                            {/* Change Plan */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Change Plan</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plans.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} ({formatCurrency(p.price_monthly)}/mo)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleChangePlan} disabled={actionLoading || !selectedPlan} className="w-full">
                                        Apply Plan
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Status Actions */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Status Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-wrap gap-2">
                                    {sub.status !== 'active' && (
                                        <Button variant="outline" size="sm" onClick={() => handleStatusAction('activate')} disabled={actionLoading}>
                                            <PlayCircle className="w-4 h-4 mr-1" /> Activate
                                        </Button>
                                    )}
                                    {sub.status === 'active' && (
                                        <Button variant="outline" size="sm" onClick={() => handleStatusAction('suspend')} disabled={actionLoading}>
                                            <PauseCircle className="w-4 h-4 mr-1" /> Suspend
                                        </Button>
                                    )}
                                    {sub.status !== 'cancelled' && (
                                        <Button variant="destructive" size="sm" onClick={() => handleStatusAction('cancel')} disabled={actionLoading}>
                                            <XCircle className="w-4 h-4 mr-1" /> Cancel
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Custom Limit Overrides */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Custom Limit Overrides</CardTitle>
                                    <CardDescription className="text-xs">Leave blank to use plan defaults. Use -1 for unlimited.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        { key: 'max_users', label: 'Max Users', placeholder: sub.plan?.features?.max_users ?? '—' },
                                        { key: 'max_projects', label: 'Max Projects', placeholder: sub.plan?.features?.max_projects ?? '—' },
                                        { key: 'max_campaigns', label: 'Max Campaigns', placeholder: sub.plan?.features?.max_campaigns ?? '—' },
                                        { key: 'max_leads', label: 'Max Leads', placeholder: sub.plan?.features?.max_leads ?? '—' },
                                    ].map(({ key, label, placeholder }) => (
                                        <div key={key} className="grid grid-cols-2 gap-2 items-center">
                                            <Label className="text-xs">{label}</Label>
                                            <Input
                                                type="number"
                                                value={customLimits[key]}
                                                onChange={e => setCustomLimits(prev => ({ ...prev, [key]: e.target.value }))}
                                                placeholder={String(placeholder)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    ))}
                                    <div className="flex gap-2 pt-2">
                                        <Button onClick={handleSaveLimits} disabled={limitsLoading} size="sm" className="flex-1">
                                            Save Overrides
                                        </Button>
                                        <Button onClick={handleClearLimits} disabled={actionLoading} size="sm" variant="outline">
                                            Clear Overrides
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 2: Usage */}
                        <TabsContent value="usage" className="px-6 py-4 space-y-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Resource Usage</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {[
                                        { label: 'Projects', key: 'projects' },
                                        { label: 'Leads', key: 'leads' },
                                        { label: 'Campaigns', key: 'campaigns' },
                                        { label: 'Users', key: 'users' },
                                    ].map(({ label, key }) => {
                                        const r = usage[key] || {}
                                        return (
                                            <ResourceBar
                                                key={key}
                                                label={label}
                                                active={r.active || 0}
                                                archived={r.archived || 0}
                                                limit={r.limit ?? 0}
                                                isOverLimit={r.over_limit}
                                            />
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 3: AI Credits */}
                        <TabsContent value="credits" className="px-6 py-4 space-y-4">
                            {/* Credit Summary */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Credit Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex justify-between font-medium"><span>Available Balance</span><span>{credits.balance ?? '—'} min</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Total Consumed</span><span>{credits.total_consumed ?? '—'} min</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Total Purchased</span><span>{credits.total_purchased ?? '—'} min</span></div>
                                    {credits.low_balance && (
                                        <div className="mt-2 flex items-center gap-1 text-amber-700 bg-amber-50 rounded px-2 py-1 text-xs">
                                            <AlertTriangle className="w-3 h-3" /> Low balance
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Add Credits */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Add Credits</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Minutes to Add *</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={creditsForm.minutes}
                                            onChange={e => setCreditsForm(p => ({ ...p, minutes: e.target.value }))}
                                            placeholder="e.g. 60"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Reason / Note *</Label>
                                        <Input
                                            value={creditsForm.reason}
                                            onChange={e => setCreditsForm(p => ({ ...p, reason: e.target.value }))}
                                            placeholder="e.g. Goodwill addition"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <Button onClick={handleAddCredits} disabled={creditsLoading} size="sm" className="w-full">
                                        <Plus className="w-4 h-4 mr-1" /> Add Credits
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Transaction History */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Transaction History (Last 20)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {txns.length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-4">No transactions</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {txns.slice(0, 20).map((tx, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs border-b pb-2 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={tx.amount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                            {tx.type || (tx.amount > 0 ? 'credit' : 'debit')}
                                                        </Badge>
                                                        <span className="text-gray-600">{tx.description || '—'}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`font-medium ${tx.amount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                            {tx.amount > 0 ? '+' : ''}{tx.amount} min
                                                        </div>
                                                        <div className="text-gray-400">{formatDate(tx.created_at)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 4: History */}
                        <TabsContent value="history" className="px-6 py-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Subscription History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {historyEntries.length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-8">No history available</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {historyEntries.map((entry, i) => (
                                                <div key={i} className="flex items-start gap-3 text-xs border-b pb-3 last:border-0">
                                                    <div className="mt-0.5">
                                                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-800">{entry.event || entry.action}</div>
                                                        {entry.details && <div className="text-gray-500 mt-0.5">{entry.details}</div>}
                                                    </div>
                                                    <div className="text-gray-400 whitespace-nowrap">{formatDate(entry.created_at || entry.timestamp)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Confirm Dialog */}
            <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Action</DialogTitle>
                        <DialogDescription>{confirmDialog?.message}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDialog?.onConfirm}>Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlatformSubscriptionsPage() {
    const [activeTab, setActiveTab] = useState('subscriptions')
    const [subscriptions, setSubscriptions] = useState([])
    const [metrics, setMetrics] = useState({})
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [planFilter, setPlanFilter] = useState('all')

    // Drawer state
    const [drawerSub, setDrawerSub] = useState(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Plans state
    const [plans, setPlans] = useState([])
    const [plansLoading, setPlansLoading] = useState(false)
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
    const [editingPlan, setEditingPlan] = useState(null)

    const defaultPlanForm = {
        name: '',
        slug: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        features: {
            max_users: 5,
            max_projects: 2,
            max_campaigns: 5,
            max_leads: 500,
            ai_minutes_included: 60,
            topup_allowed: false,
            topup_rate_per_minute: 0,
            csv_export: false,
            custom_domain: false,
            lead_source_integrations: 0,
            audit_log_days: 0,
            advanced_analytics: false,
        },
        sort_order: 0,
        is_active: true,
    }
    const [planFormData, setPlanFormData] = useState(defaultPlanForm)

    const fetchSubscriptions = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (statusFilter !== 'all') params.append('status', statusFilter)
            if (planFilter !== 'all') params.append('plan', planFilter)
            const res = await fetch(`/api/platform/subscriptions?${params}`)
            const data = await res.json()
            if (res.ok) {
                setSubscriptions(data.subscriptions || [])
                setMetrics(data.metrics || {})
            } else {
                toast.error(data.error || 'Failed to fetch subscriptions')
            }
        } catch {
            toast.error('Failed to fetch subscriptions')
        } finally {
            setLoading(false)
        }
    }, [statusFilter, planFilter])

    const fetchPlans = useCallback(async () => {
        setPlansLoading(true)
        try {
            const res = await fetch('/api/platform/plans')
            const data = await res.json()
            if (res.ok) setPlans(data.plans || [])
            else toast.error('Failed to fetch plans')
        } catch { /* silent */ }
        finally { setPlansLoading(false) }
    }, [])

    useEffect(() => { fetchSubscriptions(); fetchPlans() }, [fetchSubscriptions, fetchPlans])

    const resetPlanForm = () => setPlanFormData(defaultPlanForm)

    const openEditPlan = (plan) => {
        setEditingPlan(plan)
        setPlanFormData({
            name: plan.name,
            slug: plan.slug,
            description: plan.description || '',
            price_monthly: plan.price_monthly,
            price_yearly: plan.price_yearly,
            features: { ...defaultPlanForm.features, ...plan.features },
            sort_order: plan.sort_order,
            is_active: plan.is_active,
        })
        setIsPlanDialogOpen(true)
    }

    const handleSavePlan = async () => {
        const t = toast.loading(editingPlan ? 'Updating plan...' : 'Creating plan...')
        try {
            const url = editingPlan ? `/api/platform/plans?id=${editingPlan.id}` : '/api/platform/plans'
            const res = await fetch(url, {
                method: editingPlan ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planFormData),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(`Plan ${editingPlan ? 'updated' : 'created'}`, { id: t })
                setIsPlanDialogOpen(false)
                setEditingPlan(null)
                resetPlanForm()
                fetchPlans()
            } else {
                toast.error(data.error || 'Failed', { id: t })
            }
        } catch { toast.error('Failed', { id: t }) }
    }

    const openDrawer = (sub) => {
        setDrawerSub(sub)
        setDrawerOpen(true)
    }

    const featF = (key) => planFormData.features[key]
    const setFeat = (key, val) => setPlanFormData(p => ({ ...p, features: { ...p.features, [key]: val } }))

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Subscriptions & Plans</h1>
                    <p className="text-gray-500 mt-1">Manage organization subscriptions and packages</p>
                </div>
                {activeTab === 'plans' && (
                    <Button onClick={() => { setEditingPlan(null); resetPlanForm(); setIsPlanDialogOpen(true) }}>
                        <Plus className="w-4 h-4 mr-2" /> Create New Plan
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                    <TabsTrigger value="plans">Plans & Packages</TabsTrigger>
                </TabsList>

                {/* ── Subscriptions Tab ── */}
                <TabsContent value="subscriptions" className="space-y-6">
                    {/* Metrics Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {loading ? [1, 2, 3, 4].map(i => (
                            <Card key={i} className="border-l-4 border-l-slate-200">
                                <CardHeader className="pb-3"><Skeleton className="h-4 w-32" /></CardHeader>
                                <CardContent><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-3 w-24" /></CardContent>
                            </Card>
                        )) : (<>
                            <Card className="border-l-4 border-l-blue-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Total Subscriptions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-gray-900">{metrics.total || 0}</div>
                                    <p className="text-xs text-gray-500 mt-1">{metrics.active || 0} active, {metrics.trialing || 0} trialing</p>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-green-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <IndianRupee className="w-4 h-4" /> Monthly Recurring Revenue
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.mrr || 0)}</div>
                                    <p className="text-xs text-gray-500 mt-1">Per month</p>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-purple-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <IndianRupee className="w-4 h-4" /> Annual Recurring Revenue
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.arr || 0)}</div>
                                    <p className="text-xs text-gray-500 mt-1">Per year</p>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-orange-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" /> Cancelled
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-gray-900">{metrics.cancelled || 0}</div>
                                    <p className="text-xs text-gray-500 mt-1">Churn: {metrics.total > 0 ? ((metrics.cancelled / metrics.total) * 100).toFixed(1) : 0}%</p>
                                </CardContent>
                            </Card>
                        </>)}
                    </div>

                    {/* Metrics Row 2 — Health */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {loading ? [1, 2].map(i => (
                            <Card key={i} className="border-l-4 border-l-slate-200">
                                <CardHeader className="pb-3"><Skeleton className="h-4 w-32" /></CardHeader>
                                <CardContent><Skeleton className="h-8 w-16" /></CardContent>
                            </Card>
                        )) : (<>
                            <Card className="border-l-4 border-l-red-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-500" /> Orgs Over Limit
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-red-600">{metrics.orgs_over_limit || 0}</div>
                                    <p className="text-xs text-gray-500 mt-1">Organizations exceeding resource limits</p>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-amber-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-500" /> Low AI Credits
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-amber-600">{metrics.low_credits || 0}</div>
                                    <p className="text-xs text-gray-500 mt-1">Organizations with low credit balance</p>
                                </CardContent>
                            </Card>
                        </>)}
                    </div>

                    {/* Subscriptions Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>All Subscriptions</CardTitle>
                                    <CardDescription>Click a row to view full details</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="Filter status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="trialing">Trialing</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                            <SelectItem value="past_due">Past Due</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={planFilter} onValueChange={setPlanFilter}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="Filter plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Plans</SelectItem>
                                            {plans.map(p => (
                                                <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {subscriptions.length === 0 && !loading ? (
                                <div className="text-center py-12 text-gray-500">
                                    <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No subscriptions found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Organization</TableHead>
                                                <TableHead>Plan</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Billing</TableHead>
                                                <TableHead>Period End</TableHead>
                                                <TableHead>AI Credits</TableHead>
                                                <TableHead>Usage</TableHead>
                                                <TableHead>Over Limit</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                [1, 2, 3, 4, 5].map(i => (
                                                    <TableRow key={i}>
                                                        {[...Array(9)].map((_, j) => (
                                                            <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))
                                            ) : (
                                                subscriptions.map((sub) => {
                                                    const credits = sub.credits || {}
                                                    const totalCredits = credits.balance || 0
                                                    return (
                                                        <TableRow
                                                            key={sub.id}
                                                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                                                            onClick={() => openDrawer(sub)}
                                                        >
                                                            <TableCell className="font-medium">
                                                                <div>{sub.organization?.company_name || sub.organization?.name || 'Unknown'}</div>
                                                                <div className="text-xs text-gray-400">{sub.organization?.id?.slice(0, 8)}…</div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{sub.plan?.name || '—'}</Badge>
                                                            </TableCell>
                                                            <TableCell><StatusBadge status={sub.status} /></TableCell>
                                                            <TableCell className="capitalize text-sm">{sub.billing_cycle || '—'}</TableCell>
                                                            <TableCell className="text-sm text-gray-500">{formatDate(sub.current_period_end)}</TableCell>
                                                            <TableCell>
                                                                <div className="text-sm">
                                                                    <span className="font-medium">{totalCredits}</span>
                                                                    <span className="text-gray-400 text-xs"> min</span>
                                                                </div>
                                                                {credits.low_balance && (
                                                                    <div className="text-xs text-amber-600">Low</div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <UtilizationBadge pct={sub.highest_utilization} />
                                                            </TableCell>
                                                            <TableCell>
                                                                {sub.any_over_limit ? (
                                                                    <Badge className="bg-red-100 text-red-800">Over Limit</Badge>
                                                                ) : (
                                                                    <span className="text-gray-300 text-xs">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Plans Tab ── */}
                <TabsContent value="plans" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscription Plans</CardTitle>
                            <CardDescription>Manage available subscription packages</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {plansLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex justify-between items-center py-4 border-b last:border-0">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-6 w-16 rounded-full" />
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                        </div>
                                    ))}
                                </div>
                            ) : plans.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Archive className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No plans found</p>
                                    <Button variant="outline" className="mt-4" onClick={() => setIsPlanDialogOpen(true)}>Create your first plan</Button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Pricing</TableHead>
                                                <TableHead>Limits</TableHead>
                                                <TableHead>AI Minutes</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {plans.map((plan) => (
                                                <TableRow key={plan.id}>
                                                    <TableCell className="font-medium">
                                                        <div>{plan.name}</div>
                                                        <div className="text-xs text-gray-500">{plan.slug}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">{formatCurrency(plan.price_monthly)}/mo</div>
                                                        <div className="text-xs text-gray-500">{formatCurrency(plan.price_yearly)}/yr</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">{plan.features?.max_users ?? '—'} Users</div>
                                                        <div className="text-xs text-gray-500">{plan.features?.max_leads ?? '—'} Leads</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">{plan.features?.monthly_minutes_included ?? '—'} min/mo</div>
                                                        {plan.features?.topup_allowed && (
                                                            <div className="text-xs text-gray-500">Top-up ₹{plan.features?.topup_rate_per_minute}/min</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {plan.is_active
                                                            ? <Badge className="bg-green-100 text-green-800">Active</Badge>
                                                            : <Badge className="bg-gray-100 text-gray-800">Archived</Badge>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => openEditPlan(plan)}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Org Detail Drawer ── */}
            <OrgDetailDrawer
                sub={drawerSub}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                plans={plans}
                onRefresh={() => { fetchSubscriptions(); setDrawerOpen(false) }}
            />

            {/* ── Plan Create/Edit Dialog ── */}
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                        <DialogDescription>Configure subscription plan details, pricing, limits, and features.</DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="limits">Limits & AI</TabsTrigger>
                            <TabsTrigger value="features">Features</TabsTrigger>
                        </TabsList>

                        {/* Basic Info */}
                        <TabsContent value="basic" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Plan Name *</Label>
                                    <Input value={planFormData.name} onChange={e => setPlanFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Pro Plan" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Slug *</Label>
                                    <Input value={planFormData.slug} onChange={e => setPlanFormData(p => ({ ...p, slug: e.target.value }))} placeholder="e.g. pro" disabled={!!editingPlan} />
                                    {editingPlan && <p className="text-xs text-gray-400">Cannot change after creation</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={planFormData.description} onChange={e => setPlanFormData(p => ({ ...p, description: e.target.value }))} rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Monthly Price (INR)</Label>
                                    <Input type="number" value={planFormData.price_monthly} onChange={e => setPlanFormData(p => ({ ...p, price_monthly: Number(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Yearly Price (INR)</Label>
                                    <Input type="number" value={planFormData.price_yearly} onChange={e => setPlanFormData(p => ({ ...p, price_yearly: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Sort Order</Label>
                                <Input type="number" value={planFormData.sort_order} onChange={e => setPlanFormData(p => ({ ...p, sort_order: Number(e.target.value) }))} />
                                <p className="text-xs text-gray-400">Lower numbers appear first</p>
                            </div>
                        </TabsContent>

                        {/* Limits & AI */}
                        <TabsContent value="limits" className="space-y-6 pt-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800">Use <code className="bg-blue-100 px-1 rounded">-1</code> for unlimited. Use <code className="bg-blue-100 px-1 rounded">0</code> for none.</p>
                            </div>

                            <div>
                                <h4 className="font-medium mb-3 text-sm">CRM Limits</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { key: 'max_users', label: 'Max Users' },
                                        { key: 'max_projects', label: 'Max Projects' },
                                        { key: 'max_campaigns', label: 'Max Campaigns' },
                                        { key: 'max_leads', label: 'Max Leads' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="space-y-2">
                                            <Label>{label}</Label>
                                            <Input type="number" value={featF(key)} onChange={e => setFeat(key, Number(e.target.value))} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3 text-sm">AI Credits</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>AI Minutes/Month</Label>
                                        <Input type="number" value={featF('monthly_minutes_included')} onChange={e => setFeat('monthly_minutes_included', Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Top-up Rate (₹/min)</Label>
                                        <Input type="number" value={featF('topup_rate_per_minute')} onChange={e => setFeat('topup_rate_per_minute', Number(e.target.value))} />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3 text-sm">Access Controls</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Lead Source Integrations (-1 = all)</Label>
                                        <Input type="number" value={featF('lead_source_integrations')} onChange={e => setFeat('lead_source_integrations', Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Audit Log Days (-1 = full)</Label>
                                        <Input type="number" value={featF('audit_log_days')} onChange={e => setFeat('audit_log_days', Number(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Features */}
                        <TabsContent value="features" className="space-y-3 pt-4">
                            {[
                                { key: 'topup_allowed', label: 'Allow Credit Top-up', desc: 'Allow organizations to purchase extra AI minutes' },
                                { key: 'csv_export', label: 'CSV Export', desc: 'Allow exporting leads and data as CSV' },
                                { key: 'custom_domain', label: 'Custom Domain', desc: 'Allow using a custom domain' },
                                { key: 'advanced_analytics', label: 'Advanced Analytics', desc: 'Access to detailed reports and insights' },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <Label className="font-medium">{label}</Label>
                                        <p className="text-xs text-gray-500">{desc}</p>
                                    </div>
                                    <Switch checked={featF(key)} onCheckedChange={v => setFeat(key, v)} />
                                </div>
                            ))}

                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <Label className="font-medium">Plan Active</Label>
                                        <p className="text-xs text-gray-500">{planFormData.is_active ? 'Visible and available' : 'Archived and hidden'}</p>
                                    </div>
                                    <Switch checked={planFormData.is_active} onCheckedChange={v => setPlanFormData(p => ({ ...p, is_active: v }))} />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => { setIsPlanDialogOpen(false); setEditingPlan(null); resetPlanForm() }}>Cancel</Button>
                        <Button onClick={handleSavePlan}>{editingPlan ? 'Update Plan' : 'Create Plan'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
