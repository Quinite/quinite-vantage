'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Building2, Home, Store, ConciergeBell, Briefcase, ShoppingBag, Factory, Sparkles, ChevronDown, X, AlertTriangle, Check, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINR } from '@/lib/inventory'
import {
    PROPERTY_CATEGORIES,
    PROPERTY_TYPES,
    RESIDENTIAL_CONFIGURATIONS,
    TRANSACTION_TYPES,
} from '@/lib/property-constants'
import { DynamicIcon } from '@/components/amenities/DynamicIcon'
import { UNIT_AMENITY_MAP, UNIT_AMENITY_CATEGORIES, UNIT_QUICK_PICKS } from '@/lib/amenities-constants'

const TYPE_ICONS = {
    Apartment:  Building2,
    Villa:      Home,
    Penthouse:  ConciergeBell,
    Office:     Briefcase,
    Retail:     ShoppingBag,
    Showroom:   Store,
    Industrial: Factory,
    Plot:       Home,
    Land:       Building2,
}

export default function ResidentialConfigForm({ onAdd, onCancel, category = 'residential', initialData = null, unitsPlacedCount = 0 }) {
    const [moreFeaturesOpen, setMoreFeaturesOpen] = useState(false)
    const [activeCategory, setActiveCategory] = useState(UNIT_AMENITY_CATEGORIES[0]?.id || '')
    const [config, setConfig] = useState(initialData || {
        transaction_type: 'sell',
        category,
        property_type: '',
        config_name: category === 'residential' ? '3BHK' : '',
        carpet_area: '',
        built_up_area: '',
        super_built_up_area: '',
        plot_area: '',
        base_price: '',
        price_undisclosed: false,
        amenities: [],
    })

    useEffect(() => {
        if (!config.property_type) {
            const types = PROPERTY_TYPES[config.category] || []
            if (types.length > 0) {
                setConfig(prev => ({ ...prev, property_type: types[0].id }))
            }
        }
    }, [config.category])

    const propertyTypes = PROPERTY_TYPES[config.category] || []
    const isResidential = config.category === 'residential'
    const isLand = config.category === 'land'

    const handleSubmit = (e) => {
        e.preventDefault()
        onAdd(config)
    }

    const isValid =
        config.property_type &&
        (isLand ? config.plot_area : config.carpet_area) &&
        config.base_price

    return (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-blue-50/50">
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
                            {TRANSACTION_TYPES.map(tx => (
                                <SelectItem key={tx.id} value={tx.id}>{tx.label}</SelectItem>
                            ))}
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
                            {PROPERTY_CATEGORIES.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2 px-1">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Property Type</Label>
                <div className="flex flex-wrap gap-3">
                    {propertyTypes.map((type) => {
                        const Icon = TYPE_ICONS[type.id] || Building2
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
                                <span className={cn("text-xs font-bold", isSelected ? "text-slate-900" : "text-slate-500")}>
                                    {type.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                {isResidential && (
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Configuration</Label>
                        <Select
                            value={config.config_name}
                            onValueChange={(v) => setConfig(prev => ({ ...prev, config_name: v }))}
                        >
                            <SelectTrigger className="h-10 bg-white border-slate-200 shadow-sm">
                                <SelectValue placeholder="Select BHK" />
                            </SelectTrigger>
                            <SelectContent>
                                {RESIDENTIAL_CONFIGURATIONS.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

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
                        className="h-10 bg-white border-slate-200 shadow-sm placeholder:text-slate-400"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 items-start gap-5">
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-0.5">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Base Price *</Label>
                        {Number(config.base_price) > 99999 && (
                            <span className="text-[10px] font-black text-blue-600 animate-in fade-in slide-in-from-right-1">
                                {formatINR(config.base_price)}
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                        <Input
                            type="number"
                            placeholder="7500000"
                            value={config.base_price || ''}
                            onChange={(e) => setConfig(prev => ({ ...prev, base_price: e.target.value }))}
                            className={cn("h-10 bg-white border-slate-300 pl-7 shadow-sm font-semibold placeholder:text-slate-400", config.price_undisclosed && "opacity-50")}
                            required
                        />
                    </div>
                    {/* Do not disclose toggle */}
                    <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, price_undisclosed: !prev.price_undisclosed }))}
                        className={cn(
                            "mt-2 flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150",
                            config.price_undisclosed
                                ? "bg-amber-50 border-amber-300 text-amber-700"
                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                        )}
                    >
                        <span className={cn(
                            "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors",
                            config.price_undisclosed ? "bg-amber-400 border-amber-400" : "bg-slate-200 border-slate-200"
                        )}>
                            <span className={cn(
                                "inline-block h-3 w-3 rounded-full bg-white shadow transition-transform",
                                config.price_undisclosed ? "translate-x-3.5" : "translate-x-0.5"
                            )} />
                        </span>
                        <EyeOff className="w-3 h-3 shrink-0" />
                        Do not disclose price on AI calls
                    </button>
                </div>

                {isResidential && (
                    <div className="grid grid-cols-2 -mt-1.5 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Built-Up</Label>
                            <Input
                                type="number"
                                placeholder="1400"
                                value={config.built_up_area || ''}
                                onChange={(e) => setConfig(prev => ({ ...prev, built_up_area: e.target.value }))}
                                className="h-10 bg-white border-slate-300 shadow-sm placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Super Built-Up</Label>
                            <Input
                                type="number"
                                placeholder="1650"
                                value={config.super_built_up_area || ''}
                                onChange={(e) => setConfig(prev => ({ ...prev, super_built_up_area: e.target.value }))}
                                className="h-10 bg-white border-slate-300 shadow-sm placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Unit Features (Amenities) — inline */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        Unit Features
                        {config.amenities?.length > 0 && (
                            <span className="ml-1 bg-blue-100 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {config.amenities.length}
                            </span>
                        )}
                    </span>
                    {config.amenities?.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, amenities: [] }))}
                            className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                </div>

                {/* Quick picks + More popover */}
                <div className="flex flex-wrap gap-1.5">
                    {UNIT_QUICK_PICKS.map(id => {
                        const a = UNIT_AMENITY_MAP[id]
                        if (!a) return null
                        const selected = config.amenities?.includes(id)
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setConfig(prev => ({
                                    ...prev,
                                    amenities: selected
                                        ? prev.amenities.filter(x => x !== id)
                                        : [...(prev.amenities || []), id]
                                }))}
                                className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
                                    selected
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                                )}
                            >
                                <DynamicIcon name={a.icon} className="w-3 h-3" />
                                {a.label}
                                {selected && <Check className="w-3 h-3" />}
                            </button>
                        )
                    })}

                    {/* More features — popover */}
                    {(() => {
                        const extraSelected = (config.amenities || []).filter(id => !UNIT_QUICK_PICKS.includes(id))
                        return (
                            <Popover open={moreFeaturesOpen} onOpenChange={setMoreFeaturesOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className={cn(
                                            'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
                                            extraSelected.length > 0
                                                ? 'bg-slate-900 border-slate-900 text-white'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                                        )}
                                    >
                                        {extraSelected.length > 0 ? `+${extraSelected.length} more` : 'More features'}
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[380px] p-4 space-y-3 shadow-2xl"
                                    align="start"
                                    side="top"
                                    onWheel={e => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-slate-700">All Unit Features</p>
                                        <div className="flex items-center gap-2">
                                            {(config.amenities?.length || 0) > 0 && (
                                                <>
                                                    <span className="text-[11px] text-blue-600 font-semibold">
                                                        {config.amenities.length} selected
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfig(prev => ({ ...prev, amenities: [] }))}
                                                        className="text-[11px] text-slate-400 hover:text-slate-600"
                                                    >
                                                        Clear
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Category tabs */}
                                    <div className="overflow-x-auto -mx-1 px-1 pb-1" onWheel={e => e.stopPropagation()}>
                                        <div className="flex gap-1.5 min-w-max">
                                            {UNIT_AMENITY_CATEGORIES.map(cat => {
                                                const count = cat.amenities.filter(a => config.amenities?.includes(a.id)).length
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => setActiveCategory(cat.id)}
                                                        className={cn(
                                                            'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap',
                                                            activeCategory === cat.id
                                                                ? 'bg-slate-900 border-slate-900 text-white'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                        )}
                                                    >
                                                        {cat.label}
                                                        {count > 0 && (
                                                            <span className={cn(
                                                                'text-[10px] font-bold px-1.5 rounded-full',
                                                                activeCategory === cat.id ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                                            )}>
                                                                {count}
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Amenity grid */}
                                    <div className="max-h-[260px] overflow-y-auto" onWheel={e => e.stopPropagation()}>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(UNIT_AMENITY_CATEGORIES.find(c => c.id === activeCategory)?.amenities || []).map(amenity => {
                                                const selected = config.amenities?.includes(amenity.id)
                                                return (
                                                    <button
                                                        key={amenity.id}
                                                        type="button"
                                                        onClick={() => setConfig(prev => ({
                                                            ...prev,
                                                            amenities: selected
                                                                ? prev.amenities.filter(x => x !== amenity.id)
                                                                : [...(prev.amenities || []), amenity.id]
                                                        }))}
                                                        className={cn(
                                                            'relative flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-150',
                                                            selected
                                                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                                        )}
                                                    >
                                                        <DynamicIcon
                                                            name={amenity.icon}
                                                            className={cn('w-4 h-4 shrink-0', selected ? 'text-blue-500' : 'text-slate-400')}
                                                        />
                                                        <span className="text-[11px] font-semibold leading-tight">{amenity.label}</span>
                                                        {selected && <Check className="w-3 h-3 text-blue-500 ml-auto shrink-0" />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-1 border-t">
                                        <Button type="button" size="sm" onClick={() => setMoreFeaturesOpen(false)} className="text-xs h-7">
                                            Done
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )
                    })()}
                </div>

                {/* Non-quick-pick selections as removable chips */}
                {(() => {
                    const extraSelected = (config.amenities || []).filter(id => !UNIT_QUICK_PICKS.includes(id))
                    if (!extraSelected.length) return null
                    return (
                        <div className="flex flex-wrap gap-1.5">
                            {extraSelected.map(id => {
                                const a = UNIT_AMENITY_MAP[id]
                                if (!a) return null
                                return (
                                    <span
                                        key={id}
                                        className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    >
                                        <DynamicIcon name={a.icon} className="w-2.5 h-2.5 shrink-0" />
                                        {a.label}
                                        <button
                                            type="button"
                                            onClick={() => setConfig(prev => ({ ...prev, amenities: prev.amenities.filter(x => x !== id) }))}
                                            className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors leading-none"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                )
                            })}
                        </div>
                    )
                })()}
            </div>

            {initialData && (
                <div className={cn(
                    "flex items-start gap-2.5 p-3 rounded-xl border mt-6 mx-1 transition-colors",
                    unitsPlacedCount > 0 ? "bg-amber-50/50 border-amber-200" : "bg-slate-50 border-slate-200"
                )}>
                    <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", unitsPlacedCount > 0 ? "text-amber-500" : "text-slate-400")} />
                    <div className={cn("text-[11px] font-medium leading-relaxed", unitsPlacedCount > 0 ? "text-amber-800" : "text-slate-500")}>
                        {unitsPlacedCount > 0 && (
                            <p className="mb-1">
                                <span className="font-bold underline decoration-amber-200">
                                    {unitsPlacedCount} unit{unitsPlacedCount > 1 ? 's are' : ' is'} already using this configuration.
                                </span>
                            </p>
                        )}
                        <p>
                            Edits will apply to <span className={cn("font-bold", unitsPlacedCount > 0 ? "text-amber-900" : "text-slate-700")}>future units</span> only. Existing units will remain unchanged.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 px-1">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="h-9 px-5 rounded-lg text-slate-500 bg-white font-bold text-xs uppercase tracking-tight"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={!isValid}
                    className="h-9 px-6 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs uppercase transition-all active:scale-95 shadow-md shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {initialData ? 'Update Configuration' : 'Add Configuration'}
                </Button>
            </div>
        </form>
    )
}
