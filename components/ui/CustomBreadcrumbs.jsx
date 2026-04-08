'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Fragment, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CustomBreadcrumbs() {
    const pathname = usePathname()
    const supabase = createClient()
    const [breadcrumbs, setBreadcrumbs] = useState([])

    useEffect(() => {
        const resolveBreadcrumbs = async () => {
            // Split pathname but keep empty strings for index alignment if needed, 
            // but usually we just want non-empty.
            const rawSegments = pathname.split('/').filter(Boolean)

            // Build items with proper hrefs first
            const items = await Promise.all(rawSegments.map(async (segment, index) => {
                const href = `/${rawSegments.slice(0, index + 1).join('/')}`

                // Default Label
                let label = segment.charAt(0).toUpperCase() + segment.slice(1)

                // Skip "Dashboard" and "Admin" in visual output
                let isHidden = ['dashboard', 'admin'].includes(segment.toLowerCase())

                // Check if segment is a UUID (simple regex)
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)

                if (isUUID) {
                    // Identify context based on previous segment
                    const parentSegment = rawSegments[index - 1]
                    const nextSegment = rawSegments[index + 1]

                    // Hide campaign/project UUID if followed by 'pipeline' since the pipeline label will include the name
                    if ((parentSegment === 'campaigns' || parentSegment === 'projects') && nextSegment === 'pipeline') {
                        isHidden = true
                    }

                    try {
                        if (parentSegment === 'leads') {
                            const { data } = await supabase.from('leads').select('name').eq('id', segment).single()
                            if (data) label = data.name || 'Unknown Lead'
                        } else if (parentSegment === 'projects') {
                            const { data } = await supabase.from('projects').select('name').eq('id', segment).single()
                            if (data) label = data.name
                        } else if (parentSegment === 'campaigns') {
                            const { data } = await supabase.from('campaigns').select('name').eq('id', segment).single()
                            if (data) label = data.name
                        }
                    } catch (e) {
                        console.error('Error fetching breadcrumb label:', e)
                        label = 'Details'
                    }
                } else {
                    const staticLabels = {
                        'crm': 'CRM',
                        'leads': 'Leads',
                        'users': 'User Management',
                        'members': 'Team Members',
                        'inventory': 'Inventory',
                        'analytics': 'Analytics',
                        'audit': 'Audit Logs',
                        'profile': 'Profile',
                        'projects': 'Projects',
                        'tasks': 'Tasks',
                        'organization': 'General',
                        'website': 'Website',
                        'integrations': 'Integrations',
                        'roles': 'Roles & Permissions',
                        'subscription': 'Subscription',
                        'billing': 'Billing',
                        'settings': 'Settings',
                        'crm': 'CRM',
                        'pipeline': 'Pipeline Settings'
                    }
                    if (staticLabels[segment.toLowerCase()]) {
                        // Context-aware overrides
                        if (segment.toLowerCase() === 'pipeline') {
                            const grandParent = rawSegments[index - 2]?.toLowerCase()
                            const grandParentId = rawSegments[index - 1]

                            if (grandParent === 'projects') {
                                try {
                                    // Fetch project name for "The Park Pipeline"
                                    const { data } = await supabase.from('projects').select('name').eq('id', grandParentId).single()
                                    label = data?.name ? `${data.name} Pipeline` : 'Project Pipeline'
                                } catch (e) {
                                    label = 'Project Pipeline'
                                }
                            } else if (grandParent === 'campaigns') {
                                try {
                                    const { data } = await supabase.from('campaigns').select('name').eq('id', grandParentId).single()
                                    label = data?.name ? `${data.name} Pipeline` : 'Campaign Pipeline'
                                } catch (e) {
                                    label = 'Campaign Pipeline'
                                }
                            } else {
                                label = staticLabels[segment.toLowerCase()]
                            }
                        } else {
                            label = staticLabels[segment.toLowerCase()]
                        }
                    }
                }

                return { href, label, isHidden }
            }))

            setBreadcrumbs(items.filter(item => !item.isHidden))
        }

        resolveBreadcrumbs()
    }, [pathname])

    if (breadcrumbs.length === 0) return null

    return (
        <Breadcrumb className="mb-0">
            <BreadcrumbList className="sm:gap-1.5">
                {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1
                    return (
                        <Fragment key={item.href}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage className="font-medium text-primary text-xs tracking-tight">
                                        {item.label}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link
                                            href={item.href}
                                            className="text-muted-foreground/60 hover:text-primary transition-colors text-xs"
                                        >
                                            {item.label}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && (
                                <BreadcrumbSeparator className="text-muted-foreground/40 text-xs">
                                    <span className="">/</span>
                                </BreadcrumbSeparator>
                            )}
                        </Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
