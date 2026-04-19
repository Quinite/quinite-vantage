import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async (request, { params, profile }) => {
    try {
        const { id } = await params
        const supabase = await createServerSupabaseClient()

        // Get basic lead info + unit if attached
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select(`
                id, name,
                deals:deals(id, status),
                unit:units!properties_lead_id_fkey(id, status)
            `)
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .maybeSingle()

        if (leadError) throw leadError
        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

        const impact = {}

        // 1. Campaign Enrollments (active only)
        const { count: campaignsCount } = await supabase
            .from('campaign_leads')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', id)
            .in('status', ['enrolled', 'queued'])
        impact.active_campaigns = campaignsCount || 0

        // 2. Pending Lead Tasks
        const { count: tasksCount } = await supabase
            .from('lead_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', id)
            .eq('status', 'pending')
        impact.pending_tasks = tasksCount || 0

        // 3. Open Deals
        const openDeals = lead.deals?.filter(d => !['won', 'closed-won', 'lost', 'closed-lost'].includes(d.status)) || []
        impact.open_deals = openDeals.length

        // 4. Linked Unit
        const unit = Array.isArray(lead.unit) ? lead.unit[0] : lead.unit
        impact.has_linked_unit = !!unit
        impact.linked_unit_sold = unit?.status === 'sold'

        return NextResponse.json({ impact })
    } catch (error) {
        console.error('Error fetching lead archive preview:', error)
        return NextResponse.json({ error: 'Failed to calculate archive impact' }, { status: 500 })
    }
})
