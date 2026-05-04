import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { CampaignService, assertCampaignOwnership, validateCampaignStartConditions } from '@/services/campaign.service'
import { requireActiveSubscription } from '@/lib/middleware/subscription'


export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return corsJSON({ error: 'Unauthorized' }, { status: 401 })

        const canRun = await hasDashboardPermission(user.id, 'run_campaigns')
        if (!canRun) return corsJSON({ error: 'Forbidden' }, { status: 403 })

        const { id: campaignId } = await params
        const admin = createAdminClient()

        const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
        if (!profile?.organization_id) return corsJSON({ error: 'No organization' }, { status: 403 })

        const subError = await requireActiveSubscription(profile.organization_id)
        if (subError) return corsJSON(subError, { status: 402 })

        const { data: campaign } = await admin.from('campaigns')
            .select('id, status, start_date, end_date, time_start, time_end, dnd_compliance, credit_cap, credit_spent')
            .eq('id', campaignId)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!campaign) return corsJSON({ error: 'Campaign not found' }, { status: 404 })
        if (campaign.status !== 'paused') {
            return corsJSON({ error: 'CAMPAIGN_NOT_PAUSED', message: `Campaign is ${campaign.status}, not paused` }, { status: 400 })
        }

        // ── Credit + org fetch ────────────────────────────────────────────────
        const [{ data: credits }, { data: org }] = await Promise.all([
            admin.from('call_credits').select('balance').eq('organization_id', profile.organization_id).single(),
            admin.from('organizations').select('subscription_status').eq('id', profile.organization_id).single(),
        ])

        // ── Shared validation (dates, time window, DND, credits, subscription) ─
        const validation = validateCampaignStartConditions(campaign, credits?.balance, org?.subscription_status)
        if (!validation.valid) return corsJSON({ error: validation.error, code: validation.code }, { status: 422 })

        // ── Credit cap guard ──────────────────────────────────────────────────
        if (campaign.credit_cap != null && (campaign.credit_spent || 0) >= campaign.credit_cap) {
            return corsJSON({ error: 'CREDIT_CAP_EXHAUSTED' }, { status: 400 })
        }

        // Queue any newly enrolled leads
        const queueResult = await CampaignService.queueEnrolledLeads(campaignId, profile.organization_id)

        await admin.from('campaigns')
            .update({ status: 'running', paused_at: null, updated_at: new Date().toISOString() })
            .eq('id', campaignId)

        await logAudit(admin, user.id, null, 'campaign.resumed', 'campaign', campaignId, { newly_queued: queueResult.queued })

        return corsJSON({
            success: true,
            status: 'running',
            newly_queued: queueResult.queued,
            already_queued_note: 'Previously queued leads resume automatically'
        })
    } catch (err) {
        console.error('[POST /campaigns/[id]/resume]', err)
        return corsJSON({ error: 'Internal server error' }, { status: 500 })
    }
}
