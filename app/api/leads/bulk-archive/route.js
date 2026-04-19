import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { withAuth } from '@/lib/middleware/withAuth'

/**
 * POST /api/leads/bulk-archive
 * Archives multiple leads safely
 */
export const POST = withAuth(async (request, { user }) => {
    try {
        const { leadIds } = await request.json()
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 })
        }

        const supabase = await createServerSupabaseClient()
        const adminClient = createAdminClient()
        const now = new Date().toISOString()

        // 1. Check permissions
        const canEditAll = await hasDashboardPermission(user.id, 'edit_all_leads')
        const canEditTeam = await hasDashboardPermission(user.id, 'edit_team_leads')
        const canEditOwn = await hasDashboardPermission(user.id, 'edit_own_leads')

        // Fetch targets to check ownership
        const { data: leads, error: fetchErr } = await supabase
            .from('leads')
            .select('id, assigned_to, organization_id')
            .in('id', leadIds)

        if (fetchErr || !leads) return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })

        // Filter leads the user is allowed to edit
        const authorizedLeadIds = leads
            .filter(lead => canEditAll || canEditTeam || (canEditOwn && lead.assigned_to === user.id))
            .map(lead => lead.id)

        if (authorizedLeadIds.length === 0) {
            return NextResponse.json({ success: false, message: "You don't have permission to archive these leads" }, { status: 403 })
        }

        // 2. Perform bulk cleanup for authorized leads
        
        // A. Clear out active campaigns
        const { data: activeCampaignLeads } = await adminClient
            .from('campaign_leads')
            .select('id, campaign_id, lead_id')
            .in('lead_id', authorizedLeadIds)
            .in('status', ['enrolled', 'queued'])

        if (activeCampaignLeads?.length > 0) {
            const campaignLeadsIds = activeCampaignLeads.map(cl => cl.id)
            await Promise.all([
                adminClient.from('call_queue').delete().in('lead_id', authorizedLeadIds).eq('status', 'queued'),
                adminClient.from('campaign_leads')
                    .update({ status: 'archived', skip_reason: 'lead_archived', updated_at: now })
                    .in('id', campaignLeadsIds)
            ])
        }

        // B. Mark pending tasks as cancelled
        await adminClient
            .from('lead_tasks')
            .update({ status: 'cancelled' })
            .in('lead_id', authorizedLeadIds)
            .eq('status', 'pending')

        // C. Mark active deals as lost
        await adminClient
            .from('deals')
            .update({ stage: 'lost', status: 'archived' })
            .in('lead_id', authorizedLeadIds)
            .eq('status', 'active')

        // 3. Finally, soft delete (archive) the leads
        const { error: archiveErr } = await adminClient
            .from('leads')
            .update({ archived_at: now, archived_by: user.id })
            .in('id', authorizedLeadIds)

        if (archiveErr) throw archiveErr

        return NextResponse.json({ 
            success: true, 
            message: `${authorizedLeadIds.length} leads successfully archived`,
            count: authorizedLeadIds.length
        }, { status: 200 })
    } catch (error) {
        console.error('Error in bulk archive:', error)
        return NextResponse.json({ error: 'Internal server error while bulk archiving' }, { status: 500 })
    }
})
