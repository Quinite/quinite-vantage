'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Phone, User, Clock, Building2, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getDefaultAvatar } from '@/lib/avatar-utils'

export default function AgentDashboard() {
    const [incomingCalls, setIncomingCalls] = useState([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        console.log('🔄 AgentDashboard mounted, fetching calls...')
        fetchIncoming()

        // Subscribe to real-time updates
        const channel = supabase
            .channel('agent_calls_channel')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'agent_calls',
                filter: 'outcome=eq.pending_acceptance'
            }, (payload) => {
                console.log('🔔 Real-time incoming call update:', payload)
                fetchIncoming()
            })
            .subscribe((status) => {
                console.log(`📡 Subscription status: ${status}`)
            })

        return () => {
            console.log('🔌 Unsubscribing from agent_calls_channel')
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchIncoming = async () => {
        setLoading(true)
        console.log('📥 Fetching incoming calls...')
        const { data, error } = await supabase
            .from('agent_calls')
            .select(`
                *,
                lead:leads(name, phone, email, avatar_url),
                campaign:campaigns(name),
                ai_call_log:call_logs(conversation_transcript, sentiment_score)
            `)
            .eq('outcome', 'pending_acceptance')
            .order('started_at', { ascending: false })

        if (error) {
            console.error('❌ Error fetching calls:', error)
        } else {
            console.log(`✅ Fetched ${data?.length || 0} incoming calls`, data)
            setIncomingCalls(data || [])
        }
        setLoading(false)
    }

    const acceptCall = async (call) => {
        try {
            const res = await fetch(`/api/agent-calls/${call.id}/accept`, {
                method: 'POST'
            })

            if (!res.ok) throw new Error('Failed to accept call')

            toast.success(`Call accepted for ${call.lead.name}`)

            // Remove from list
            setIncomingCalls(prev => prev.filter(c => c.id !== call.id))

            // TODO: Open call interface or redirect to lead page
            window.open(`/dashboard/admin/crm/leads?leadId=${call.lead_id}`, '_blank')
        } catch (error) {
            toast.error('Failed to accept call')
        }
    }

    const getSentimentBadge = (score) => {
        if (!score) return null
        if (score > 0.5) return <Badge className="bg-green-100 text-green-800">😊 Positive</Badge>
        if (score < -0.5) return <Badge className="bg-red-100 text-red-800">😟 Negative</Badge>
        return <Badge className="bg-yellow-100 text-yellow-800">😐 Neutral</Badge>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Live Transfers</h2>
                    <p className="text-muted-foreground">Incoming calls from AI assistant</p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                    {incomingCalls.length} Waiting
                </Badge>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-muted-foreground mt-4">Loading transfers...</p>
                </div>
            ) : incomingCalls.length === 0 ? (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <Phone className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Incoming Calls</h3>
                        <p className="text-muted-foreground">
                            When AI transfers a call, it will appear here
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {incomingCalls.map(call => (
                        <Card
                            key={call.id}
                            className="border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
                                            <AvatarImage src={call.lead.avatar_url || getDefaultAvatar(call.lead.email || call.lead.name)} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                <User className="w-6 h-6" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-xl">{call.lead.name}</CardTitle>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">{call.lead.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getSentimentBadge(call.ai_call_log?.sentiment_score)}
                                        <Badge className="bg-orange-100 text-orange-800 animate-pulse">
                                            🔴 Live
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Campaign:</span>
                                        <span className="font-medium">{call.campaign.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Waiting:</span>
                                        <span className="font-medium">
                                            {Math.floor((new Date() - new Date(call.started_at)) / 1000)}s
                                        </span>
                                    </div>
                                </div>

                                {call.ai_call_log?.conversation_transcript && (
                                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-medium text-muted-foreground">AI Conversation Summary</span>
                                        </div>
                                        <p className="text-sm line-clamp-3">
                                            {call.ai_call_log.conversation_transcript}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={() => acceptCall(call)}
                                        className="flex-1 h-11 text-base font-medium shadow-md hover:shadow-lg transition-all"
                                        size="lg"
                                    >
                                        <Phone className="w-5 h-5 mr-2" />
                                        Accept Call
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-11"
                                        size="lg"
                                        onClick={() => window.open(`/dashboard/admin/crm/leads?leadId=${call.lead_id}`, '_blank')}
                                    >
                                        View Lead Details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
