import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { withAuth } from '@/lib/middleware/withAuth'

export const POST = withAuth(async (request, { params, user }) => {
    try {
        const { id } = await params
        const supabase = await createServerSupabaseClient()

        // 1. Check permissions (Standard Archive uses edit_leads or a custom archive_leads, but we'll use edit_all or edit_own rules)
        // For simplicity, we just leverage the canEditLead equivalent logic locally since archiving is a soft-delete edit.
        const canEditAll = await hasDashboardPermission(user.id, 'edit_all_leads')
        const canEditTeam = await hasDashboardPermission(user.id, 'edit_team_leads')
        const canEditOwn = await hasDashboardPermission(user.id, 'edit_own_leads')

        const { data: lead, error: fetchErr } = await supabase
            .from('leads')
            .select('assigned_to, organization_id')
            .eq('id', id)
            .maybeSingle()

        if (fetchErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

        const canEdit = canEditAll || canEditTeam || (canEditOwn && lead.assigned_to === user.id)
        if (!canEdit) {
            return NextResponse.json({ success: false, message: "You don't have permission to archive this lead" }, { status: 403 })
        }

        const adminClient = createAdminClient()
        const now = new Date().toISOString()

        // 2. Clear out active campaigns
        const { data: activeCampaignLeads } = await adminClient
            .from('campaign_leads')
            .select('id, campaign_id')
            .eq('lead_id', id)
            .in('status', ['enrolled', 'queued'])

        if (activeCampaignLeads?.length > 0) {
            const campaignIds = [...new Set(activeCampaignLeads.map(cl => cl.campaign_id))]
            await Promise.all([
                adminClient.from('call_queue').delete().eq('lead_id', id).in('campaign_id', campaignIds).eq('status', 'queued'),
                adminClient.from('campaign_leads')
                    .update({ status: 'archived', skip_reason: 'lead_archived', updated_at: now })
                    .in('id', activeCampaignLeads.map(cl => cl.id))
            ])
        }

        // 3. Mark pending tasks as cancelled
        await adminClient
            .from('lead_tasks')
            .update({ status: 'cancelled' })
            .eq('lead_id', id)
            .eq('status', 'pending')

        // 4. Mark active deals as lost
        await adminClient
            .from('deals')
            .update({ stage: 'lost', status: 'archived' }) // Note: Update stage/status based on your schema. deals table typically has generic status.
            .eq('lead_id', id)
            .eq('status', 'active')

        // 5. Finally, soft delete (archive) the lead
        const { error: archiveErr } = await supabase
            .from('leads')
            .update({ archived_at: now, archived_by: user.id })
            .eq('id', id)

        if (archiveErr) throw archiveErr

        return NextResponse.json({ success: true, message: 'Lead successfully archived' }, { status: 200 })
    } catch (error) {
        console.error('Error archiving lead:', error)
        return NextResponse.json({ error: 'Internal server error while archiving lead' }, { status: 500 })
    }
})
