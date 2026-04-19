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

        const canEdit = await hasDashboardPermission(user.id, 'edit_campaigns')
        if (!canEdit) return corsJSON({ error: 'Forbidden' }, { status: 403 })

        const { id: campaignId } = await params
        const admin = createAdminClient()

        const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
        if (!profile?.organization_id) return corsJSON({ error: 'No organization' }, { status: 403 })

        const { data: campaign } = await admin.from('campaigns').select('id, status').eq('id', campaignId).eq('organization_id', profile.organization_id).single()
        if (!campaign) return corsJSON({ error: 'Campaign not found' }, { status: 404 })

        if (campaign.status !== 'archived') {
            return corsJSON({ error: 'CAMPAIGN_NOT_ARCHIVED', message: 'Only archived campaigns can be restored' }, { status: 400 })
        }

        await admin.from('campaigns')
            .update({ status: 'draft', archived_at: null, archived_by: null, updated_at: new Date().toISOString() })
            .eq('id', campaignId)

        await logAudit(admin, user.id, null, 'campaign.restored', 'campaign', campaignId, {})

        return corsJSON({ success: true, status: 'draft' })
    } catch (err) {
        console.error('[POST /campaigns/[id]/restore]', err)
        return corsJSON({ error: 'Internal server error' }, { status: 500 })
    }
}
