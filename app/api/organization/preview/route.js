import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/organization/preview?id=<org_id>
 * Returns organization data for the website preview page.
 * Uses admin client to bypass RLS so preview always shows current data.
 * Still requires the caller to be authenticated (session cookie check).
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing organization id' }, { status: 400 })
        }

        // Ensure the caller is authenticated (must be logged in to preview)
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Use admin client to bypass RLS and always get fresh data
        const admin = createAdminClient()
        const { data: org, error } = await admin
            .from('organizations')
            .select('id, company_name, slug, website_config, public_profile_enabled')
            .eq('id', id)
            .single()

        if (error || !org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        return NextResponse.json(org, {
            headers: { 'Cache-Control': 'no-store' }
        })
    } catch (err) {
        console.error('Preview API error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
