import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { CampaignService } from '@/services/campaign.service'

function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 204 }))
}

// POST /api/campaigns/[id]/leads/[leadId]/opt-out
export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

        const canEdit = await hasDashboardPermission(user.id, 'edit_campaigns')
        if (!canEdit) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

        const admin = createAdminClient()
        const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
        if (!profile?.organization_id) return handleCORS(NextResponse.json({ error: 'No organization' }, { status: 403 }))

        const { id: campaignId, leadId } = await params
        const body = await request.json().catch(() => ({}))
        const { reason, global_dnc = false } = body

        await CampaignService.optOutLead(campaignId, leadId, profile.organization_id, reason, global_dnc)

        await logAudit(admin, user.id, null, 'campaign.lead.opted_out', 'campaign', campaignId, {
            lead_id: leadId,
            reason,
            global_dnc
        })

        return handleCORS(NextResponse.json({ success: true, global_dnc }))
    } catch (err) {
        console.error('[POST /campaigns/[id]/leads/[leadId]/opt-out]', err)
        return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
    }
}
