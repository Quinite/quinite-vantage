import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { CampaignService } from '@/services/campaign.service'
import { requireActiveSubscription } from '@/lib/middleware/subscription'

// IST helpers
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
        if (!canRun) return corsJSON({ success: false, message: "You don't have permission to run campaigns" }, { status: 403 })

        const { id: campaignId } = await params
        const adminClient = createAdminClient()

        const { data: profile } = await adminClient.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
        if (!profile?.organization_id) return corsJSON({ error: 'Organization not found' }, { status: 400 })

        // ── Subscription guard ────────────────────────────────────────────────
        const subError = await requireActiveSubscription(profile.organization_id)
        if (subError) return corsJSON(subError, { status: 402 })

        // ── Fetch campaign ────────────────────────────────────────────────────
        const { data: campaign, error: campaignError } = await adminClient
            .from('campaigns')
            .select('*, project:projects!campaigns_project_id_fkey(id, archived_at)')
            .eq('id', campaignId)
            .eq('organization_id', profile.organization_id)
            .single()

        if (campaignError || !campaign) return corsJSON({ error: 'Campaign not found' }, { status: 404 })

        // ── Status guard ─────────────────────────────────────────────────────
        if (campaign.status === 'running') {
            return corsJSON({ error: 'CAMPAIGN_ALREADY_RUNNING', message: 'Campaign is already running' }, { status: 400 })
        }
        if (campaign.status === 'paused') {
            return corsJSON({ error: 'USE_RESUME_ENDPOINT', message: 'Campaign is paused — use /resume to continue' }, { status: 400 })
        }
        if (['completed', 'cancelled', 'archived'].includes(campaign.status)) {
            return corsJSON({ error: 'CAMPAIGN_NOT_STARTABLE', message: `Cannot start a ${campaign.status} campaign` }, { status: 400 })
        }

        // ── Time window validation (IST) ──────────────────────────────────────
        const { currentDate, currentTime } = getISTDateTime()

        if (campaign.start_date && campaign.end_date) {
            if (currentDate < campaign.start_date || currentDate > campaign.end_date) {
                return corsJSON({ error: 'TIME_WINDOW_VIOLATION', message: 'Current date is outside the campaign date range', details: { currentDate, start_date: campaign.start_date, end_date: campaign.end_date } }, { status: 400 })
            }
        }
        if (campaign.time_start && campaign.time_end) {
            if (currentTime < campaign.time_start || currentTime > campaign.time_end) {
                return corsJSON({ error: 'TIME_WINDOW_VIOLATION', message: 'Current time is outside the campaign time window', details: { currentTime, time_start: campaign.time_start, time_end: campaign.time_end } }, { status: 400 })
            }
        }

        // ── DND compliance (9am–9pm IST) ──────────────────────────────────────
        if (campaign.dnd_compliance !== false) {
            if (currentTime < '09:00' || currentTime > '21:00') {
                return corsJSON({ error: 'DND_HOURS_VIOLATION', message: 'Calling outside DND-compliant hours (9:00–21:00 IST)', allowed_window: '09:00–21:00 IST' }, { status: 400 })
            }
        }

        // ── Credit check ──────────────────────────────────────────────────────
        const { data: credits } = await adminClient
            .from('call_credits')
            .select('balance')
            .eq('organization_id', profile.organization_id)
            .single()

        if (!credits || credits.balance < 1.0) {
            return corsJSON({ error: 'INSUFFICIENT_CREDITS', balance: credits?.balance || 0 }, { status: 400 })
        }

        let creditCapRemaining = Infinity
        if (campaign.credit_cap != null) {
            const remaining = campaign.credit_cap - (campaign.credit_spent || 0)
            if (remaining <= 0) {
                return corsJSON({ error: 'CREDIT_CAP_EXHAUSTED', message: 'Campaign credit cap has been reached' }, { status: 400 })
            }
            const AVG_CALL_COST = 2.0
            creditCapRemaining = Math.floor(remaining / AVG_CALL_COST)
        }

        // ── Enrollment check ──────────────────────────────────────────────────
        const { count: enrolledCount } = await adminClient
            .from('campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .eq('status', 'enrolled')

        if (!enrolledCount || enrolledCount === 0) {
            // Backward compat: auto-enroll from project if no explicit enrollment
            if (campaign.project_id) {
                const { enrolled } = await CampaignService.autoEnrollFromProject(
                    campaignId,
                    campaign.project_id,
                    profile.organization_id,
                    user.id
                )
                if (enrolled === 0) {
                    return corsJSON({ error: 'NO_ENROLLABLE_LEADS', message: 'No enrollable leads found. Check phone numbers and ensure leads are not archived or on DNC.' }, { status: 400 })
                }
            } else {
                return corsJSON({ error: 'NO_ENROLLABLE_LEADS', message: 'No leads enrolled in this campaign' }, { status: 400 })
            }
        }

        // ── Queue all enrolled leads ───────────────────────────────────────────
        const queueResult = await CampaignService.queueEnrolledLeads(campaignId, profile.organization_id, creditCapRemaining)

        if (queueResult.queued === 0) {
            return corsJSON({ error: 'NO_ENROLLABLE_LEADS', message: 'All enrolled leads were skipped', skip_reasons: queueResult.skip_reasons }, { status: 400 })
        }

        // ── Set campaign running ───────────────────────────────────────────────
        await adminClient.from('campaigns')
            .update({ status: 'running', updated_at: new Date().toISOString() })
            .eq('id', campaignId)

        await logAudit(adminClient, user.id, profile.full_name, 'campaign.started', 'campaign', campaignId, {
            queued: queueResult.queued,
            skipped: queueResult.skipped,
            skip_reasons: queueResult.skip_reasons
        })

        return corsJSON({
            success: true,
            mode: 'queued',
            campaign: { id: campaignId, name: campaign.name, status: 'running' },
            summary: {
                queued: queueResult.queued,
                skipped: queueResult.skipped,
                skip_reasons: queueResult.skip_reasons,
                message: `Successfully queued ${queueResult.queued} calls. Background worker will process them.`
            }
        })
    } catch (err) {
        console.error('[POST /campaigns/[id]/start]', err)
        return corsJSON({ error: 'Internal server error', details: err.message }, { status: 500 })
    }
}
