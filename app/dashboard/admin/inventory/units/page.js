'use client'

import { UnitsView } from '@/components/inventory/UnitsView'

export default function UnitsPage() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col gap-2 p-6 border-b border-border bg-background shrink-0">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">All Units</h1>
                <p className="text-muted-foreground text-sm">Browse and filter all inventory units</p>
            </div>

            {/* Units View */}
            <div className="flex-1 overflow-hidden">
                <UnitsView />
            </div>
        </div>
    )
}
