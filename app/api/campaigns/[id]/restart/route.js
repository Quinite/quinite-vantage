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

        const RESTARTABLE = ['running', 'paused', 'completed', 'cancelled', 'failed']
        if (!RESTARTABLE.includes(campaign.status)) {
            return corsJSON({ error: 'CAMPAIGN_NOT_RESTARTABLE', message: `Campaign is already ${campaign.status}` }, { status: 400 })
        }

        const now = new Date().toISOString()

        // Delete call logs, clear call queue, reset lead statuses, reset campaign stats
        await Promise.all([
            admin.from('call_logs').delete().eq('campaign_id', campaignId),
            admin.from('call_queue').delete().eq('campaign_id', campaignId),
            admin.from('campaign_leads')
                .update({ status: 'enrolled', attempt_count: 0, last_call_attempt_at: null, call_log_id: null, skip_reason: null, updated_at: now })
                .eq('campaign_id', campaignId)
                .not('status', 'in', '("opted_out","archived")'),
        ])

        await admin.from('campaigns').update({
            status: 'scheduled',
            total_calls: 0,
            answered_calls: 0,
            transferred_calls: 0,
            avg_sentiment_score: null,
            credit_spent: 0,
            paused_at: null,
            completed_at: null,
            updated_at: now,
        }).eq('id', campaignId)

        await logAudit(admin, user.id, null, 'campaign.restarted', 'campaign', campaignId, { previous_status: campaign.status })

        return corsJSON({ success: true, status: 'scheduled' })
    } catch (err) {
        console.error('[POST /campaigns/[id]/restart]', err)
        return corsJSON({ error: err.message }, { status: 500 })
    }
}
