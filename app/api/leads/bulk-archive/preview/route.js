import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'

/**
 * POST /api/leads/bulk-archive/preview
 * Calculates aggregated impact of archiving multiple leads
 */
export const POST = withAuth(async (request, { user, profile }) => {
    try {
        const { leadIds } = await request.json()
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 })
        }

        const supabase = await createServerSupabaseClient()

        // 1. Fetch count of active campaign enrollments for these leads
        const { count: campaignsCount } = await supabase
            .from('campaign_leads')
            .select('*', { count: 'exact', head: true })
            .in('lead_id', leadIds)
            .in('status', ['enrolled', 'queued'])

        // 2. Fetch count of pending tasks for these leads
        const { count: tasksCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .in('lead_id', leadIds)
            .eq('status', 'pending')

        // 3. Fetch count of active deals for these leads
        const { count: dealsCount } = await supabase
            .from('deals')
            .select('*', { count: 'exact', head: true })
            .in('lead_id', leadIds)
            .eq('status', 'active')

        // 4. Fetch count of leads with linked units
        const { count: unitsCount } = await supabase
            .from('leads')
            .select('unit_id', { count: 'exact', head: true })
            .in('id', leadIds)
            .not('unit_id', 'is', null)

        return NextResponse.json({
            impact: {
                lead_count: leadIds.length,
                active_campaigns: campaignsCount || 0,
                pending_tasks: tasksCount || 0,
                active_deals: dealsCount || 0,
                has_linked_units: unitsCount || 0
            }
        })
    } catch (error) {
        console.error('Error fetching bulk archive preview:', error)
        return NextResponse.json({ error: 'Failed to calculate bulk archive impact' }, { status: 500 })
    }
})
