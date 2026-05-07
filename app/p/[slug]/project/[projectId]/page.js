import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Building2, BedDouble, Bath, Ruler, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency' // Assuming this exists
import { ALL_AMENITY_MAP } from '@/lib/amenities-constants'
import { DynamicIcon } from '@/components/amenities/DynamicIcon'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
    const { slug, projectId } = await params
    const supabase = createAdminClient()
    
    const { data: project } = await supabase
        .from('projects')
        .select(`
            name, 
            image_url,
            description,
            organizations!inner (
                name,
                website_config
            )
        `)
        .eq('id', projectId)
        .eq('organizations.slug', slug)
        .single()

    if (!project) return { title: 'Project Not Found' }

    const org = project.organizations
    const siteName = org.website_config?.settings?.siteName || org.name
    const title = `${project.name} | ${siteName}`
    const description = project.description?.substring(0, 160) || `View details for ${project.name} at ${siteName}`

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            images: project.image_url ? [project.image_url] : []
        }
    }
}

export default async function PublicProjectPage({ params }) {
    const { slug, projectId } = await params
    const supabase = createAdminClient()

    // Fetch Project and verify Org via Slug
    const { data: project, error } = await supabase
        .from('projects')
        .select(`
            *,
            organizations!inner (
                id,
                slug,
                name,
                website_config
            ),
            unit_configs (
                id,
                config_name,
                property_type,
                category,
                carpet_area,
                base_price,
                amenities
            )
        `)
        .eq('id', projectId)
        .eq('organizations.slug', slug)
        .eq('public_visibility', true) // Security Check
        .single()

    if (error || !project) {
        return notFound()
    }

    const org = project.organizations
    const settings = org.website_config?.settings || {}

    // Theme
    const themeStyles = {
        '--primary': settings.primaryColor || '#0f172a',
    }

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900" style={themeStyles}>
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        {settings.logoUrl && (
                            <img src={settings.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
                        )}
                        <span>{settings.siteName || org.name}</span>
                    </div>
                    <Link href={`/p/${slug}`} className="text-sm font-medium hover:text-primary flex items-center">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="pb-20">
                {/* Hero / Gallery */}
                <div className="h-[50vh] md:h-[60vh] bg-slate-100 relative overflow-hidden group">
                    {project.image_url ? (
                        <img src={project.image_url} alt={project.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Building2 className="w-20 h-20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex flex-col justify-end p-8 md:p-16">
                        <div className="container">
                            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">{project.name}</h1>
                            <div className="flex items-center text-white/90 text-lg">
                                <MapPin className="w-5 h-5 mr-2" />
                                {[project.locality, project.city].filter(Boolean).join(', ') || project.address || ''}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Description */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">About Project</h2>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                {project.description || 'No description available for this project.'}
                            </p>
                        </section>

                        {/* Configurations / Configurations Grid */}
                        {project.unit_configs && project.unit_configs.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-6">Configurations</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {project.unit_configs.map((ut, idx) => (
                                        <div key={idx} className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-lg">{ut.config_name || ut.property_type}</h3>
                                                    <p className="text-sm text-slate-500">{ut.carpet_area} sqft Carpet</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-primary text-xl">
                                                        {formatCurrency(ut.base_price, 'INR')}
                                                    </p>
                                                    <p className="text-xs text-slate-400"> onwards</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
                                                <div className="flex items-center"><BedDouble className="w-4 h-4 mr-2" /> {ut.bedrooms || '-'} Beds</div>
                                                <div className="flex items-center"><Bath className="w-4 h-4 mr-2" /> {ut.bathrooms || '-'} Baths</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Amenities */}
                        {project.amenities && project.amenities.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-6">Society Amenities</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {project.amenities.map(id => {
                                        const amenity = ALL_AMENITY_MAP[id]
                                        if (!amenity) return null
                                        return (
                                        <div key={id} className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all">
                                            <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                                <DynamicIcon name={amenity.icon} className="w-4 h-4 text-slate-600" />
                                            </div>
                                            <span className="font-semibold text-sm text-slate-700">{amenity.label}</span>
                                        </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Sidebar / Stats */}
                    <div className="space-y-8">
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 sticky top-24 shadow-sm">
                            <h3 className="text-xl font-bold mb-6">Project Overview</h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                                    <p className="font-medium text-slate-900 capitalize flex items-center">
                                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                        {project.status || 'Active'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Type</label>
                                    <p className="font-medium text-slate-900 capitalize">{project.unit_configs?.[0]?.category || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Developer</label>
                                    <p className="font-medium text-slate-900">{org.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">RERA ID</label>
                                    <p className="font-medium text-slate-900">{project.rera_id || 'Not Available'}</p>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <Button className="w-full text-lg h-12">
                                        I'm Interested
                                    </Button>
                                    <p className="text-center text-xs text-slate-400 mt-4">
                                        Contacting the developer directly.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
