'use client'

import { UnitsView } from '@/components/inventory/UnitsView'

export default function UnitsPage() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-border bg-background shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">All Units</h1>
                    <p className="text-sm text-slate-500 mt-1">Browse and filter all inventory units across all projects.</p>
                </div>
            </div>

            {/* Units View */}
            <div className="flex-1 overflow-hidden">
                <UnitsView />
            </div>
        </div>
    )
}
