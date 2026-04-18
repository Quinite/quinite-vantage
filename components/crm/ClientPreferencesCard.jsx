'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, MapPin, Calendar, Wallet, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/currency'
import {
    PROPERTY_CATEGORIES,
    PROPERTY_TYPES,
    RESIDENTIAL_CONFIGURATIONS,
    TRANSACTION_TYPES,
    PURCHASE_TIMELINES,
} from '@/lib/property-constants'

function budgetHint(val) {
    const n = Number(val)
    if (!val || isNaN(n) || n <= 0) return null
    return formatCurrency(n)
}

const EMPTY_FORM = {
    preferred_category: '',
    preferred_property_type: '',
    preferred_configuration: '',
    preferred_transaction_type: '',
    preferred_location: '',
    preferred_timeline: '',
    min_budget: '',
    max_budget: '',
}

function leadToForm(lead) {
    return {
        preferred_category:         lead?.preferred_category         || '',
        preferred_property_type:    lead?.preferred_property_type    || '',
        preferred_configuration:    lead?.preferred_configuration    || '',
        preferred_transaction_type: lead?.preferred_transaction_type || '',
        preferred_location:         lead?.preferred_location         || '',
        preferred_timeline:         lead?.preferred_timeline         || '',
        min_budget: lead?.min_budget || '',
        max_budget: lead?.max_budget || '',
    }
}

/** Compact pill button used for category / type / config / transaction selectors */
function PillButton({ label, selected, onClick, className }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all whitespace-nowrap',
                selected
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-100'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700',
                className
            )}
        >
            {label}
        </button>
    )
}

function FieldLabel({ icon: Icon, children }) {
    return (
        <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span className="text-xs font-semibold uppercase tracking-wide">{children}</span>
        </div>
    )
}

export default function ClientPreferencesCard({ lead, leadId, onUpdate }) {
    const [formData, setFormData] = useState(() => leadToForm(lead))
    const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved'
    const saveTimeoutRef = useRef(null)
    const lastSavedRef = useRef(formData)

    useEffect(() => {
        if (lead) {
            const next = leadToForm(lead)
            setFormData(next)
            lastSavedRef.current = next
        }
    }, [lead])

    const autoSave = useCallback(async (data) => {
        try {
            setSaveStatus('saving')
            const payload = { ...data }
            if (payload.min_budget === '') payload.min_budget = null
            if (payload.max_budget === '') payload.max_budget = null
            if (payload.preferred_category === '') payload.preferred_category = null
            if (payload.preferred_property_type === '') payload.preferred_property_type = null
            if (payload.preferred_configuration === '') payload.preferred_configuration = null
            if (payload.preferred_transaction_type === '') payload.preferred_transaction_type = null

            const res = await fetch(`/api/leads/${leadId}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error('Failed to save preferences')

            lastSavedRef.current = data
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
            if (onUpdate) onUpdate()
        } catch {
            toast.error('Failed to save changes')
            setSaveStatus('idle')
            setFormData(lastSavedRef.current)
        }
    }, [leadId, onUpdate])

    const triggerAutoSave = useCallback((newData) => {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => autoSave(newData), 500)
    }, [autoSave])

    const set = useCallback((field, value) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value }
            triggerAutoSave(next)
            return next
        })
    }, [triggerAutoSave])

    const setCategory = useCallback((value) => {
        setFormData(prev => {
            const next = {
                ...prev,
                preferred_category: value,
                preferred_property_type: '',
                preferred_configuration: '',
            }
            triggerAutoSave(next)
            return next
        })
    }, [triggerAutoSave])

    const setPropertyType = useCallback((value) => {
        setFormData(prev => {
            const next = { ...prev, preferred_property_type: value, preferred_configuration: '' }
            triggerAutoSave(next)
            return next
        })
    }, [triggerAutoSave])

    const currentTypes = formData.preferred_category
        ? (PROPERTY_TYPES[formData.preferred_category] || [])
        : []

    const isResidential = formData.preferred_category === 'residential'

    return (
        <Card className="h-full border-0 shadow-sm ring-1 ring-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 mb-2 bg-gradient-to-r from-emerald-50/50 to-transparent">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shadow-sm">
                        <Star className="w-4 h-4 fill-emerald-700" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-gray-900">Client Preferences</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Key requirements & criteria</p>
                    </div>
                </div>
                {saveStatus !== 'idle' && (
                    <div className="flex items-center gap-1.5 text-xs">
                        {saveStatus === 'saving' && (
                            <>
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-blue-600 font-medium">Saving...</span>
                            </>
                        )}
                        {saveStatus === 'saved' && (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-medium">Saved</span>
                            </>
                        )}
                    </div>
                )}
            </CardHeader>

            <CardContent className="px-5 pb-5 space-y-5">

                {/* ── Section 1: Property Preference ── */}

                {/* Category */}
                <div>
                    <FieldLabel>Category</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                        {PROPERTY_CATEGORIES.map(cat => (
                            <PillButton
                                key={cat.id}
                                label={cat.label}
                                selected={formData.preferred_category === cat.id}
                                onClick={() => setCategory(cat.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Property Type — shown once category is picked */}
                {currentTypes.length > 0 && (
                    <div>
                        <FieldLabel>Property Type</FieldLabel>
                        <div className="flex flex-wrap gap-2">
                            {currentTypes.map(type => (
                                <PillButton
                                    key={type.id}
                                    label={type.label}
                                    selected={formData.preferred_property_type === type.id}
                                    onClick={() => setPropertyType(type.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Configuration — residential only */}
                {isResidential && (
                    <div>
                        <FieldLabel>Configuration</FieldLabel>
                        <div className="flex flex-wrap gap-2">
                            {RESIDENTIAL_CONFIGURATIONS.map(cfg => (
                                <PillButton
                                    key={cfg}
                                    label={cfg}
                                    selected={formData.preferred_configuration === cfg}
                                    onClick={() => set('preferred_configuration', formData.preferred_configuration === cfg ? '' : cfg)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Transaction Type */}
                <div>
                    <FieldLabel>Looking To</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                        {TRANSACTION_TYPES.map(tx => (
                            <PillButton
                                key={tx.id}
                                label={tx.label}
                                selected={formData.preferred_transaction_type === tx.id}
                                onClick={() => set('preferred_transaction_type', formData.preferred_transaction_type === tx.id ? '' : tx.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="border-t border-dashed border-gray-200" />

                {/* ── Section 2: Purchase Intent ── */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Location */}
                    <div>
                        <FieldLabel icon={MapPin}>Preferred Location</FieldLabel>
                        <Input
                            value={formData.preferred_location}
                            onChange={e => set('preferred_location', e.target.value)}
                            className="h-9 bg-gray-50/50 hover:bg-gray-100/50 focus:bg-white transition-colors"
                            placeholder="City, area or locality"
                        />
                    </div>

                    {/* Timeline */}
                    <div>
                        <FieldLabel icon={Calendar}>Purchase Timeline</FieldLabel>
                        <Select
                            value={formData.preferred_timeline}
                            onValueChange={val => set('preferred_timeline', val)}
                        >
                            <SelectTrigger className="h-9 bg-gray-50/50 hover:bg-gray-100/50 focus:bg-white transition-colors">
                                <SelectValue placeholder="Select timeline" />
                            </SelectTrigger>
                            <SelectContent>
                                {PURCHASE_TIMELINES.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Budget */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Budget Range</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100/50">
                        <div>
                            <p className="text-xs text-orange-600/70 font-semibold mb-1">Minimum</p>
                            <Input
                                type="number"
                                value={formData.min_budget}
                                onChange={e => set('min_budget', e.target.value)}
                                className="h-9 bg-white border-orange-200 focus-visible:ring-orange-500/20 hover:border-orange-300 transition-colors"
                                placeholder="Min"
                            />
                            {budgetHint(formData.min_budget) && (
                                <p className="mt-1 text-[10px] text-orange-500/80 font-medium">{budgetHint(formData.min_budget)}</p>
                            )}
                        </div>
                        <div className="relative">
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-8 w-px bg-orange-200 sm:block hidden" />
                            <p className="text-xs text-orange-600/70 font-semibold mb-1">Maximum</p>
                            <Input
                                type="number"
                                value={formData.max_budget}
                                onChange={e => set('max_budget', e.target.value)}
                                className="h-9 bg-white border-orange-200 focus-visible:ring-orange-500/20 hover:border-orange-300 transition-colors"
                                placeholder="Max"
                            />
                            {budgetHint(formData.max_budget) && (
                                <p className="mt-1 text-[10px] text-orange-500/80 font-medium">{budgetHint(formData.max_budget)}</p>
                            )}
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
