'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeft, Building2, Package, BarChart3, Edit, Layers, Home, Store, Briefcase, ShoppingBag, Factory, ConciergeBell, Sparkles } from 'lucide-react'
import AmenitiesDisplay from '@/components/amenities/AmenitiesDisplay'
import { toast } from 'react-hot-toast'
import ProjectMetrics from '@/components/projects/ProjectMetrics'
import ProjectInventoryTab from '@/components/projects/ProjectInventoryTab'
import VisualUnitGrid from '@/components/inventory/VisualUnitGrid'
import UnitTypesTab from '@/components/inventory/UnitTypesTab'

import { formatINR } from '@/lib/inventory'
import { useQueryClient } from '@tanstack/react-query'
import { useInventoryProject, useInventoryUnits } from '@/hooks/useInventory'

import { useAuth } from '@/contexts/AuthContext'

const ShowMoreText = ({ text, maxLength = 150 }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    if (!text) return null
    if (text.length <= maxLength) return <p className="text-sm text-foreground leading-relaxed">{text}</p>
    return (
        <div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {isExpanded ? text : `${text.slice(0, maxLength)}...`}
            </p>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-blue-600 font-medium hover:underline mt-1 focus:outline-none"
            >
                {isExpanded ? 'Show less' : 'Show more'}
            </button>
        </div>
    )
}

export default function InventoryProjectDetailsPage() {
    const { profile } = useAuth()
    const organizationId = profile?.organization_id
    const router = useRouter()
    const params = useParams()
    const projectId = params.id
    const queryClient = useQueryClient()

    const getIcon = (type) => {
        const icons = {
            'Apartment': Building2,
            'Villa': Home,
            'Villa Bungalow': Home,
            'Penthouse': ConciergeBell,
            'Office': Briefcase,
            'Retail': ShoppingBag,
            'Showroom': Store,
            'Industrial': Factory,
            'Plot': Home,
            'Land': Building2
        }
        return icons[type] || Building2
    }


    // 1. Fetch project with React Query (Hydrates instantly if hovered)
    const { data: project, isLoading: loading, refetch: fetchProject } = useInventoryProject(projectId)
    const { data: units = [] } = useInventoryUnits(projectId)



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
                    <TabsTrigger value="overview" className="flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl">
                        <BarChart3 className="w-4 h-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="properties" className="flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl">
                        <Package className="w-4 h-4" />
                        List View
                    </TabsTrigger>
                    <TabsTrigger value="visual" className="flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl">
                        <Building2 className="w-4 h-4" />
                        Visual View
                    </TabsTrigger>
                    <TabsTrigger value="configs" className="flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl">
                        <Layers className="w-4 h-4" />
                        Unit Configs
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-300">
                    {/* Project Metrics at the top */}
                    <div className="my-6">
                        <ProjectMetrics project={project} />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Project Details */}
                        <Card className="p-6 border-slate-200/60 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-5">Project Details</h3>

                            <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Status</p>
                                    <Badge variant="outline" className="capitalize font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                                        {project.project_status?.replace('_', ' ') || 'Active'}
                                    </Badge>
                                </div>

                                {project.rera_number && (
                                    <div className="col-span-2 md:col-span-1">
                                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1.5">RERA No.</p>
                                        <p className="text-sm font-semibold text-slate-800">{project.rera_number}</p>
                                    </div>
                                )}

                                {project.possession_date && (
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Possession Date</p>
                                        <p className="text-sm font-medium text-slate-800">
                                            {new Date(project.possession_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                )}

                                {project.completion_date && (
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Completion Date</p>
                                        <p className="text-sm font-medium text-slate-800">
                                            {new Date(project.completion_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {project.description && (
                                <div className="pt-5 border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Description</p>
                                    <ShowMoreText text={project.description} maxLength={200} />
                                </div>
                            )}
                        </Card>

                        {/* Location Details */}
                        <Card className="p-6 border-slate-200/60 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-slate-400" />
                                Location Details
                            </h3>

                            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                {project.city && (
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">City</p>
                                        <p className="text-sm font-medium text-slate-800">{project.city}</p>
                                    </div>
                                )}
                                {project.state && (
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">State</p>
                                        <p className="text-sm font-medium text-slate-800">{project.state}</p>
                                    </div>
                                )}
                                {project.country && (
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Country</p>
                                        <p className="text-sm font-medium text-slate-800">{project.country}</p>
                                    </div>
                                )}
                                {project.pincode && (
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Pincode</p>
                                        <p className="text-sm font-medium text-slate-800">{project.pincode}</p>
                                    </div>
                                )}
                                {project.locality && (
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Locality</p>
                                        <p className="text-sm font-medium text-slate-800">{project.locality}</p>
                                    </div>
                                )}
                                {project.landmark && (
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Landmark</p>
                                        <p className="text-sm font-medium text-slate-800">{project.landmark}</p>
                                    </div>
                                )}
                            </div>

                            {/* Fallback to legacy address */}
                            {!project.city && project.address && (
                                <div className="mt-5 pt-5 border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Full Address</p>
                                    <p className="text-sm font-medium text-slate-800">{project.address}</p>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Unit Configurations */}
                    {project.unit_configs && project.unit_configs.length > 0 && (
                        <Card className="p-6 border-slate-200/60 shadow-sm mt-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-5">Unit Configurations</h3>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {project.unit_configs.map((config, idx) => {
                                    const Icon = getIcon(config.property_type || config.type)
                                    return (
                                        <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-white hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between group">
                                            <div className="mb-4 flex gap-3">
                                                <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                                    <Icon className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                                            {config.config_name || config.configuration || config.property_type || config.type || 'Standard'}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5 cursor-default transition-colors hover:bg-indigo-100">
                                                                            <span className="text-[10px] font-bold text-indigo-700">{config.id ? units.filter(u => u.config_id === config.id).length : (config.count || 0)} Units</span>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-xs">Created Units</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <Badge variant="outline" className="text-[9px] bg-slate-50 uppercase tracking-widest font-bold">
                                                                {config.transaction_type || 'Sell'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-400 capitalize tracking-wide truncate">
                                                        {(config.category || 'Residential')} • {(config.property_type || config.type || 'Apartment')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                {config.carpet_area > 0 && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground font-medium text-xs">Carpet Area</span>
                                                        <span className="font-semibold text-sm text-slate-700">{config.carpet_area} sq.ft.</span>
                                                    </div>
                                                )}
                                                {(config.built_up_area > 0 || config.builtup_area > 0) && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground font-medium text-xs">Built-up Area</span>
                                                        <span className="font-semibold text-sm text-slate-700">{config.built_up_area || config.builtup_area} sq.ft.</span>
                                                    </div>
                                                )}
                                                {(config.super_built_up_area > 0 || config.super_builtup_area > 0) && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground font-medium text-xs">Super Built-up</span>
                                                        <span className="font-semibold text-sm text-slate-700">{config.super_built_up_area || config.super_builtup_area} sq.ft.</span>
                                                    </div>
                                                )}
                                                {config.plot_area > 0 && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground font-medium text-xs">Plot Area</span>
                                                        <span className="font-semibold text-sm text-slate-700">{config.plot_area} sq.ft.</span>
                                                    </div>
                                                )}

                                                {(config.base_price > 0 || config.price > 0) && (
                                                    <div className="pt-2 mt-2 border-t border-slate-200">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-muted-foreground font-medium text-xs">Base Price</span>
                                                            <span className="font-black text-blue-600 text-sm">{formatINR(config.base_price || config.price)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Unit config amenities */}
                                                {config.amenities?.length > 0 && (
                                                    <div className="pt-2 mt-1">
                                                        <AmenitiesDisplay
                                                            amenityIds={config.amenities}
                                                            context="unit"
                                                            variant="tags"
                                                            maxVisible={4}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Society Amenities */}
                    {project.amenities?.length > 0 && (
                        <Card className="p-6 border-slate-200/60 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                Society Amenities
                                <span className="text-sm font-normal text-slate-400 ml-1">({project.amenities.length})</span>
                            </h3>
                            <AmenitiesDisplay
                                amenityIds={project.amenities}
                                context="project"
                                variant="grid"
                            />
                        </Card>
                    )}
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

