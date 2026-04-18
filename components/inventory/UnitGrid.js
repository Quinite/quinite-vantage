'use client'

import { UnitCard } from './UnitCard'
import { Building } from 'lucide-react'

export function UnitGrid({ units }) {
    if (!units || units.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed border-border text-center">
                <div className="p-4 rounded-full bg-secondary/50 mb-4">
                    <Building className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No Units Found</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                    Add your first unit listing to get started monitoring inventory.
                </p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {units.map(unit => (
                <UnitCard key={unit.id} unit={unit} />
            ))}
        </div>
    )
}
