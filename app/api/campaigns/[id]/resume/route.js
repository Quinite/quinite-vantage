import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { CampaignService } from '@/services/campaign.service'

function getISTDateTime() {
    const now = new Date()
    const currentDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const currentTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }).substring(0, 5)
    return { currentDate, currentTime }
}

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

        const { data: campaign } = await admin.from('campaigns')
            .select('id, status, start_date, end_date, time_start, time_end, dnd_compliance, credit_cap, credit_spent')
            .eq('id', campaignId)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!campaign) return corsJSON({ error: 'Campaign not found' }, { status: 404 })
        if (campaign.status !== 'paused') {
            return corsJSON({ error: 'CAMPAIGN_NOT_PAUSED', message: `Campaign is ${campaign.status}, not paused` }, { status: 400 })
        }

        // Time window + DND re-validation
        const { currentDate, currentTime } = getISTDateTime()
        if (campaign.start_date && campaign.end_date) {
            if (currentDate < campaign.start_date || currentDate > campaign.end_date) {
                return corsJSON({ error: 'TIME_WINDOW_VIOLATION', message: 'Outside campaign date range' }, { status: 400 })
            }
        }
        if (campaign.time_start && campaign.time_end) {
            if (currentTime < campaign.time_start || currentTime > campaign.time_end) {
                return corsJSON({ error: 'TIME_WINDOW_VIOLATION', message: 'Outside campaign time window' }, { status: 400 })
            }
        }
        if (campaign.dnd_compliance !== false && (currentTime < '09:00' || currentTime > '21:00')) {
            return corsJSON({ error: 'DND_HOURS_VIOLATION', message: 'Cannot resume outside 9:00–21:00 IST' }, { status: 400 })
        }

        // Credit check
        const { data: credits } = await admin.from('call_credits').select('balance').eq('organization_id', profile.organization_id).single()
        if (!credits || credits.balance < 1.0) {
            return corsJSON({ error: 'INSUFFICIENT_CREDITS', balance: credits?.balance || 0 }, { status: 400 })
        }
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
