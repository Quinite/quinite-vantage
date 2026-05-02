'use client'

import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, Settings } from 'lucide-react'
import PipelineBoard from '@/components/crm/PipelineBoard'
import ManageStagesSheet from '@/components/crm/ManageStagesSheet'
import { usePipelines } from '@/hooks/usePipelines'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, Suspense } from 'react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import LeadSourceDialog from '@/components/crm/LeadSourceDialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

function CrmPipelineContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const projectId = searchParams.get('project_id')
    const [isDealInitOpen, setIsDealInitOpen] = useState(false)
    const [manageStagesOpen, setManageStagesOpen] = useState(false)
    const [projects, setProjects] = useState([])
    const { data: pipelines = [], refetch: refetchPipelines } = usePipelines()
    const activePipeline = pipelines[0] ?? null
    const pipelineBoardRef = useRef(null)

    // Fetch projects for the dialog dropdown
    useEffect(() => {
        fetch('/api/projects').then(res => res.json()).then(data => {
            setProjects(data.projects || [])
        })
    }, [])



    return (
        <div className="min-h-screen bg-muted/5 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border bg-background sticky top-0 z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-0">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                            CRM Pipeline
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Track and manage your leads through the sales stages.</p>
                    </div>

                    <PermissionGate feature={['manage_crm_settings', 'view_settings']}>
                        <Button
                            onClick={() => setManageStagesOpen(true)}
                            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-sm h-10 px-4 transition-all w-full md:w-auto justify-center"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Manage Pipeline
                        </Button>
                    </PermissionGate>
                </div>

                {/* Filters removed to maximize pipeline view */}
            </div>

            {/* Pipeline Board */}
            <div className="flex-1 p-6 overflow-x-auto">
                <PipelineBoard
                    ref={pipelineBoardRef}
                    projectId={projectId}
                />
            </div>

            {/* Lead Source Dialog */}
            <LeadSourceDialog
                open={isDealInitOpen}
                onOpenChange={setIsDealInitOpen}
                projects={projects}
                initialProjectId={projectId}
            />

            {/* Manage Stages Sheet */}
            <ManageStagesSheet
                open={manageStagesOpen}
                onClose={() => setManageStagesOpen(false)}
                pipeline={activePipeline}
                onRefresh={refetchPipelines}
            />
        </div>
    )
}

export default function CrmPipelinePage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <CrmPipelineContent />
        </Suspense>
    )
}
