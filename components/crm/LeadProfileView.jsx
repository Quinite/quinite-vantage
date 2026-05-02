'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Phone, Building, MapPin, TrendingUp, X, Edit2, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'
import LeadActivityTimeline from '@/components/crm/LeadActivityTimeline'
import ClientPreferencesCard from '@/components/crm/ClientPreferencesCard'
import UnitDealsCard from '@/components/crm/UnitDealsCard'
import ComingUpNextCard from '@/components/crm/ComingUpNextCard'
import BestTimeToContactCard from '@/components/crm/BestTimeToContactCard'
import SentimentAnalysisCard from '@/components/crm/SentimentAnalysisCard'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getDefaultAvatar } from '@/lib/avatar-utils'

// Helper to get initials
const getInitials = (name) => {
    if (!name) return 'LP'
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

export default function LeadProfileView({ leadId, onClose, isModal = false }) {
    const [lead, setLead] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')
    const [notes, setNotes] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)

    useEffect(() => {
        if (lead?.notes) setNotes(lead.notes)
    }, [lead])

    const handleSaveNotes = async () => {
        try {
            setSavingNotes(true)
            const res = await fetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            })
            if (!res.ok) throw new Error('Failed to update notes')
            toast.success('Notes updated')
            setLead(prev => ({ ...prev, notes }))
        } catch (error) {
            toast.error('Failed to save notes')
        } finally {
            setSavingNotes(false)
        }
    }

    useEffect(() => {
        if (leadId) {
            fetchLeadData()
        }
    }, [leadId])

    const fetchLeadData = async () => {
        try {
            setLoading(true)

            // Fetch lead basic info
            const leadRes = await fetch(`/api/leads/${leadId}`)
            if (!leadRes.ok) throw new Error('Failed to fetch lead')
            const leadData = await leadRes.json()
            setLead(leadData.lead)

            // Fetch lead profile
            const profileRes = await fetch(`/api/leads/${leadId}/profile`)
            if (!profileRes.ok) throw new Error('Failed to fetch profile')
            const profileData = await profileRes.json()
            setProfile(profileData.profile)

            console.log('Lead data with call logs:', leadData.lead)

        } catch (error) {
            console.error('Error fetching lead data:', error)
            toast.error('Failed to load lead profile')
        } finally {
            setLoading(false)
        }
    }

    const getEngagementColor = (level) => {
        switch (level) {
            case 'hot': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900'
            case 'warm': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900'
            case 'cold': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900'
            default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-800'
        }
    }

    const getScoreColor = (score) => {
        if (score >= 75) return 'text-green-600 dark:text-green-400'
        if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
        if (score >= 25) return 'text-orange-600 dark:text-orange-400'
        return 'text-red-600 dark:text-red-400'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading lead profile...</p>
                </div>
            </div>
        )
    }

    if (!lead || !profile) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <p className="text-lg font-medium text-foreground mb-2">Lead not found</p>
                    {onClose && (
                        <Button onClick={onClose}>
                            Close
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={`flex h-full bg-background ${isModal ? '' : 'min-h-screen'}`}>
            {/* Sidebar */}
            <div className="w-80 border-r bg-card p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                            <AvatarImage src={lead.avatar_url || getDefaultAvatar(lead.email || lead.name)} alt={lead.name} className="object-cover" />
                            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                                {getInitials(lead.name)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{lead.name}</h2>
                    <p className="text-sm text-muted-foreground">{profile.company || 'No Company'}</p>
                    {lead.project && (
                        <Badge variant="outline" className="mt-2 text-xs font-medium text-primary border-primary/30 bg-primary/5">
                            {lead.project.name}
                        </Badge>
                    )}
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-primary mb-3">Client Info</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                <span className="text-muted-foreground">Email</span>
                                <span className="font-medium text-foreground truncate" title={lead.email}>{lead.email}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                <span className="text-muted-foreground">Phone</span>
                                <span className="font-medium text-green-600 truncate">{lead.phone || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                <span className="text-muted-foreground">Mobile</span>
                                <span className="font-medium text-green-600 truncate">{lead.mobile || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                <span className="text-muted-foreground">Title</span>
                                <span className="font-medium text-blue-600 truncate">{profile.job_title || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                <span className="text-muted-foreground">Dept</span>
                                <span className="font-medium text-teal-600 truncate">{profile.department || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                            <Button variant="outline" size="sm" className="flex-1">Send Email</Button>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                            <MapPin className="w-4 h-4" />
                            Address Info
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="text-muted-foreground">Mailing Street</span>
                                <span className="font-medium text-foreground dark:text-blue-400">{profile.mailing_street || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="text-muted-foreground">Mailing City</span>
                                <span className="font-medium text-foreground dark:text-blue-400">{profile.mailing_city || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="text-muted-foreground">Mailing State</span>
                                <span className="font-medium text-foreground dark:text-blue-400">{profile.mailing_state || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="text-muted-foreground">Mailing Country</span>
                                <span className="font-medium text-foreground dark:text-blue-400">{profile.mailing_country || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="text-muted-foreground">Mailing Zip</span>
                                <span className="font-medium text-foreground dark:text-blue-400">{profile.mailing_zip || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-muted/10">
                <div className="border-b bg-background px-6">

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                        <TabsList className="h-14 w-full justify-start bg-transparent p-0 space-x-6">
                            {['overview', 'notes', 'timeline'].map(tab => (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className="h-14 rounded-none border-b-2 border-transparent px-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium capitalize"
                                >
                                    {tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-12 gap-6 pb-6">
                            {/* Row 1 */}
                            <div className="col-span-12 md:col-span-6 lg:col-span-5">
                                <Card className="h-full">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div className="flex items-center gap-2">
                                            <Building className="w-5 h-5" />
                                            <CardTitle className="text-base font-semibold">Assigned Unit</CardTitle>
                                            {lead.unit && (
                                                <Badge variant="secondary" className="rounded-sm px-1.5 py-0 text-xs text-muted-foreground">1</Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {lead.unit ? (
                                            <div className="flex gap-3 items-center">
                                                <div className="h-14 w-14 bg-primary/5 rounded-lg shrink-0 flex items-center justify-center border border-primary/10">
                                                    <Building className="w-6 h-6 text-primary/40" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-foreground">
                                                        Unit {lead.unit.unit_number}
                                                    </p>
                                                    {lead.unit.base_price && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(lead.unit.base_price)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                                                    <Building className="w-4 h-4 text-muted-foreground/50" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">No unit assigned</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="col-span-12 md:col-span-6 lg:col-span-7">
                                <ClientPreferencesCard profile={profile} />
                            </div>

                            {/* Row 2 */}
                            <div className="col-span-12 md:col-span-6 lg:col-span-5">
                                <UnitDealsCard 
                                    deals={lead.deals || []} 
                                    leadId={leadId} 
                                    onUpdate={fetchLeadData} 
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6 lg:col-span-7 grid grid-rows-2 gap-6">
                                <div className="row-span-1">
                                    <ComingUpNextCard 
                                        leadId={leadId} 
                                        leadName={lead.name} 
                                        onShowAll={() => setActiveTab('timeline')} 
                                    />
                                </div>
                                <div className="row-span-1">
                                    <BestTimeToContactCard profile={profile} />
                                </div>
                            </div>

                            {/* Row 3 - Sentiment Analysis */}
                            <div className="col-span-12 md:col-span-6 lg:col-span-5">
                                <SentimentAnalysisCard callLogs={lead.call_logs || []} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <Card className="h-full min-h-[500px]">
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
                                <CardDescription>Internal notes about this lead</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[calc(100%-80px)] flex flex-col gap-4">
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="flex-1 resize-none p-4 text-base"
                                    placeholder="Type your notes here..."
                                />
                                <div className="flex justify-end">
                                    <Button onClick={handleSaveNotes} disabled={savingNotes}>
                                        <Save className="w-4 h-4 mr-2" />
                                        {savingNotes ? 'Saving...' : 'Save Notes'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'timeline' && (
                        <div className="max-w-4xl mx-auto">
                            <LeadActivityTimeline leadId={leadId} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
