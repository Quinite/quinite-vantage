import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { CampaignService } from '@/services/campaign.service'

function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 204 }))
}

// DELETE /api/campaigns/[id]/leads/[leadId] — remove lead from campaign
export async function DELETE(request, { params }) {
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

        try {
            const result = await CampaignService.removeLeadFromCampaign(campaignId, leadId, profile.organization_id)
            await logAudit(admin, user.id, null, 'campaign.lead.removed', 'campaign', campaignId, { lead_id: leadId })
            return handleCORS(NextResponse.json({ success: true, ...result }))
        } catch (err) {
            if (err.message === 'Enrollment not found') {
                return handleCORS(NextResponse.json({ error: 'Lead not enrolled in this campaign' }, { status: 404 }))
            }
            throw err
        }
    } catch (err) {
        console.error('[DELETE /campaigns/[id]/leads/[leadId]]', err)
        return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
    }
}
