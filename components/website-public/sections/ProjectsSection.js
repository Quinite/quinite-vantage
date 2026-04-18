'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, ArrowUpRight, Bed, Bath, Ruler } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// NOTE: We use client-side fetching here for simplicity in this demo, 
// but for production SEO, this should ideally be passed from the server page.
// However, since we are inside a section renderer, client-fetch is acceptable for "live" data.

export default function PublicProjectsSection({ content, organizationId, slug }) {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!organizationId) return

        const fetchProjects = async () => {
            const supabase = createClient()
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*, unit_configs(config_name, carpet_area, base_price)')
                    .eq('organization_id', organizationId)
                    .eq('public_visibility', true)
                    .order('created_at', { ascending: false })
                    .limit(6)

                if (!error && data) {
                    setProjects(data)
                }
            } catch (err) {
                console.error('Failed to fetch public projects', err)
            } finally {
                setLoading(false)
            }
        }
        fetchProjects()
    }, [organizationId])

    const getProjectDetails = (project) => {
        const unitConfigs = project.unit_configs || []
        const firstConfig = unitConfigs[0] || null

        const image = project.image_url || null
        const address = project.address || [project.locality, project.city].filter(Boolean).join(', ') || 'Location unavailable'

        const bhk = firstConfig?.config_name || null
        const area = firstConfig?.carpet_area || null

        return {
            image,
            address,
            bhk: bhk ? bhk.toUpperCase() : null,
            area: area ? `${area} SqFt` : null,
        }
    }

    return (
        <section className="w-full py-24 px-6 bg-slate-50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900">{content.title || 'Featured Projects'}</h2>
                    {content.description && <p className="text-xl text-slate-600 max-w-2xl mx-auto">{content.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse h-96" />
                        ))
                    ) : projects.length > 0 ? (
                        projects.map((project, idx) => {
                            const details = getProjectDetails(project)
                            return (
                                <Link
                                    key={project.id}
                                    href={`/p/${slug}/project/${project.id}`}
                                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-slate-100 hover:border-primary/20"
                                >
                                    <div className="h-64 bg-slate-200 relative overflow-hidden">
                                        {details.image ? (
                                            <img
                                                src={details.image}
                                                alt={project.name}
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                                                <Building2 className="w-16 h-16" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                                            {project.status || 'Active'}
                                        </div>
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold flex items-center transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                                View Details <ArrowUpRight className="w-4 h-4 ml-2" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="mb-4">
                                            <h3 className="text-2xl font-bold text-slate-900 mb-2 line-clamp-1">{project.name}</h3>
                                            <div className="flex items-center text-slate-500 text-sm">
                                                <MapPin className="w-4 h-4 mr-1 text-primary" />
                                                <span className="line-clamp-1">{details.address}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-100 mt-auto">
                                            {details.bhk ? (
                                                <div className="flex flex-col items-center justify-center text-center">
                                                    <Bed className="w-4 h-4 text-slate-400 mb-1" />
                                                    <span className="text-xs font-medium text-slate-700">{details.bhk}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center opacity-50">
                                                    <Bed className="w-4 h-4 text-slate-400 mb-1" />
                                                    <span className="text-xs text-slate-400">- Beds</span>
                                                </div>
                                            )}

                                            <div className="flex flex-col items-center justify-center text-center border-l border-slate-100 opacity-50">
                                                <Bath className="w-4 h-4 text-slate-400 mb-1" />
                                                <span className="text-xs text-slate-400">- Baths</span>
                                            </div>

                                            {details.area ? (
                                                <div className="flex flex-col items-center justify-center text-center border-l border-slate-100">
                                                    <Ruler className="w-4 h-4 text-slate-400 mb-1" />
                                                    <span className="text-xs font-medium text-slate-700">{details.area}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center border-l border-slate-100 opacity-50">
                                                    <Ruler className="w-4 h-4 text-slate-400 mb-1" />
                                                    <span className="text-xs text-slate-400">- SqFt</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })
                    ) : (
                        <div className="col-span-full py-20 text-center">
                            <p className="text-slate-500 text-lg">No projects to display yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
