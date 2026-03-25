'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Sparkles, Building2, Rocket, Globe, IndianRupee, Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function PricingTiers({ currentPlan, onUpgrade, organizationCurrency, organizationCurrencySymbol }) {
    // Auto-select currency based on organization settings, default to INR
    const defaultCurrency = organizationCurrency === 'USD' ? 'USD' : 'INR'
    const [currency, setCurrency] = useState(defaultCurrency)
    const [showContactDialog, setShowContactDialog] = useState(false)
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        company: '',
        phone: '',
        message: '',
        user_count: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)

    // Fetch plans from API
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await fetch('/api/platform/plans')
                const data = await response.json()
                if (response.ok && data.plans) {
                    setPlans(data.plans)
                }
            } catch (error) {
                console.error('Error fetching plans:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchPlans()
    }, [])

    // Helper function to format features from database
    const formatFeatures = (features) => {
        const featureList = []

        // Usage limits
        if (features.max_users !== undefined) {
            featureList.push({
                text: features.max_users === -1 ? 'Unlimited users' : `Up to ${features.max_users} user${features.max_users !== 1 ? 's' : ''}`,
                included: true
            })
        }

        if (features.max_projects !== undefined) {
            featureList.push({
                text: features.max_projects === -1 ? 'Unlimited projects' : `Up to ${features.max_projects} project${features.max_projects !== 1 ? 's' : ''}`,
                included: true
            })
        }

        if (features.max_campaigns !== undefined) {
            featureList.push({
                text: features.max_campaigns === -1 ? 'Unlimited campaigns' : `Up to ${features.max_campaigns} campaign${features.max_campaigns !== 1 ? 's' : ''}`,
                included: true
            })
        }

        if (features.max_leads !== undefined) {
            featureList.push({
                text: features.max_leads === -1 ? 'Unlimited leads' : `Manage up to ${features.max_leads.toLocaleString()} leads`,
                included: true
            })
        }

        if (features.ai_calls_per_month !== undefined) {
            featureList.push({
                text: features.ai_calls_per_month === -1 ? 'Unlimited AI calls' : `${features.ai_calls_per_month.toLocaleString()} AI calls/month`,
                included: true
            })
        }

        if (features.max_storage_gb !== undefined) {
            featureList.push({
                text: features.max_storage_gb === -1 ? 'Unlimited storage' : `${features.max_storage_gb}GB storage`,
                included: true
            })
        }

        // Support tier
        if (features.support) {
            const supportText = {
                'community': 'Community support',
                'email': 'Email support',
                'priority': 'Priority support (24/7)'
            }
            featureList.push({
                text: supportText[features.support] || 'Support included',
                included: true,
                highlight: features.support === 'priority'
            })
        }

        // Feature flags
        if (features.custom_branding) {
            featureList.push({ text: 'Custom branding', included: true })
        }

        if (features.advanced_analytics) {
            featureList.push({ text: 'Advanced analytics', included: true })
        }

        if (features.dedicated_account_manager) {
            featureList.push({ text: 'Dedicated account manager', included: true, highlight: true })
        }

        if (features.sla) {
            featureList.push({ text: 'SLA guarantees', included: true })
        }

        if (features.custom_integrations) {
            featureList.push({ text: 'Custom integrations', included: true })
        }

        if (features.custom_pricing) {
            featureList.push({ text: 'Custom pricing available', included: true })
        }

        return featureList
    }

    // Map plan icons
    const getPlanIcon = (slug) => {
        const iconMap = {
            'free': Sparkles,
            'pro': Rocket,
            'enterprise': Building2
        }
        return iconMap[slug] || Rocket
    }

    const handleContactSales = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const response = await fetch('/api/contact/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactForm)
            })

            if (response.ok) {
                alert('Thank you! Our sales team will contact you within 24 hours.')
                setShowContactDialog(false)
                setContactForm({ name: '', email: '', company: '', phone: '', message: '', user_count: '' })
            } else {
                alert('Failed to submit inquiry. Please try again.')
            }
        } catch (error) {
            console.error('Error submitting contact form:', error)
            alert('An error occurred. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Loading pricing plans...</span>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Currency Toggle */}
            <div className="flex justify-center">
                <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                    <button
                        onClick={() => setCurrency('INR')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${currency === 'INR'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <IndianRupee className="w-4 h-4" />
                        India (₹)
                    </button>
                    <button
                        onClick={() => setCurrency('USD')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${currency === 'USD'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Globe className="w-4 h-4" />
                        International ($)
                    </button>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan, index) => {
                    const Icon = getPlanIcon(plan.slug)
                    const isCurrentPlan = currentPlan?.toLowerCase() === plan.slug
                    const isHighlighted = plan.slug === 'pro' // Highlight Pro plan by default
                    const features = formatFeatures(plan.features || {})

                    // Determine price display
                    const priceMonthly = currency === 'INR' ? plan.price_monthly : (plan.price_monthly / 80) // Rough conversion
                    const displayPrice = plan.slug === 'enterprise' || plan.features?.custom_pricing ? 'Custom' : priceMonthly

                    return (
                        <Card
                            key={plan.id}
                            className={`relative ${isHighlighted
                                ? 'border-2 border-blue-500 shadow-xl scale-105'
                                : 'border border-gray-200'
                                }`}
                        >
                            {isHighlighted && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <Badge className="bg-blue-600 text-white px-4 py-1">
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg ${isHighlighted ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}>
                                        <Icon className={`w-6 h-6 ${isHighlighted ? 'text-blue-600' : 'text-gray-600'
                                            }`} />
                                    </div>
                                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                </div>
                                <CardDescription className="text-base">
                                    {plan.description || 'Flexible plan for your needs'}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Pricing */}
                                <div className="text-center py-4">
                                    <div className="text-4xl font-bold text-gray-900">
                                        {typeof displayPrice === 'number' ? (
                                            <>
                                                {currency === 'INR' ? '₹' : '$'}
                                                {Math.round(displayPrice)}
                                            </>
                                        ) : (
                                            displayPrice
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {plan.slug === 'enterprise' || plan.features?.custom_pricing
                                            ? 'Contact sales'
                                            : 'per month'}
                                    </div>
                                </div>

                                {/* Features */}
                                <div className="space-y-3">
                                    {features.map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            {feature.included ? (
                                                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'
                                                    } ${feature.highlight ? 'font-semibold' : ''}`}>
                                                    {feature.text}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA Button */}
                                <Button
                                    className="w-full"
                                    variant={isHighlighted ? 'default' : 'outline'}
                                    disabled={isCurrentPlan}
                                    onClick={() => {
                                        if (plan.slug === 'enterprise' || plan.features?.custom_pricing) {
                                            setShowContactDialog(true)
                                        } else {
                                            onUpgrade?.(plan.slug)
                                        }
                                    }}
                                >
                                    {isCurrentPlan ? 'Current Plan' : plan.slug === 'enterprise' ? 'Contact Sales' : `Upgrade to ${plan.name}`}
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Enterprise Contact Dialog */}
            <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Contact Sales</DialogTitle>
                        <DialogDescription>
                            Tell us about your needs and our team will get back to you within 24 hours.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleContactSales} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                required
                                value={contactForm.name}
                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={contactForm.email}
                                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="company">Company *</Label>
                            <Input
                                id="company"
                                required
                                value={contactForm.company}
                                onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <PhoneInput
                                id="phone"
                                value={contactForm.phone}
                                onChange={(value) => setContactForm({ ...contactForm, phone: value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="user_count">Expected Number of Users</Label>
                            <Input
                                id="user_count"
                                type="number"
                                value={contactForm.user_count}
                                onChange={(e) => setContactForm({ ...contactForm, user_count: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                rows={3}
                                value={contactForm.message}
                                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                placeholder="Tell us about your requirements..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowContactDialog(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting} className="flex-1">
                                {submitting ? 'Submitting...' : 'Submit'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
