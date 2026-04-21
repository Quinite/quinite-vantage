'use client'

import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, ArrowLeft, Megaphone, Lock } from 'lucide-react'
import PipelineBoard from '@/components/crm/PipelineBoard'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import LeadSourceDialog from '@/components/crm/LeadSourceDialog'
import { Skeleton } from '@/components/ui/skeleton'

export default function CampaignPipelinePage() {
    const params = useParams()
    const router = useRouter()
    const campaignId = params.id

    // State
    const canCreate = usePermission('create_leads')
    const [campaign, setCampaign] = useState(null)
    const [project, setProject] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isDealInitOpen, setIsDealInitOpen] = useState(false)
    const pipelineBoardRef = useRef(null)

    // Fetch Campaign Details to get Project ID
    useEffect(() => {
        if (!campaignId) return

        async function fetchDetails() {
            try {
                setLoading(true)
                // 1. Fetch Campaign
                // We'll use the list API and find it, or a single endpoint if available.
                // The list endpoint supports ?project_id, but here we only have campaign_id.
                // Let's assume we can fetch all or filter client side, OR there is a generic fetch.
                // Actually `app/api/campaigns` returns all if no filter.

                // Optimization: In a real app we'd have GET /api/campaigns/:id.
                // Let's check if there is a get by ID or just use global list.
                // Based on `start/route.js`, GET /api/campaigns exists.

                const res = await fetch('/api/campaigns')
                const data = await res.json()
                const foundCampaign = data.campaigns?.find(c => c.id === campaignId)

                if (foundCampaign) {
                    setCampaign(foundCampaign)

                    // 2. Fetch Project (for name context)
                    if (foundCampaign.project_id) {
                        const pRes = await fetch(`/api/projects?id=${foundCampaign.project_id}`)
                        const pData = await pRes.json()
                        const foundProject = pData.projects?.find(p => p.id === foundCampaign.project_id)
                        if (foundProject) setProject(foundProject)
                    }
                }
            } catch (error) {
                console.error("Failed to load campaign details", error)
            } finally {
                setLoading(false)
            }
        }

        fetchDetails()
    }, [campaignId])

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/5 p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-64" />
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-[500px] w-[300px] rounded-xl" />)}
                </div>
            </div>
        )
    }

    if (!campaign) {
        return (
            <div className="min-h-screen bg-muted/5 flex flex-col items-center justify-center">
                <p className="text-muted-foreground">Campaign not found</p>
                <Button variant="link" onClick={() => router.push('/dashboard/admin/crm/campaigns')}>
                    Back to Campaigns
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/5">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-6 border-b border-border bg-background shadow-sm">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mb-2 pl-0 -ml-2 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push('/dashboard/admin/crm/campaigns')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Campaigns
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Megaphone className="w-7 h-7 text-foreground" />
                        {campaign.name} Pipeline
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-muted-foreground text-sm">
                            Showing leads enrolled in this campaign
                            {project?.name ? <span> · <strong>{project.name}</strong></span> : null}
                        </p>
                        {campaign.status && (
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                campaign.status === 'running' ? 'bg-green-100 text-green-700' :
                                campaign.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                                'bg-muted text-muted-foreground'
                            }`}>{campaign.status}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => {
                            pipelineBoardRef.current?.refresh()
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-2 h-9 border-dashed"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Sync
                    </Button>



                    <PermissionTooltip
                        hasPermission={canCreate}
                        message="You need 'Create Leads' permission to create new deals."
                    >
                        <Button
                            onClick={() => {
                                if (!canCreate) return
                                setIsDealInitOpen(true)
                            }}
                            className="gap-2 h-9 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                            size="sm"
                            disabled={!canCreate}
                        >
                            {!canCreate ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            New Deal
                        </Button>
                    </PermissionTooltip>
                </div>
            </div>

            {/* Board — filtered to enrolled leads only via campaign_id */}
            <div className="p-6">
                <PipelineBoard ref={pipelineBoardRef} campaignId={campaignId} />
            </div>

            <LeadSourceDialog
                open={isDealInitOpen}
                onOpenChange={setIsDealInitOpen}
                projectId={campaign.project_id}
                projects={project ? [project] : []}
            />
        </div >
    )
}
