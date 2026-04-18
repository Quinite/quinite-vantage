'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, CheckCircle2, Clock, TrendingUp, Home } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

import { formatCurrency } from '@/lib/utils/currency'

export default function ProjectMetrics({ project, unitConfigs = [] }) {
    if (!project) return null

    const totalUnits = project.total_units || 0
    const soldUnits = project.sold_units || 0
    const reservedUnits = project.reserved_units || 0
    const availableUnits = project.available_units || totalUnits - soldUnits - reservedUnits

    const occupancyRate = totalUnits > 0 ? ((soldUnits + reservedUnits) / totalUnits) * 100 : 0
    const soldRate = totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0

    const priceRange = project.price_range || {}
    const minPrice = priceRange.min || 0
    const maxPrice = priceRange.max || 0

    const metrics = [
        {
            title: 'Total Units',
            value: totalUnits,
            icon: Building2,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            description: 'Total inventory'
        },
        {
            title: 'Available',
            value: availableUnits,
            icon: Home,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            description: 'Ready to sell'
        },
        {
            title: 'Sold',
            value: soldUnits,
            icon: CheckCircle2,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            description: 'Completed sales'
        },
        {
            title: 'Reserved',
            value: reservedUnits,
            icon: Clock,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            description: 'Pending confirmation'
        }
    ]

    return (
        <div className="space-y-4">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric) => {
                    const Icon = metric.icon
                    return (
                        <Card key={metric.title} className="border-border">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">
                                            {metric.title}
                                        </p>
                                        <p className="text-2xl font-bold text-foreground">
                                            {metric.value.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {metric.description}
                                        </p>
                                    </div>
                                    <div className={`${metric.bgColor} ${metric.color} p-3 rounded-lg`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Occupancy Progress */}
            {totalUnits > 0 && (
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            Occupancy Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Sold Progress */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-muted-foreground">Sold Units</span>
                                <span className="text-xs font-bold text-purple-600">{soldRate.toFixed(1)}%</span>
                            </div>
                            <Progress value={soldRate} className="h-2 bg-purple-100" indicatorClassName="bg-purple-600" />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {soldUnits} of {totalUnits} units sold
                            </p>
                        </div>

                        {/* Total Occupancy */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-muted-foreground">Total Occupancy</span>
                                <span className="text-xs font-bold text-blue-600">{occupancyRate.toFixed(1)}%</span>
                            </div>
                            <Progress value={occupancyRate} className="h-2 bg-blue-100" indicatorClassName="bg-blue-600" />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {soldUnits + reservedUnits} of {totalUnits} units occupied (sold + reserved)
                            </p>
                        </div>

                        {/* Price Range */}
                        {(minPrice > 0 || maxPrice > 0) && (
                            <div className="pt-3 border-t border-border">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Price Range</p>
                                <p className="text-lg font-bold text-foreground">
                                    {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Unit Types Breakdown */}
            {unitConfigs && unitConfigs.length > 0 && (
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">Unit Configurations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {unitConfigs.map((config) => (
                                <div key={config.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <p className="text-xs font-medium text-muted-foreground">{config.config_name || config.property_type}</p>
                                    <div className="flex justify-between items-end mt-1">
                                        <p className="text-xl font-bold text-foreground">
                                            {formatINR(config.base_price)}
                                        </p>
                                        <Badge variant="outline" className="text-[9px] uppercase">{config.transaction_type}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
