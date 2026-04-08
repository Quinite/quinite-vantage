'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-hot-toast'

import LeadActivityTimeline from '@/components/crm/LeadActivityTimeline'
import EditLeadProfileDialog from '@/components/crm/EditLeadProfileDialog'
import LinkUnitDialog from '@/components/crm/LinkUnitDialog'
import AvatarPickerDialog from '@/components/crm/AvatarPickerDialog'

// New sub-components
import LeadProfileSidebar from '@/components/crm/LeadProfileSidebar'
import LeadProfileOverview from '@/components/crm/LeadProfileOverview'
import LeadProfileNotes from '@/components/crm/LeadProfileNotes'
import LeadProfileEmails from '@/components/crm/LeadProfileEmails'
import LeadTasksManager from '@/components/crm/LeadTasksManager'

// Parallel Hooks
import { useLead, useLeadProfile } from '@/hooks/useLeads'
import { useOrgSettings } from '@/hooks/usePipelines'

export default function LeadProfileView({ leadId, onClose, isModal = false }) {
    // 1. Parallel Data Fetching (Hydrates instantly if hovered earlier)
    const { data: lead, isLoading: leadLoading, refetch: refetchLead } = useLead(leadId)
    const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useLeadProfile(leadId)
    const { data: organization } = useOrgSettings()

    const loading = leadLoading || profileLoading
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
        refetchProfile()
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
    if (loading && (!lead || !profile)) {
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

    // 3. Not Found State (Only if NOT loading and data is missing)
    if (!loading && (!lead || !profile)) {
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
                    profile={profile}
                    onEditProfile={() => setEditDialogOpen(true)}
                    onEditAvatar={() => setAvatarPickerOpen(true)}
                />
            </div>

            <div className={`flex-1 min-w-0 ${isModal ? 'overflow-y-auto' : ''}`}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="border-b bg-transparent mb-6">
                        <TabsList className="h-auto w-full justify-start bg-transparent p-0 space-x-8">
                            {['overview', 'tasks', 'notes', 'emails', 'timeline'].map(tab => (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:text-primary !bg-transparent !shadow-none font-medium capitalize text-muted-foreground transition-colors"
                                >
                                    {tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {activeTab === 'overview' && (
                        <LeadProfileOverview
                            lead={lead}
                            profile={profile}
                            organization={organization}
                            onUpdate={refreshAll}
                            onLinkUnit={() => setLinkDialogOpen(true)}
                            onUnlinkUnit={handleUnlink}
                        />
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

                    {activeTab === 'emails' && <LeadProfileEmails />}

                    {activeTab === 'timeline' && (
                        <div className="max-w-3xl">
                            <LeadActivityTimeline leadId={leadId} />
                        </div>
                    )}
                </Tabs>
            </div>

            <EditLeadProfileDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                lead={lead}
                profile={profile}
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
