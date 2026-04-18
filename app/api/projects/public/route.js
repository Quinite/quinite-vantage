import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const slug = searchParams.get('slug')
        const limit = parseInt(searchParams.get('limit') || '9')
        const projectType = searchParams.get('type')

        if (!slug) {
            return corsJSON({ error: 'Slug is required' }, { status: 400 })
        }

        const admin = createAdminClient()

        // First resolve slug to org id
        const { data: org, error: orgError } = await admin
            .from('organizations')
            .select('id')
            .eq('slug', slug)
            .eq('public_profile_enabled', true)
            .single()

        if (orgError || !org) {
            return corsJSON({ error: 'Organization not found' }, { status: 404 })
        }

        // Fetch public projects
        let query = admin
            .from('projects')
            .select('id, name, description, address, status, image_url, metadata, unit_types, total_units, price_range')
            .eq('organization_id', org.id)
            .eq('public_visibility', true) // Only visible projects
            .order('created_at', { ascending: false })
            .limit(limit)


        const { data: projects, error } = await query

        if (error) throw error

        return corsJSON({ projects: projects || [] })

    } catch (e) {
        console.error('Public projects fetch error:', e)
        return corsJSON({ error: 'Internal Server Error' }, { status: 500 })
    }
}
