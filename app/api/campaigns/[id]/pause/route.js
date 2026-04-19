import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'

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

        const { data: campaign } = await admin.from('campaigns').select('id, status').eq('id', campaignId).eq('organization_id', profile.organization_id).single()
        if (!campaign) return corsJSON({ error: 'Campaign not found' }, { status: 404 })

        if (campaign.status !== 'running') {
            return corsJSON({ error: 'CAMPAIGN_NOT_RUNNING', message: `Campaign is ${campaign.status}, not running` }, { status: 400 })
        }

        await admin.from('campaigns')
            .update({ status: 'paused', paused_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', campaignId)

        await logAudit(admin, user.id, null, 'campaign.paused', 'campaign', campaignId, {})

        return corsJSON({
            success: true,
            status: 'paused',
            paused_at: new Date().toISOString(),
            note: 'Calls currently in progress will complete naturally. Queued calls are held until resumed.'
        })
    } catch (err) {
        console.error('[POST /campaigns/[id]/pause]', err)
        return corsJSON({ error: 'Internal server error' }, { status: 500 })
    }
}
