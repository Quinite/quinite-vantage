import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return corsJSON({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await hasDashboardPermission(user.id, 'edit_campaigns')
        if (!canEdit) return corsJSON({ success: false, message: "You don't have permission to edit campaigns" }, { status: 403 })

        const { id: campaignId } = await params
        const admin = createAdminClient()

        const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
        if (!profile?.organization_id) return corsJSON({ error: 'No organization' }, { status: 403 })

        const { data: campaign } = await admin.from('campaigns').select('id, status').eq('id', campaignId).eq('organization_id', profile.organization_id).single()
        if (!campaign) return corsJSON({ error: 'Campaign not found' }, { status: 404 })

        const CANCELLABLE = ['running', 'paused']
        if (!CANCELLABLE.includes(campaign.status)) {
            return corsJSON({ error: 'CAMPAIGN_NOT_CANCELLABLE', message: `Campaign is ${campaign.status}` }, { status: 400 })
        }

        const now = new Date().toISOString()

        // Delete ALL call_queue entries for this campaign
        await admin.from('call_queue')
            .delete()
            .eq('campaign_id', campaignId)

        // Mark enrolled/queued campaign leads as skipped
        await admin.from('campaign_leads')
            .update({ status: 'skipped', skip_reason: 'campaign_cancelled', updated_at: now })
            .eq('campaign_id', campaignId)
            .in('status', ['enrolled', 'queued'])

        await admin.from('campaigns')
            .update({ status: 'cancelled', updated_at: now })
            .eq('id', campaignId)

        await logAudit(admin, user.id, null, 'campaign.cancelled', 'campaign', campaignId, { previous_status: campaign.status })

        return corsJSON({ success: true, status: 'cancelled' })
    } catch (err) {
        console.error('[POST /campaigns/[id]/cancel]', err)
        return corsJSON({ error: err.message }, { status: 500 })
    }
}
