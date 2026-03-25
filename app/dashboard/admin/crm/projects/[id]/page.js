'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building2, Megaphone, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils/currency'
import ProjectMetrics from '@/components/projects/ProjectMetrics'
import ProjectInventoryTab from '@/components/projects/ProjectInventoryTab'

export default function ProjectDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const projectId = params.id

    const [project, setProject] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showFullDesc, setShowFullDesc] = useState(false)

    useEffect(() => {
        fetchProject()
    }, [projectId])

    const fetchProject = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/projects/${projectId}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch project')
            }

            setProject(data.project)
        } catch (error) {
            console.error('Fetch project error:', error)
            toast.error('Failed to load project details')
        } finally {
            setLoading(false)
        }
    }

    const handleMetricsUpdate = (updatedMetrics) => {
        // Update project metrics when property status changes
        setProject(prev => ({
            ...prev,
            ...updatedMetrics
        }))
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Project Not Found</h3>
                <p className="text-sm text-muted-foreground mb-4">The project you're looking for doesn't exist</p>
                <Button onClick={() => router.push('/dashboard/admin/crm/projects')}>
                    Back to Projects
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/dashboard/admin/crm/projects')}
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                    {project.address && (
                        <p className="text-sm text-muted-foreground mt-1">{project.address}</p>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full max-w-lg grid-cols-3">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="campaigns"
                        className="flex items-center gap-2"
                        onClick={() => router.push(`/dashboard/admin/crm/campaigns?project_id=${projectId}`)}
                    >
                        <Megaphone className="w-4 h-4" />
                        Campaigns
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Inventory
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Project Details */}
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Project Details</h3>
                            {project.description && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-muted-foreground mb-1.5">About This Project</p>
                                    <div className="text-sm text-foreground leading-relaxed">
                                        {project.description.length > 300 && !showFullDesc ? (
                                            <>
                                                {project.description.substring(0, 300)}...
                                                <button
                                                    onClick={() => setShowFullDesc(true)}
                                                    className="text-primary font-medium hover:underline ml-1 inline-flex items-center gap-0.5"
                                                >
                                                    Read more <ChevronDown className="w-3 h-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {project.description}
                                                {project.description.length > 300 && (
                                                    <button
                                                        onClick={() => setShowFullDesc(false)}
                                                        className="text-primary font-medium hover:underline ml-2 inline-flex items-center gap-0.5"
                                                    >
                                                        Show less <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            {project.project_status && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                                    <Badge variant="outline" className="capitalize">
                                        {project.project_status.replace('_', ' ')}
                                    </Badge>
                                </div>
                            )}
                            {project.real_estate?.property?.category && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Property Category</p>
                                    <Badge variant="secondary" className="capitalize">
                                        {project.real_estate.property.category === 'residential' && '🏠 Residential'}
                                        {project.real_estate.property.category === 'commercial' && '🏢 Commercial'}
                                        {project.real_estate.property.category === 'land' && '🌳 Land'}
                                    </Badge>
                                </div>
                            )}

                            {/* Dates */}
                            {(['planning', 'under_construction'].includes(project.project_status) || project.project_status === 'draft') && (project.possession_date || project.real_estate?.possession_date) && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Expected Possession</p>
                                    <p className="text-sm font-semibold text-slate-900 border-l-2 border-blue-500 pl-2">
                                        {new Date(project.possession_date || project.real_estate.possession_date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            )}
                            {['ready_to_move', 'completed'].includes(project.project_status) && (project.completion_date || project.real_estate?.completion_date) && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Completion Date</p>
                                    <p className="text-sm font-semibold text-slate-900 border-l-2 border-green-500 pl-2">
                                        {new Date(project.completion_date || project.real_estate.completion_date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            )}
                        </Card>

                        {/* Location Details */}
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Location Details</h3>
                            {project.real_estate?.location?.city && (
                                <div className="mb-3">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">City</p>
                                    <p className="text-sm text-foreground">{project.real_estate.location.city}</p>
                                </div>
                            )}
                            {project.real_estate?.location?.locality && (
                                <div className="mb-3">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Locality</p>
                                    <p className="text-sm text-foreground">{project.real_estate.location.locality}</p>
                                </div>
                            )}
                            {project.real_estate?.location?.landmark && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Landmark</p>
                                    <p className="text-sm text-foreground">{project.real_estate.location.landmark}</p>
                                </div>
                            )}
                            {!project.real_estate?.location && project.address && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Address</p>
                                    <p className="text-sm text-foreground">{project.address}</p>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Unit Configurations */}
                    {project.unit_types && project.unit_types.length > 0 && (
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Unit Configurations</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {project.unit_types.map((unitType, idx) => (
                                    <div key={idx} className="border rounded-lg p-4 bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-semibold text-foreground">
                                                    {unitType.configuration || unitType.property_type}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {unitType.property_type && unitType.configuration && `${unitType.property_type}`}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {unitType.transaction_type || 'Sell'}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            {unitType.carpet_area && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Area</p>
                                                    <p className="font-medium">{unitType.carpet_area} sqft</p>
                                                </div>
                                            )}
                                            {unitType.count && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Units</p>
                                                    <p className="font-medium">{unitType.count} units</p>
                                                </div>
                                            )}
                                            {unitType.price && unitType.price > 0 && (
                                                <div className="col-span-2">
                                                    <p className="text-xs text-muted-foreground">Price</p>
                                                    <p className="font-bold text-green-600">
                                                        {formatCurrency(unitType.price)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Project Metrics */}
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Inventory Metrics</h3>
                        <ProjectMetrics project={project} />
                    </div>
                </TabsContent>

                {/* Campaigns Tab - handled via router.push above */}

                {/* Inventory Tab */}
                <TabsContent value="inventory">
                    <ProjectInventoryTab
                        projectId={projectId}
                        onMetricsUpdate={handleMetricsUpdate}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
