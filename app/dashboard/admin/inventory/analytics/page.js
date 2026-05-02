'use client'

import { useInventoryProjects, useInventoryUnits } from '@/hooks/useInventory'
import { AnalyticsView } from '@/components/inventory/AnalyticsView'
import { PermissionGate } from '@/components/permissions/PermissionGate'

export default function AnalyticsPage() {
    const { data: units    = [], isLoading: unitsLoading  } = useInventoryUnits()
    const { data: projects = [], isLoading: projectsLoading } = useInventoryProjects()

    const loading = unitsLoading || projectsLoading

    if (loading) {
        return (
            <div className="p-6 space-y-5 animate-pulse">
                <div className="space-y-2">
                    <div className="h-7 w-40 bg-slate-100 rounded-lg" />
                    <div className="h-4 w-72 bg-slate-100 rounded" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 h-64 bg-slate-100 rounded-xl" />
                    <div className="h-64 bg-slate-100 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="h-56 bg-slate-100 rounded-xl" />
                    <div className="h-56 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-64 bg-slate-100 rounded-xl" />
            </div>
        )
    }

    return (
        <PermissionGate
            feature="view_inventory"
            fallbackMessage="You do not have permission to view inventory analytics."
        >
            <div className="animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 pt-6 pb-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Inventory Analytics</h1>
                        <p className="text-sm md:text-base text-slate-500 mt-1">
                            Revenue intelligence, conversion rates, and portfolio performance
                        </p>
                    </div>
                </div>
                <AnalyticsView units={units} projects={projects} />
            </div>
        </PermissionGate>
    )
}
