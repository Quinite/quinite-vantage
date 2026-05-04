import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { assertCampaignOwnership } from '@/services/campaign.service'

export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return corsJSON({ error: 'Unauthorized' }, { status: 401 })

        const canDelete = await hasDashboardPermission(user.id, 'delete_campaigns')
        if (!canDelete) return corsJSON({ error: 'Forbidden' }, { status: 403 })

        const { id: campaignId } = await params
        const admin = createAdminClient()

        const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
        if (!profile?.organization_id) return corsJSON({ error: 'No organization' }, { status: 403 })

        const campaign = await assertCampaignOwnership(admin, campaignId, profile.organization_id)
        if (!campaign) return corsJSON({ error: 'Campaign not found' }, { status: 404 })

        if (!['completed', 'cancelled', 'failed'].includes(campaign.status)) {
            return corsJSON({ error: 'CAMPAIGN_NOT_ARCHIVABLE', message: `Only completed, cancelled, or failed campaigns can be archived. Current status: ${campaign.status}` }, { status: 409 })
        }

        await admin.from('campaigns')
            .update({ status: 'archived', archived_at: new Date().toISOString(), archived_by: user.id, updated_at: new Date().toISOString() })
            .eq('id', campaignId)

        await logAudit(admin, user.id, null, 'campaign.archived', 'campaign', campaignId, {})

        return corsJSON({ success: true, status: 'archived' })
    } catch (err) {
        console.error('[POST /campaigns/[id]/archive]', err)
        return corsJSON({ error: 'Internal server error' }, { status: 500 })
    }
}
