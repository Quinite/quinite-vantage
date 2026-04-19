'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrainCircuit } from 'lucide-react'

export default function AiInsightsCard({ lead }) {
    const painPoints = Array.isArray(lead?.pain_points) ? lead.pain_points.filter(Boolean) : []

    if (painPoints.length === 0) return null

    return (
        <Card className="border-0 shadow-sm ring-1 ring-gray-200 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100 mb-2 bg-gradient-to-r from-violet-50/50 to-transparent">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-100 text-violet-700 rounded-lg shadow-sm">
                        <BrainCircuit className="w-4 h-4" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-gray-900">AI Insights</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Extracted from calls</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
                <div>
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2">
                        Pain Points
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {painPoints.map((point, i) => (
                            <span
                                key={i}
                                className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200"
                            >
                                {point}
                            </span>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
