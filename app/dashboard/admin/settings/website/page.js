'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, ExternalLink, Globe, Layout, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'

export default function WebsiteSettingsPage() {
    const canManage = usePermission('manage_settings')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [organization, setOrganization] = useState(null)
    const [formData, setFormData] = useState({
        slug: '',
        custom_domain: '',
        public_profile_enabled: false,
        seo_title: '',
        seo_description: ''
    })

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/organization/settings')
            const data = await response.json()

            if (!response.ok) throw new Error(data.error)

            const org = data.organization
            setOrganization(org)
            setFormData({
                slug: org.slug || '',
                custom_domain: org.custom_domain || '',
                public_profile_enabled: org.public_profile_enabled || false,
                seo_title: org.website_config?.seo?.title || '',
                seo_description: org.website_config?.seo?.description || ''
            })
        } catch (error) {
            console.error('Error fetching settings:', error)
            toast.error('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            // Format slug
            const slug = formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

            const payload = {
                slug,
                custom_domain: formData.custom_domain || null,
                public_profile_enabled: formData.public_profile_enabled,
                website_config: {
                    ...(organization.website_config || {}),
                    seo: {
                        title: formData.seo_title,
                        description: formData.seo_description
                    }
                }
            }

            const response = await fetch('/api/organization/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (!response.ok) {
                if (data.error?.includes('unique constraint')) {
                    throw new Error('This URL slug is already taken. Please choose another.')
                }
                throw new Error(data.error || 'Failed to save settings')
            }

            setOrganization(data.organization)
            setFormData(prev => ({ ...prev, slug })) // Update slug to formatted version
            toast.success('Website settings saved!')
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8"><Skeleton className="h-96 w-full" /></div>
    }

    return (
        <div className="h-full bg-gray-50/50 overflow-y-auto">
            <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Website Settings</h1>
                        <p className="text-sm md:text-base text-slate-500 mt-1">
                            Configure your public profile and website appearance.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Link href="/dashboard/admin/website-builder" className="w-full md:w-auto">
                            <Button variant="outline" className="w-full md:w-auto h-10 border-slate-200 text-slate-600 font-bold rounded-xl px-6">
                                <Layout className="w-4 h-4 mr-2" />
                                Visual Editor
                            </Button>
                        </Link>
                        
                        <PermissionTooltip hasPermission={canManage}>
                            <Button
                                onClick={handleSave}
                                disabled={saving || !canManage}
                                className="w-full md:w-auto h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 shadow-md transition-all duration-200"
                            >
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save Changes
                            </Button>
                        </PermissionTooltip>

                        {organization?.slug && organization?.public_profile_enabled && (
                            <a
                                href={`/p/${organization.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden md:block"
                            >
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl" title="View Live Site">
                                    <ExternalLink className="w-4 h-4" />
                                </Button>
                            </a>
                        )}
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* Public Visibility Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="w-5 h-5" />
                                Public Visibility
                            </CardTitle>
                            <CardDescription>
                                Enable your public profile to showcase projects to the world.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between p-6 bg-slate-50 border-t">
                            <div className="space-y-1">
                                <p className="font-medium">Publish Website</p>
                                <p className="text-sm text-slate-500">
                                    When enabled, your profile will be accessible at the URL below.
                                </p>
                            </div>
                            <PermissionTooltip hasPermission={canManage}>
                                <Switch
                                    checked={formData.public_profile_enabled}
                                    onCheckedChange={(checked) => handleChange('public_profile_enabled', checked)}
                                    disabled={!canManage}
                                />
                            </PermissionTooltip>
                        </CardContent>
                    </Card>

                    {/* Domain Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Domain & URL</CardTitle>
                            <CardDescription>
                                Set your unique URL or connect a custom domain.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-3">
                                <Label>Public URL</Label>
                                <div className="flex">
                                    <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-slate-100 text-slate-500 text-sm">
                                        app.quinite.com/p/
                                    </div>
                                    <Input
                                        value={formData.slug}
                                        onChange={(e) => handleChange('slug', e.target.value)}
                                        placeholder="your-agency-name"
                                        className="rounded-l-none"
                                        disabled={!canManage}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Only letters, numbers, and hyphens.
                                </p>
                            </div>

                            <div className="grid gap-3 opacity-60">
                                <Label className="flex items-center gap-2">
                                    Custom Domain (Optional)
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Coming Soon</span>
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={formData.custom_domain}
                                        onChange={(e) => handleChange('custom_domain', e.target.value)}
                                        placeholder="properties.youragency.com"
                                        disabled={true}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Custom domain mapping is currently being finalized.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SEO Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>SEO Configuration</CardTitle>
                            <CardDescription>
                                Optimize how your site appears in search engines.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Site Title</Label>
                                <Input
                                    value={formData.seo_title}
                                    onChange={(e) => handleChange('seo_title', e.target.value)}
                                    placeholder="Use Organization Name"
                                    disabled={!canManage}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Meta Description</Label>
                                <Input
                                    value={formData.seo_description}
                                    onChange={(e) => handleChange('seo_description', e.target.value)}
                                    placeholder="Brief description of your agency..."
                                    disabled={!canManage}
                                />
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    )
}
