import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicSectionRenderer from '@/components/website-public/PublicSectionRenderer'

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
    const { slug } = await params
    const supabase = createAdminClient()

    const { data: org } = await supabase
        .from('organizations')
        .select('company_name, website_config')
        .eq('slug', slug)
        .single()

    if (!org) return { title: 'Not Found' }

    const config = org.website_config || {}
    const seo = config.seo || {}
    const settings = config.settings || {}
    
    const siteName = seo.title || settings.siteName || org.company_name
    const description = seo.description || `Welcome to ${siteName}`

    return {
        title: siteName,
        description: description,
        icons: {
            icon: settings.logoUrl || '/favicon.ico'
        },
        openGraph: {
            title: siteName,
            description: description,
            images: settings.logoUrl ? [settings.logoUrl] : []
        }
    }
}

export default async function PublicProfilePage({ params }) {
    const { slug } = await params
    const supabase = createAdminClient()

    const { data: org, error } = await supabase
        .from('organizations')
        .select('id, company_name, website_config, slug')
        .eq('slug', slug)
        .eq('public_profile_enabled', true)
        .single()

    if (error || !org) return notFound()

    const config = org.website_config || {}
    const sections = config.sections || []
    const settings = config.settings || {}
    const siteName = settings.siteName || org.company_name || 'Site'
    const primary = settings.primaryColor || '#0f172a'

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900" style={{ '--primary': primary }}>
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
                        ) : (
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                                style={{ background: primary }}
                            >
                                {siteName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span>{siteName}</span>
                    </div>
                    <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
                        {sections.some(s => s.type === 'hero') && <Link href={`/p/${slug}#hero`} className="hover:text-slate-900 transition-colors">Home</Link>}
                        {sections.some(s => s.type === 'projects') && <Link href={`/p/${slug}#projects`} className="hover:text-slate-900 transition-colors">Projects</Link>}
                        {sections.some(s => s.type === 'about') && <Link href={`/p/${slug}#about`} className="hover:text-slate-900 transition-colors">About</Link>}
                        {sections.some(s => s.type === 'contact') && <Link href={`/p/${slug}#contact`} className="hover:text-slate-900 transition-colors">Contact</Link>}
                    </nav>
                    {/* Mobile menu placeholder */}
                    <button className="md:hidden p-2 rounded-md hover:bg-slate-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </header>

            <main>
                {sections.length > 0 ? (
                    sections.map(section => (
                        <div key={section.id} id={section.type}>
                            <PublicSectionRenderer
                                type={section.type}
                                content={section.content}
                                organizationId={org.id}
                                slug={slug}
                            />
                        </div>
                    ))
                ) : (
                    <div className="py-32 text-center px-4">
                        <h1 className="text-3xl font-bold text-slate-800">{siteName}</h1>
                        <p className="text-slate-500 mt-3">This site is currently being built. Check back soon.</p>
                    </div>
                )}
            </main>

            <footer className="border-t border-slate-100 bg-slate-50 py-10 text-center text-xs text-slate-400">
                <div className="max-w-7xl mx-auto px-4">
                    <p>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
                    <p className="mt-1">Powered by <span className="font-semibold text-slate-500">Quinite Vantage</span></p>
                </div>
            </footer>
        </div>
    )
}
