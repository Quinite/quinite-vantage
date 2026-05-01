'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-hot-toast'
import { LayoutDashboard, Phone, ClipboardList, FileText, Activity, MapPin, Handshake } from 'lucide-react'
import { cn } from '@/lib/utils'

import LeadActivityTimeline from '@/components/crm/LeadActivityTimeline'
import EditLeadProfileDialog from '@/components/crm/EditLeadProfileDialog'
import AvatarPickerDialog from '@/components/crm/AvatarPickerDialog'

import LeadProfileSidebar from '@/components/crm/LeadProfileSidebar'
import LeadProfileOverview from '@/components/crm/LeadProfileOverview'
import LeadProfileNotes from '@/components/crm/LeadProfileNotes'
import LeadTasksManager from '@/components/crm/LeadTasksManager'
import LeadCallsTab from '@/components/crm/LeadCallsTab'
import SiteVisitsTab from '@/components/crm/site-visits/SiteVisitsTab'
import LeadDealsTab from '@/components/crm/leads/tabs/LeadDealsTab'

import { useLead, useLeadTasks, useLeadInteractions } from '@/hooks/useLeads'
import { useOrgSettings } from '@/hooks/usePipelines'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { usePermission } from '@/contexts/PermissionContext'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export default function LeadProfileView({ leadId, onClose, isModal = false }) {
    const { data: lead, isLoading: leadLoading, refetch: refetchLead } = useLead(leadId)
    const supabase = createClient()
    const { data: organization } = useOrgSettings()
    const canViewDeals = usePermission('view_deals')

    useLeadTasks(leadId)
    useLeadInteractions(leadId)

    const { data: siteVisits = [] } = useSiteVisits(leadId)
    const upcomingSiteVisitsCount = siteVisits.filter(v => v.status === 'scheduled').length
    const nextUpcomingVisit = siteVisits.find(v => v.status === 'scheduled' && new Date(v.scheduled_at) >= new Date()) ?? null

    // Fetch project for brochure sharing
    const { data: projectData } = useQuery({
        queryKey: ['project-brochure', lead?.project_id],
        queryFn: async () => {
            if (!lead?.project_id) return null
            const res = await fetch(`/api/projects/${lead.project_id}`)
            if (!res.ok) return null
            const d = await res.json()
            return d.project
        },
        enabled: !!lead?.project_id,
        staleTime: 60_000,
    })

    // Pre-fetch deals count for badge
    const { data: dealsData } = useQuery({
        queryKey: ['lead-deals', leadId],
        queryFn: async () => {
            const res = await fetch(`/api/leads/${leadId}/deals`)
            if (!res.ok) return { deals: [] }
            return res.json()
        },
        enabled: !!leadId && canViewDeals,
        staleTime: 30_000,
    })
    const activeDealsCount = (dealsData?.deals || []).filter(d => !['lost'].includes(d.status)).length

    const loading = leadLoading
    const [activeTab, setActiveTab] = useState('overview')
    const [notes, setNotes] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)

    useEffect(() => {
        if (lead?.notes) setNotes(lead.notes)
    }, [lead?.notes])

    // Subscribe to project_id changes on this lead (triggered by AI call auto-association)
    useEffect(() => {
        if (!leadId) return
        const channel = supabase
            .channel(`lead_project_${leadId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'leads',
                filter: `id=eq.${leadId}`
            }, (payload) => {
                const newProjectId = payload.new?.project_id
                const oldProjectId = payload.old?.project_id
                if (newProjectId !== oldProjectId) {
                    toast.success(`Lead's project updated automatically based on AI call interest`)
                    refetchLead()
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [leadId])

    const refreshAll = () => refetchLead()

    const handleSaveNotes = async () => {
        if (!leadId) return
        try {
            setSavingNotes(true)
            const res = await fetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            })
            if (!res.ok) throw new Error('Failed')
            toast.success('Notes updated')
            refetchLead()
        } catch {
            toast.error('Failed to save notes')
        } finally {
            setSavingNotes(false)
        }
    }

    if (loading && !lead) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        )
    }

    if (!loading && !lead) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <p className="text-lg font-medium text-foreground mb-2">Lead not found</p>
                    {onClose && <Button onClick={onClose}>Close</Button>}
                </div>
            </div>
        )
    }

    const tabs = [
        { id: 'overview',     label: 'Overview',    Icon: LayoutDashboard },
        { id: 'calls',        label: 'Calls',        Icon: Phone,        count: lead?.call_logs?.length },
        { id: 'tasks',        label: 'Tasks',        Icon: ClipboardList },
        { id: 'notes',        label: 'Notes',        Icon: FileText,     dot: !!lead?.notes },
        { id: 'timeline',     label: 'Timeline',     Icon: Activity },
        { id: 'site-visits',  label: 'Site Visits',  Icon: MapPin,       count: upcomingSiteVisitsCount || undefined },
        ...(canViewDeals ? [{ id: 'deals', label: 'Deals', Icon: Handshake, count: activeDealsCount || undefined }] : []),
    ]

    return (
        <div className={`flex flex-col md:flex-row gap-6 ${isModal ? 'h-[80vh]' : ''}`}>
            <div className={`w-full md:w-80 flex flex-col shrink-0 space-y-4 ${!isModal ? '' : 'overflow-y-auto'}`}>
                <LeadProfileSidebar
                    lead={lead}
                    project={projectData}
                    onEditProfile={() => setEditDialogOpen(true)}
                    onEditAvatar={() => setAvatarPickerOpen(true)}
                    upcomingVisit={nextUpcomingVisit}
                />
            </div>

            <div className={`flex-1 min-w-0 ${isModal ? 'overflow-y-auto' : ''}`}>
                {/* Tab Bar */}
                <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1 mb-6 w-fit flex-wrap">
                    {tabs.map(({ id, label, Icon, count, dot }) => {
                        const active = activeTab === id
                        return (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={cn(
                                    'relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 select-none',
                                    active
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                                )}
                            >
                                <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-primary' : '')} />
                                {label}
                                {count > 0 && (
                                    <span className={cn(
                                        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                                        active ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'
                                    )}>
                                        {count}
                                    </span>
                                )}
                                {dot && !count && (
                                    <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-primary' : 'bg-gray-400')} />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <LeadProfileOverview
                        lead={lead}
                        organization={organization}
                        onUpdate={refreshAll}
                        onViewAllTasks={() => setActiveTab('tasks')}
                        onViewAllDeals={() => setActiveTab('deals')}
                    />
                )}
                {activeTab === 'calls' && (
                    <LeadCallsTab callLogs={lead?.call_logs || []} />
                )}
                {activeTab === 'tasks' && (
                    <LeadTasksManager 
                        leadId={leadId} 
                        leadName={lead?.name} 
                        projectId={lead?.project_id}
                        projectName={projectData?.name}
                    />
                )}
                {activeTab === 'notes' && (
                    <LeadProfileNotes
                        notes={notes}
                        setNotes={setNotes}
                        onSave={handleSaveNotes}
                        isSaving={savingNotes}
                    />
                )}
                {activeTab === 'timeline' && (
                    <LeadActivityTimeline leadId={leadId} />
                )}
                {activeTab === 'site-visits' && (
                    <SiteVisitsTab leadId={leadId} lead={lead} />
                )}
                {activeTab === 'deals' && canViewDeals && (
                    <LeadDealsTab leadId={leadId} lead={lead} initialDeals={dealsData?.deals} />
                )}
            </div>

            <EditLeadProfileDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                lead={lead}
                onSave={refreshAll}
            />
            <AvatarPickerDialog
                open={avatarPickerOpen}
                onOpenChange={setAvatarPickerOpen}
                lead={lead}
                onSave={refreshAll}
            />
        </div>
    )
}
