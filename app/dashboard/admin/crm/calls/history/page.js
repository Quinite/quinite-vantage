'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Phone, Search, Calendar, Clock, User, Building2,
    PhoneForwarded, PhoneOff, Activity, MessageSquare,
    Flag, Sparkles, TrendingUp
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow, format } from 'date-fns'

import { usePermission } from '@/contexts/PermissionContext'
import { Lock } from 'lucide-react'

export default function CallHistory() {
    const [calls, setCalls] = useState([])
    const [filteredCalls, setFilteredCalls] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCall, setSelectedCall] = useState(null)
    const [analyzing, setAnalyzing] = useState(null)
    const [user, setUser] = useState(null)
    const supabase = createClient()

    const hasAccess = usePermission('view_call_history')

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()
    }, [])

    useEffect(() => {
        if (user && hasAccess) {
            fetchCallHistory()
        } else if (!loading && !hasAccess) {
            setLoading(false)
        }
    }, [user, hasAccess])

    useEffect(() => {
        filterCalls()
    }, [searchTerm, calls])

    const fetchCallHistory = async () => {
        if (!user) return

        let query = supabase
            .from('call_logs')
            .select(`
                *,
                lead:leads(id, name, phone, email),
                campaign:campaigns(id, name)
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        const { data, error } = await query

        if (!error && data) {
            setCalls(data)
            setFilteredCalls(data)
        }
        setLoading(false)
    }

    const filterCalls = () => {
        if (!searchTerm) {
            setFilteredCalls(calls)
            return
        }

        const filtered = calls.filter(call =>
            call.lead?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            call.lead?.phone?.includes(searchTerm) ||
            call.campaign?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            call.call_status?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredCalls(filtered)
    }

    const analyzeCall = async (callId) => {
        setAnalyzing(callId)
        try {
            const response = await fetch(`/api/calls/${callId}/analyze`, {
                method: 'POST'
            })

            if (response.ok) {
                await fetchCallHistory()
            } else {
                const error = await response.json()
                alert(`Analysis failed: ${error.error}`)
            }
        } catch (error) {
            console.error('Analysis error:', error)
        } finally {
            setAnalyzing(null)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800'
            case 'disconnected': return 'bg-gray-100 text-gray-800'
            case 'transferred': return 'bg-blue-100 text-blue-800'
            case 'failed': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getSentimentColor = (sentiment) => {
        if (!sentiment) return 'text-gray-400'
        if (sentiment > 0.3) return 'text-green-600'
        if (sentiment < -0.3) return 'text-red-600'
        return 'text-yellow-600'
    }

    const formatDuration = (seconds) => {
        if (!seconds || seconds === 0) return '0s'
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    }

    if (!hasAccess && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Access Restricted</h2>
            </div>
        )
    }

    if (loading) return <CallHistorySkeleton />

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                        <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
                        <p className="text-sm text-gray-500">View and analyze AI call interactions</p>
                    </div>
                </div>
                <Badge variant="outline" className="px-4 py-2 border-purple-200 text-purple-700 bg-purple-50">
                    {calls.length} Total Calls
                </Badge>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by lead, phone, campaign..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Completed" value={calls.filter(c => ['completed', 'transferred', 'disconnected'].includes(c.call_status)).length} icon={<Phone className="w-5 h-5" />} description="Success" />
                <StatCard title="Transferred" value={calls.filter(c => c.transferred).length} icon={<PhoneForwarded className="w-5 h-5" />} description="To Agents" />
                <StatCard title="Avg Duration" value={formatDuration(Math.round(calls.reduce((acc, c) => acc + (c.duration || 0), 0) / (calls.length || 1)))} icon={<Clock className="w-5 h-5" />} description="Call length" />
                <StatCard title="With Insights" value={calls.filter(c => c.summary || c.sentiment_label).length} icon={<Activity className="w-5 h-5" />} description="AI Analyzed" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Call Records</CardTitle>
                    <CardDescription>{filteredCalls.length} logs found</CardDescription>
                </CardHeader>
                <CardContent>
                    {!filteredCalls.length ? (
                        <div className="text-center py-12 text-gray-500">
                            <PhoneOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No calls found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredCalls.map((call) => (
                                <CallRow 
                                    key={call.id} 
                                    call={call} 
                                    getStatusColor={getStatusColor} 
                                    getSentimentColor={getSentimentColor} 
                                    formatDuration={formatDuration}
                                    isSelected={selectedCall?.id === call.id}
                                    onSelect={() => setSelectedCall(selectedCall?.id === call.id ? null : call)}
                                    onAnalyze={() => analyzeCall(call.id)}
                                    analyzing={analyzing}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function StatCard({ title, value, icon, description }) {
    return (
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-muted-foreground p-2 rounded-lg bg-secondary/50">{icon}</div>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-semibold mt-1">{value}</h3>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
        </Card>
    )
}

function CallRow({ call, getStatusColor, getSentimentColor, formatDuration, isSelected, onSelect, onAnalyze, analyzing }) {
    return (
        <div className="border rounded-lg p-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{call.lead?.name || 'Unknown Lead'}</h3>
                        <Badge className={getStatusColor(call.call_status)}>{call.call_status?.toUpperCase()}</Badge>
                        {call.transferred && <Badge variant="outline" className="text-blue-600 border-blue-600">Transferred</Badge>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {call.lead?.phone || call.callee_number}</div>
                        <div className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {call.campaign?.name || 'No Campaign'}</div>
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(call.duration)}</div>
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(call.created_at), 'MMM d, h:mm a')}</div>
                    </div>

                    {(call.sentiment_label || call.interest_level) ? (
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <Activity className={`h-4 w-4 ${getSentimentColor(call.sentiment_score)}`} />
                                <span className="font-medium">Sentiment: {call.sentiment_label}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <User className="h-4 w-4 text-gray-400" />
                                <span>Interest: {call.interest_level}</span>
                            </div>
                            {call.ai_metadata?.priority_score && (
                                <div className="flex items-center gap-1">
                                    <Flag className="h-4 w-4 text-yellow-500" />
                                    <span>Priority: {call.ai_metadata.priority_score}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400 italic">No AI insights generated</div>
                    )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={onSelect}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {isSelected ? 'Hide' : 'View'} Transcript
                    </Button>
                    {(!call.sentiment_label && !call.summary) && call.conversation_transcript && (
                        <Button size="sm" onClick={onAnalyze} disabled={analyzing === call.id}>
                            <Activity className="h-4 w-4 mr-1" />
                            {analyzing === call.id ? 'Analyzing...' : 'Analyze'}
                        </Button>
                    )}
                </div>
            </div>

            {isSelected && call.conversation_transcript && (
                <div className="mt-4 pt-4 border-t">
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{call.conversation_transcript}</pre>
                    </div>
                </div>
            )}
        </div>
    )
}

function CallHistorySkeleton() {
    return (
        <div className="space-y-6 p-6">
            <Skeleton className="h-10 w-48" />
            <div className="grid grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
            <Skeleton className="h-[400px] w-full" />
        </div>
    )
}
