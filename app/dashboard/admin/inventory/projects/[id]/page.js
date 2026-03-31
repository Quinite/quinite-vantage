'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Building2, Package, BarChart3, Edit, Layers } from 'lucide-react'
import { toast } from 'react-hot-toast'
import ProjectMetrics from '@/components/projects/ProjectMetrics'
import ProjectInventoryTab from '@/components/projects/ProjectInventoryTab'
import VisualUnitGrid from '@/components/inventory/VisualUnitGrid'
import UnitTypesTab from '@/components/inventory/UnitTypesTab'

import { useQueryClient } from '@tanstack/react-query'
import { useInventoryProject } from '@/hooks/useInventory'

import { useAuth } from '@/contexts/AuthContext'

export default function InventoryProjectDetailsPage() {
    const { profile } = useAuth()
    const organizationId = profile?.organization_id
    const router = useRouter()
    const params = useParams()
    const projectId = params.id
    const queryClient = useQueryClient()


    // 1. Fetch project with React Query (Hydrates instantly if hovered)
    const { data: project, isLoading: loading, refetch: fetchProject } = useInventoryProject(projectId)
    


    const handleMetricsUpdate = (updatedMetrics) => {
        // Invalidate both project and properties to refresh everything in sync
        queryClient.invalidateQueries({ queryKey: ['inventory-project', projectId] })
        queryClient.invalidateQueries({ queryKey: ['inventory-properties', projectId] })
        queryClient.invalidateQueries({ queryKey: ['inventory-projects'] }) // Refresh overview stats too
    }

    const handleProjectUpdated = (updatedProject) => {
        queryClient.invalidateQueries({ queryKey: ['inventory-project', projectId] })
        queryClient.invalidateQueries({ queryKey: ['inventory-projects'] })
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
                <Button onClick={() => router.push('/dashboard/admin/inventory')}>
                    Back to Inventory
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
                    onClick={() => router.push('/dashboard/admin/inventory')}
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
                <TabsList className="grid w-full max-w-xl grid-cols-4 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="properties" className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        List View
                    </TabsTrigger>
                    <TabsTrigger value="visual" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Visual View
                    </TabsTrigger>
                    <TabsTrigger value="configs" className="flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl">
                        <Layers className="w-4 h-4" />
                        Unit Configs
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
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                                    <p className="text-sm text-foreground">{project.description}</p>
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
                                                        ₹{unitType.price.toLocaleString('en-IN')}
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

                {/* Properties Tab */}
                <TabsContent value="properties">
                    <ProjectInventoryTab
                        projectId={projectId}
                        project={project}
                        onMetricsUpdate={handleMetricsUpdate}
                    />
                </TabsContent>

                <TabsContent value="visual">
                    <Card className="p-6">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-1">Visual Inventory</h3>
                            <p className="text-sm text-muted-foreground">Click on any unit to update its status.</p>
                        </div>
                        <VisualUnitGrid
                            projectId={projectId}
                            project={project}
                            organizationId={organizationId}
                        />
                    </Card>
                </TabsContent>

                <TabsContent value="configs">
                    <Card className="p-6 bg-white shadow-sm border-slate-200">
                        <UnitTypesTab 
                            projectId={projectId}
                            project={project}
                        />
                    </Card>
                </TabsContent>
            </Tabs>

        </div>
    )
}

