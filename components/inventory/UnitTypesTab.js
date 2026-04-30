'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Plus,
    Edit,
    Trash2,
    Copy,
    Layers,
    Home,
    Building2,
    Store,
    Briefcase,
    ShoppingBag,
    Factory,
    ConciergeBell,
    Package
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useInventory, useUnitConfigs } from '@/hooks/useInventory'
import { useQueryClient } from '@tanstack/react-query'
import ResidentialConfigForm from '@/components/projects/ResidentialConfigForm'
import { toast } from 'react-hot-toast'
import { formatINR } from '@/lib/inventory'
import { cn } from '@/lib/utils'

export default function UnitTypesTab({ projectId, project }) {
    const queryClient = useQueryClient()
    const {
        units = {},
        saveUnitConfig,
        deleteUnitConfig
    } = useInventory({
        projectId,
        organizationId: project?.organization_id
    })

    const { data: unitConfigs = [], isLoading } = useUnitConfigs(projectId)

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingConfig, setEditingConfig] = useState(null)
    const [configToDelete, setConfigToDelete] = useState(null)

    // Calculate actual counts for each config from the physical grid
    const unitCountsByConfigId = useMemo(() => {
        const allUnits = Object.values(units).flat()
        return allUnits.reduce((acc, unit) => {
            const configId = unit.config_id
            if (configId) {
                acc[configId] = (acc[configId] || 0) + 1
            }
            return acc
        }, {})
    }, [units])

    const handleSave = async (configData) => {
        try {
            // Clean numeric fields: database expects numbers or null, not ""
            const numericFields = ['base_price', 'carpet_area', 'built_up_area', 'super_built_up_area', 'plot_area']
            const cleanedData = { ...configData }

            numericFields.forEach(field => {
                if (cleanedData[field] === '') {
                    cleanedData[field] = null
                } else if (cleanedData[field] !== undefined && cleanedData[field] !== null) {
                    cleanedData[field] = Number(cleanedData[field])
                }
            })

            await saveUnitConfig({
                ...cleanedData,
                id: editingConfig?.id,
                project_id: projectId,
                organization_id: project?.organization_id
            })
            setIsFormOpen(false)
            setEditingConfig(null)
            toast.success(editingConfig ? 'Configuration updated' : 'Configuration added')
        } catch (error) {
            console.error('Save unit type error:', error)
            toast.error('Failed to save configuration')
        }
    }

    const handleDuplicate = async (config) => {
        try {
            const { id, created_at, created_by, updated_at, updated_by, ...rest } = config
            await saveUnitConfig({
                ...rest,
                project_id: projectId,
                organization_id: project?.organization_id
            })
            toast.success('Configuration duplicated')
        } catch (error) {
            console.error('Duplicate error:', error)
            toast.error('Failed to duplicate configuration')
        }
    }

    const handleDelete = async (config) => {
        const usageCount = unitCountsByConfigId[config.id] || 0

        if (usageCount > 0) {
            toast.error(`Cannot delete: ${usageCount} units of this type are already placed on the floor plan.`)
            return
        }

        setConfigToDelete(config)
    }

    const confirmDelete = async () => {
        if (!configToDelete) return
        try {
            await deleteUnitConfig(configToDelete.id)
            setConfigToDelete(null)
        } catch (error) {
            console.error('Delete error:', error)
            toast.error('Failed to delete configuration')
        }
    }

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

    if (isLoading) {
        return <div className="p-10 flex justify-center"><Plus className="w-8 h-8 animate-spin text-slate-200" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Unit Configurations</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Define common property layouts for this project to use in the visual grid.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditingConfig(null)
                        setIsFormOpen(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" /> New Configuration
                </Button>
            </div>

            {unitConfigs.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-slate-50/50">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Layers className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900">No Unit Configs Defined</h4>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                        Start by adding the different types of units available in this project (e.g., 3BHK Flat, Office Space).
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => setIsFormOpen(true)}
                        className="mt-6"
                    >
                        Create First Config
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {unitConfigs.map((config) => {
                        const Icon = getIcon(config.property_type)
                        const placedCount = unitCountsByConfigId[config.id] || 0

                        return (
                            <div key={config.id} className="group relative border border-slate-200 rounded-xl p-3.5 bg-white hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between overflow-hidden">
                                {/* Action Buttons (Top Right Hover) */}
                                <div className="absolute top-3 right-3 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                        onClick={() => {
                                            setEditingConfig(config)
                                            setIsFormOpen(true)
                                        }}
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50"
                                        onClick={() => handleDuplicate(config)}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDelete(config)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                <div className="mb-4 flex gap-3">
                                    <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                        <Icon className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                                {config.config_name || config.configuration || config.property_type || config.type || 'Standard'}
                                            </h4>
                                        </div>
                                        <p className="text-xs font-semibold text-slate-400 capitalize tracking-wide truncate">
                                            {(config.category || 'Residential')} • {(config.property_type || config.type || 'Apartment')}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3 h-full">
                                    {config.carpet_area > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-medium text-xs">Carpet Area</span>
                                            <span className="font-semibold text-xs text-slate-700">{config.carpet_area} sq.ft.</span>
                                        </div>
                                    )}
                                    {config.plot_area > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-medium text-xs">Plot Area</span>
                                            <span className="font-semibold text-xs text-slate-700">{config.plot_area} sq.ft.</span>
                                        </div>
                                    )}

                                    {(config.base_price > 0 || config.price > 0) && (
                                        <div className="pt-2 mt-2 border-t border-slate-200">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground font-medium text-xs">Base Price</span>
                                                <span className="font-black text-blue-600 text-xs">{formatINR(config.base_price || config.price)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Repositioned Badges Row */}
                                <div className="flex items-center gap-2 mt-auto">

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 cursor-default transition-colors hover:bg-indigo-100">
                                                    <span className="text-[10px] font-bold text-indigo-700">{placedCount} Units</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">Placed Units</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <Badge variant="outlined" className="text-[9px] bg-slate-50 uppercase tracking-widest font-bold">
                                        {config.transaction_type || 'Sell'}
                                    </Badge>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Dialog open={isFormOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsFormOpen(false)
                    setEditingConfig(null)
                }
            }}>
                <DialogContent className="max-w-xl p-0 overflow-hidden border border-slate-200 rounded-3xl shadow-2xl">
                    <div className="p-6">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl font-bold text-slate-900">
                                {editingConfig ? 'Edit Configuration' : 'New Configuration'}
                            </DialogTitle>
                        </DialogHeader>

                        <ResidentialConfigForm
                            onCancel={() => {
                                setIsFormOpen(false)
                                setEditingConfig(null)
                            }}
                            onAdd={handleSave}
                            category={(project?.unit_configs?.[0]?.category) || 'residential'}
                            initialData={editingConfig}
                            unitsPlacedCount={editingConfig ? (unitCountsByConfigId[editingConfig.id] || 0) : 0}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!configToDelete} onOpenChange={(open) => !open && setConfigToDelete(null)}>
                <AlertDialogContent className="rounded-3xl border-slate-100 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-slate-900">Remove Configuration?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500">
                            This will permanently remove <span className="font-bold text-slate-900">{configToDelete?.config_name || configToDelete?.property_type}</span>. This configuration won't be available for future unit placements.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-slate-200 text-slate-500 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDelete}
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
