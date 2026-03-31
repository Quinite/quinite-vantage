'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Home, Store, ConciergeBell, Briefcase, ShoppingBag, Factory, IndianRupee } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ResidentialConfigForm({ onAdd, onCancel, category = 'residential', initialData = null }) {
    const [config, setConfig] = useState(initialData || {
        transaction_type: 'sell',
        category: category,
        property_type: '',
        config_name: category === 'residential' ? '3BHK' : '',
        carpet_area: '',
        built_up_area: '',
        super_built_up_area: '',
        plot_area: '',
        base_price: '',
    })

    useEffect(() => {
        if (!config.property_type) {
            const types = getPropertyTypes(config.category)
            if (types.length > 0) {
                setConfig(prev => ({ ...prev, property_type: types[0].id }))
            }
        }
    }, [config.category])

    function getPropertyTypes(cat) {
        const safeCat = (cat || 'residential').toLowerCase()
        switch (safeCat) {
            case 'commercial':
                return [
                    { id: 'Office', label: 'Office', icon: Briefcase },
                    { id: 'Retail', label: 'Retail', icon: ShoppingBag },
                    { id: 'Showroom', label: 'Showroom', icon: Store },
                    { id: 'Industrial', label: 'Industrial', icon: Factory },
                ]
            case 'land':
                return [
                    { id: 'Plot', label: 'Plot', icon: Home },
                    { id: 'Land', label: 'Land', icon: Building2 },
                ]
            default: // residential
                return [
                    { id: 'Apartment', label: 'Apartment', icon: Building2 },
                    { id: 'Villa', label: 'Villa Bungalow', icon: Home },
                    { id: 'Penthouse', label: 'Penthouse', icon: ConciergeBell },
                ]
        }
    }

    const propertyTypes = getPropertyTypes(config.category)
    const isResidential = config.category === 'residential'
    const isCommercial = config.category === 'commercial'
    const isLand = config.category === 'land'

    const handleSubmit = (e) => {
        e.preventDefault()
        onAdd(config)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 bg-[#f8fbff] p-5 rounded-2xl border border-blue-50/50">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1 px-1">
                {initialData ? 'Edit Configuration' : 'New Configuration'}
            </h2>

            <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Transaction Type</Label>
                    <Select
                        value={config.transaction_type}
                        onValueChange={(v) => setConfig(prev => ({ ...prev, transaction_type: v }))}
                    >
                        <SelectTrigger className="h-10 bg-white border-slate-200 shadow-sm focus:ring-1 focus:ring-blue-100">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sell">Sell</SelectItem>
                            <SelectItem value="rent">Rent</SelectItem>
                            <SelectItem value="lease">Lease</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Category</Label>
                    <Select
                        value={config.category}
                        onValueChange={(v) => setConfig(prev => ({ 
                            ...prev, 
                            category: v, 
                            property_type: '', 
                            config_name: v === 'residential' ? '3BHK' : '' 
                        }))}
                    >
                        <SelectTrigger className="h-10 bg-white border-slate-200 shadow-sm focus:ring-1 focus:ring-blue-100">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="residential">Residential</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                            <SelectItem value="land">Land</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2 px-1">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Property Type</Label>
                <div className="flex flex-wrap gap-3">
                    {propertyTypes.map((type) => {
                        const Icon = type.icon
                        const isSelected = config.property_type === type.id
                        return (
                            <button
                                type="button"
                                key={type.id}
                                onClick={() => setConfig(prev => ({ ...prev, property_type: type.id }))}
                                className={cn(
                                    "px-4 py-3 rounded-[14px] border-2 flex flex-col items-center justify-center gap-1.5 min-w-[110px] transition-all",
                                    isSelected 
                                        ? "border-blue-500 bg-white shadow-sm ring-2 ring-blue-50" 
                                        : "border-slate-100 bg-white hover:border-slate-200 text-slate-400"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isSelected ? "text-blue-500" : "text-slate-300")} />
                                <span className={cn("text-[10px] font-bold uppercase tracking-tight", isSelected ? "text-slate-900" : "text-slate-500")}>
                                    {type.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Configuration</Label>
                    {isResidential ? (
                        <Select
                            value={config.config_name}
                            onValueChange={(v) => setConfig(prev => ({ ...prev, config_name: v }))}
                        >
                            <SelectTrigger className="h-10 bg-white border-slate-200 shadow-sm">
                                <SelectValue placeholder="Select BHK" />
                            </SelectTrigger>
                            <SelectContent>
                                {['1RK', '1BHK', '1.5BHK', '2BHK', '2.5BHK', '3BHK', '3.5BHK', '4BHK', '5BHK', 'Penthouse'].map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input 
                            value={config.config_name} 
                            onChange={e => setConfig(p => ({ ...p, config_name: e.target.value }))}
                            className="h-10 bg-white border-slate-200 shadow-sm"
                            placeholder="Unit ID / Label"
                        />
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        {isLand ? 'Plot Area (sqft) *' : 'Carpet Area (sqft) *'}
                    </Label>
                    <Input
                        type="number"
                        placeholder="1200"
                        value={isLand ? (config.plot_area || '') : (config.carpet_area || '')}
                        onChange={(e) => setConfig(prev => ({ 
                            ...prev, 
                            [isLand ? 'plot_area' : 'carpet_area']: e.target.value 
                        }))}
                        className="h-10 bg-white border-slate-200 shadow-sm"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Base Price *</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₹</span>
                        <Input
                            type="number"
                            placeholder="7500000"
                            value={config.base_price || ''}
                            onChange={(e) => setConfig(prev => ({ ...prev, base_price: e.target.value }))}
                            className="h-10 bg-white border-slate-200 pl-7 shadow-sm font-semibold"
                            required
                        />
                    </div>
                </div>

                {isResidential && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Built-Up</Label>
                            <Input
                                type="number"
                                placeholder="1400"
                                value={config.built_up_area || ''}
                                onChange={(e) => setConfig(prev => ({ ...prev, built_up_area: e.target.value }))}
                                className="h-10 bg-white border-slate-100 shadow-sm text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Super BU</Label>
                            <Input
                                type="number"
                                placeholder="1650"
                                value={config.super_built_up_area || ''}
                                onChange={(e) => setConfig(prev => ({ ...prev, super_built_up_area: e.target.value }))}
                                className="h-10 bg-white border-slate-100 shadow-sm text-xs"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4 px-1">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel} 
                    className="h-9 px-6 rounded-lg text-slate-500 bg-white font-bold text-xs uppercase tracking-tight"
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    className="h-9 px-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-tight transition-all active:scale-95 shadow-md shadow-blue-100"
                >
                    {initialData ? 'Update Prototype' : 'Add Configuration'}
                </Button>
            </div>
        </form>
    )
}
