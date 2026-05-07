import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUsageStats } from '@/lib/middleware/feature-limits'

/**
 * GET /api/billing/usage
 * Get usage statistics for an organization
 */
export async function GET(request) {
    try {
        const supabase = createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const organizationId = searchParams.get('organization_id')

        if (!organizationId) {
            // Get from user's profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile) {
                return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
            }

            const usage = await getUsageStats(profile.organization_id)
            return NextResponse.json({ usage })
        }

        // Verify user has access to this organization
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .eq('organization_id', organizationId)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const usage = await getUsageStats(organizationId)

        if (!usage) {
            return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
        }

        return NextResponse.json({ usage })
    } catch (error) {
        console.error('Error in GET /api/billing/usage:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
