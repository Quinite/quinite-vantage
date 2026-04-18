'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Phone, Users, Clock, TrendingUp, PhoneOff, PhoneForwarded, Activity, Sparkles, RefreshCw, StopCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'


import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'
import { Lock } from 'lucide-react'
import FailedCallsList from '@/components/crm/calls/FailedCallsList'

export default function LiveCallMonitor() {
    const [activeCalls, setActiveCalls] = useState([])
    const [queueStats, setQueueStats] = useState({ queued: 0, processing: 0, failed: 0 })
    const [agentStats, setAgentStats] = useState({ available: 0, onCall: 0 })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [user, setUser] = useState(null)
    const [failedCallsOpen, setFailedCallsOpen] = useState(false)
    const supabase = createClient()

    // Permissions
    const hasAccess = usePermission('view_live_calls')

    // Fetch initial data
    useEffect(() => {
        // Immediate log to check Env Var loading
        console.log('📡 [Live Monitor] ENV LOAD CHECK:', {
            ws_url: process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL,
            site_url: process.env.NEXT_PUBLIC_SITE_URL
        });

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()
    }, [])

    useEffect(() => {
        if (user && hasAccess) {
            handleRefresh()
        } else if (!loading && (!hasAccess || !user)) {
            setLoading(false)
        }
    }, [user, hasAccess])

    const handleRefresh = async () => {
        setRefreshing(true)
        await Promise.all([
            fetchActiveCalls(),
            fetchQueueStats(),
            fetchAgentStats()
        ])
        setRefreshing(false)
        setLoading(false)
    }

    const handleForceEnd = async (callId) => {
        if (!confirm('Are you sure you want to force end this call? This will mark it as failed.')) return

        const toastId = toast.loading('Ending call...')
        try {
            const response = await fetch(`/api/crm/calls/${callId}/cancel`, {
                method: 'POST'
            })

            if (!response.ok) throw new Error('Failed to cancel call')

            toast.success('Call ended successfully', { id: toastId })
            handleRefresh()
        } catch (error) {
            console.error('Error cancelling call:', error)
            toast.error('Failed to end call', { id: toastId })
        }
    }

    // Subscribe to real-time updates
    useEffect(() => {
        if (!user || !hasAccess) return

        // Subscribe to call_logs changes (ALL events to catch completions/failures)
        const callLogsChannel = supabase
            .channel('call_logs_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'call_logs'
            }, (payload) => {
                console.log('Call log change:', payload)
                // Refresh to ensure we capture status changes cleanly
                fetchActiveCalls()
            })
            .subscribe()

        // Subscribe to call_queue changes
        const queueChannel = supabase
            .channel('queue_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'call_queue'
            }, (payload) => {
                console.log('Queue change:', payload)
                fetchQueueStats()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(callLogsChannel)
            supabase.removeChannel(queueChannel)
        }
    }, [user, hasAccess])

    const fetchActiveCalls = async () => {
        if (!user) return

        let query = supabase
            .from('call_logs')
            .select(`
                *,
                lead:leads(id, name, phone, email),
                campaign:campaigns(id, name)
            `)
            .in('call_status', ['in_progress', 'ringing'])
            .order('created_at', { ascending: false })



        const { data, error } = await query

        if (!error && data) {
            setActiveCalls(data)
        }
    }

    const fetchQueueStats = async () => {
        const { data, error } = await supabase
            .from('call_queue')
            .select('status')

        if (!error && data) {
            const stats = data.reduce((acc, item) => {
                acc[item.status] = (acc[item.status] || 0) + 1
                return acc
            }, {})

            setQueueStats({
                queued: stats.queued || 0,
                processing: stats.processing || 0,
                failed: stats.failed || 0
            })
        }
    }

    const fetchAgentStats = async () => {
        try {
            const res = await fetch('/api/crm/agent-stats')
            if (res.ok) {
                const data = await res.json()
                setAgentStats({
                    available: data.available || 0,
                    onCall: data.onCall || 0
                })
            } else {
                console.error('Failed to fetch agent stats')
            }
        } catch (err) {
            console.error('Error fetching agent stats:', err)
        }
    }

    const getCallDuration = (startTime) => {
        if (!startTime) return '0s'
        return formatDistanceToNow(new Date(startTime), { addSuffix: false })
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'in_progress': return 'bg-green-500'
            case 'ringing': return 'bg-yellow-500'
            case 'transferred': return 'bg-blue-500'
            default: return 'bg-gray-500'
        }
    }

    if (!hasAccess && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Access Restricted</h2>
                <p className="text-gray-500 mt-2 text-center max-w-md">
                    You do not have permission to view live calls.
                </p>
            </div>
        )
    }

    if (loading) {
        return <LiveCallsSkeleton />
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                        Live Call Monitor
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        Real-time command center for your AI workforce
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all ${refreshing ? 'animate-spin' : ''}`}
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="px-3 py-1 gap-2 border-green-200 bg-green-50 text-green-700">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live System
                        </Badge>
                        {process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL && (
                            <span className="text-[10px] text-muted-foreground font-mono opacity-50 hover:opacity-100 transition-opacity">
                                WS: {process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Active Calls */}
                <Card className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                <Activity className="w-3 h-3" />
                                Active
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Calls</p>
                            <h3 className="text-2xl font-semibold text-foreground mt-1">{activeCalls.length}</h3>
                            <p className="text-xs text-muted-foreground mt-1">In progress right now</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Agents Available */}
                <Card className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                <Users className="w-5 h-5" />
                            </div>
                            <Badge variant="secondary" className="text-[10px] font-medium">
                                {agentStats.onCall} on call
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Agents Available</p>
                            <h3 className="text-2xl font-semibold text-foreground mt-1">{agentStats.available}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Ready to handle calls</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Queue */}
                <Card className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                <Clock className="w-5 h-5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-medium border-yellow-200 text-yellow-700 bg-yellow-50">
                                {queueStats.processing} processing
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Queue</p>
                            <h3 className="text-2xl font-semibold text-foreground mt-1">{queueStats.queued}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Waiting to be called</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Failed */}
                <Card className="overflow-hidden border-border bg-card hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">
                                <PhoneOff className="w-5 h-5" />
                            </div>
                            {queueStats.failed > 0 && (
                                <Badge variant="destructive" className="text-[10px] font-medium">
                                    Action Req.
                                </Badge>
                            )}
                        </div>
                        <div className="cursor-pointer" onClick={() => setFailedCallsOpen(true)}>
                            <p className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Failed</p>
                            <h3 className="text-2xl font-semibold text-foreground mt-1 hover:text-red-600 transition-colors">{queueStats.failed}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Calls Section */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        Active Calls
                        <Badge variant="secondary" className="ml-2">{activeCalls.length}</Badge>
                    </CardTitle>
                    <CardDescription>Real-time monitoring of ongoing calls</CardDescription>
                </CardHeader>
                <CardContent>
                    {activeCalls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="p-4 bg-secondary/50 rounded-full mb-4">
                                <Phone className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">No Active Calls</h3>
                            <p className="text-sm text-muted-foreground">Calls will appear here when they start</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeCalls.map((call) => (
                                <Card key={call.id} className="border hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-base font-semibold text-foreground">
                                                    {call.lead?.name || 'Unknown Lead'}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">{call.lead?.phone || call.callee_number}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    className={`${getStatusColor(call.call_status)} text-white`}
                                                >
                                                    {call.call_status === 'in_progress' ? 'In Progress' : 'Ringing'}
                                                </Badge>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleForceEnd(call.id)}
                                                    title="Force End Call"
                                                >
                                                    <StopCircle className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* Duration */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Duration:</span>
                                            <span className="font-medium text-foreground">{getCallDuration(call.started_at)}</span>
                                        </div>

                                        {/* Campaign */}
                                        {call.campaign && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">Campaign:</span>
                                                <span className="font-medium text-foreground truncate">{call.campaign.name}</span>
                                            </div>
                                        )}

                                        {/* Sentiment */}
                                        {call.sentiment_score !== null && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Activity className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">Sentiment:</span>
                                                <div className="flex-1 bg-secondary rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${call.sentiment_score > 0.6 ? 'bg-green-500' :
                                                            call.sentiment_score > 0.3 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${call.sentiment_score * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Transfer Status */}
                                        {call.transferred && (
                                            <div className="flex items-center gap-2 p-2 bg-blue-50/50 text-blue-700 rounded-md border border-blue-100">
                                                <PhoneForwarded className="w-4 h-4" />
                                                <span className="text-xs font-medium">Transferred to Agent</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Queue Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Clock className="w-5 h-5 text-muted-foreground" />
                            Call Queue
                        </CardTitle>
                        <CardDescription>Pending calls waiting to be processed</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-yellow-50/50 rounded-lg border border-yellow-100">
                                <div>
                                    <p className="text-sm font-medium text-yellow-900">Queued</p>
                                    <p className="text-2xl font-bold text-yellow-700">{queueStats.queued}</p>
                                </div>
                                <Clock className="w-8 h-8 text-yellow-600/50" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                                <div>
                                    <p className="text-sm font-medium text-blue-900">Processing</p>
                                    <p className="text-2xl font-bold text-blue-700">{queueStats.processing}</p>
                                </div>
                                <Activity className="w-8 h-8 text-blue-600/50" />
                            </div>
                            <div
                                className="flex items-center justify-between p-4 bg-red-50/50 rounded-lg border border-red-100 cursor-pointer hover:bg-red-50 transition-colors"
                                onClick={() => setFailedCallsOpen(true)}
                            >
                                <div>
                                    <p className="text-sm font-medium text-red-900">Failed</p>
                                    <p className="text-2xl font-bold text-red-700">{queueStats.failed}</p>
                                </div>
                                <PhoneOff className="w-8 h-8 text-red-600/50" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Users className="w-5 h-5 text-muted-foreground" />
                            Agent Availability
                        </CardTitle>
                        <CardDescription>Current agent status and capacity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-green-50/50 rounded-lg border border-green-100">
                                <div>
                                    <p className="text-sm font-medium text-green-900">Available Agents</p>
                                    <p className="text-2xl font-bold text-green-700">{agentStats.available}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    <Users className="w-8 h-8 text-green-600/50" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                                <div>
                                    <p className="text-sm font-medium text-purple-900">On Call</p>
                                    <p className="text-2xl font-bold text-purple-700">{agentStats.onCall}</p>
                                </div>
                                <Phone className="w-8 h-8 text-purple-600/50" />
                            </div>
                            <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Capacity</span>
                                    <span className="text-sm font-medium text-foreground">
                                        {agentStats.available + agentStats.onCall > 0
                                            ? Math.round((agentStats.onCall / (agentStats.available + agentStats.onCall)) * 100)
                                            : 0}%
                                    </span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-2">
                                    <div
                                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${agentStats.available + agentStats.onCall > 0
                                                ? (agentStats.onCall / (agentStats.available + agentStats.onCall)) * 100
                                                : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <FailedCallsList open={failedCallsOpen} onOpenChange={setFailedCallsOpen} />
        </div>
    )
}

function LiveCallsSkeleton() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-32" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border bg-card">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="border rounded-lg p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
