import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { CampaignService } from '@/services/campaign.service'

export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return corsJSON({ error: 'Unauthorized' }, { status: 401 })

        const canRun = await hasDashboardPermission(user.id, 'run_campaigns')
        if (!canRun) return corsJSON({ error: 'Forbidden' }, { status: 403 })

        const { id: campaignId } = await params
        const body = await request.json().catch(() => ({}))
        const { force = false } = body

        const admin = createAdminClient()
        const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
        if (!profile?.organization_id) return corsJSON({ error: 'No organization' }, { status: 403 })

        const { data: campaign } = await admin.from('campaigns').select('id, status').eq('id', campaignId).eq('organization_id', profile.organization_id).single()
        if (!campaign) return corsJSON({ error: 'Campaign not found' }, { status: 404 })

        if (!['running', 'paused'].includes(campaign.status)) {
            return corsJSON({ error: 'CAMPAIGN_NOT_COMPLETABLE', message: `Campaign is ${campaign.status}` }, { status: 400 })
        }

        // Count pending leads
        const { count: pendingCount } = await admin
            .from('campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .in('status', ['enrolled', 'queued', 'calling'])

        if (pendingCount > 0 && !force) {
            return corsJSON({ error: 'LEADS_STILL_PENDING', pending_count: pendingCount, message: `${pendingCount} leads still pending. Pass force=true to complete anyway.` }, { status: 400 })
        }

        // Clean up remaining queue items (including those waiting for retries)
        await admin.from('call_queue')
            .update({ 
                status: 'failed', 
                last_error: 'campaign_manually_completed', 
                next_retry_at: null, // Clear retry timer
                updated_at: new Date().toISOString() 
            })
            .eq('campaign_id', campaignId)
            .neq('status', 'completed') // Neutralize everything that isn't finished

        // Finalize stats and mark complete
        await CampaignService.finalizeStats(campaignId)
        await admin.from('campaigns')
            .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', campaignId)

        await logAudit(admin, user.id, null, 'campaign.completed', 'campaign', campaignId, { force, pending_count: pendingCount })

        return corsJSON({ success: true, status: 'completed' })
    } catch (err) {
        console.error('[POST /campaigns/[id]/complete]', err)
        return corsJSON({ error: 'Internal server error' }, { status: 500 })
    }
}
