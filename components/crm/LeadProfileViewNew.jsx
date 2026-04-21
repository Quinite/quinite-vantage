'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-hot-toast'
import { LayoutDashboard, Phone, ClipboardList, FileText, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

import LeadActivityTimeline from '@/components/crm/LeadActivityTimeline'
import EditLeadProfileDialog from '@/components/crm/EditLeadProfileDialog'
import LinkUnitDialog from '@/components/crm/LinkUnitDialog'
import AvatarPickerDialog from '@/components/crm/AvatarPickerDialog'

// New sub-components
import LeadProfileSidebar from '@/components/crm/LeadProfileSidebar'
import LeadProfileOverview from '@/components/crm/LeadProfileOverview'
import LeadProfileNotes from '@/components/crm/LeadProfileNotes'
import LeadTasksManager from '@/components/crm/LeadTasksManager'
import LeadCallsTab from '@/components/crm/LeadCallsTab'

// Parallel Hooks
import { useLead, useLeadTasks, useLeadInteractions } from '@/hooks/useLeads'
import { useOrgSettings } from '@/hooks/usePipelines'

export default function LeadProfileView({ leadId, onClose, isModal = false }) {
    // 1. Data Fetching (Hydrates instantly if hovered earlier)
    const { data: lead, isLoading: leadLoading, refetch: refetchLead } = useLead(leadId)
    const { data: organization } = useOrgSettings()
    
    // Background pre-fetching for other tabs to ensure instant switching
    useLeadTasks(leadId)
    useLeadInteractions(leadId)

    const loading = leadLoading
    const [activeTab, setActiveTab] = useState('overview')
    const [notes, setNotes] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [linkDialogOpen, setLinkDialogOpen] = useState(false)
    const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)

    // Sync notes when data arrives
    useEffect(() => {
        if (lead?.notes) setNotes(lead.notes)
    }, [lead?.notes])

    const refreshAll = () => {
        refetchLead()
    }

    const handleUnlink = async () => {
        if (!confirm('Are you sure you want to unlink this unit?')) return
        try {
            const res = await fetch(`/api/leads/${leadId}/unlink-unit`, { method: 'POST' })
            if (!res.ok) throw new Error('Failed to unlink unit')
            toast.success('Unit unlinked')
            refreshAll()
        } catch (error) {
            toast.error('Failed to unlink unit')
        }
    }

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
        } catch (error) {
            toast.error('Failed to save notes')
        } finally {
            setSavingNotes(false)
        }
    }

    // 2. Loading State (Show skeleton if either is loading and we don't have data yet)
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

    // 3. Not Found State (Only if NOT loading and lead is missing)
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

    return (
        <div className={`flex flex-col md:flex-row gap-6 ${isModal ? 'h-[80vh]' : ''}`}>
            <div className={`w-full md:w-80 flex flex-col shrink-0 space-y-4 ${!isModal ? '' : 'overflow-y-auto'}`}>
                <LeadProfileSidebar
                    lead={lead}
                    onEditProfile={() => setEditDialogOpen(true)}
                    onEditAvatar={() => setAvatarPickerOpen(true)}
                />
            </div>

            <div className={`flex-1 min-w-0 ${isModal ? 'overflow-y-auto' : ''}`}>
                {/* Tab Bar */}
                <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1 mb-6 w-fit">
                    {[
                        { id: 'overview',  label: 'Overview',  Icon: LayoutDashboard },
                        { id: 'calls',     label: 'Calls',     Icon: Phone,          count: lead?.call_logs?.length },
                        { id: 'tasks',     label: 'Tasks',     Icon: ClipboardList   },
                        { id: 'notes',     label: 'Notes',     Icon: FileText,       dot: !!lead?.notes },
                        { id: 'timeline',  label: 'Timeline',  Icon: Activity        },
                    ].map(({ id, label, Icon, count, dot }) => {
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
                        onLinkUnit={() => setLinkDialogOpen(true)}
                        onUnlinkUnit={handleUnlink}
                        onViewAllTasks={() => setActiveTab('tasks')}
                    />
                )}
                {activeTab === 'calls' && (
                    <LeadCallsTab callLogs={lead?.call_logs || []} />
                )}
                {activeTab === 'tasks' && (
                    <LeadTasksManager leadId={leadId} />
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

            <LinkUnitDialog
                lead={lead}
                isOpen={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                onLinkSuccess={() => {
                    refreshAll()
                    toast.success('Unit linked successfully')
                }}
            />
        </div>
    )
}
