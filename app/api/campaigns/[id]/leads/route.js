import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { CampaignService } from '@/services/campaign.service'

function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 204 }))
}

// GET /api/campaigns/[id]/leads — list enrolled leads
export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

        const canView = await hasDashboardPermission(user.id, 'view_campaigns')
        if (!canView) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

        const admin = createAdminClient()
        const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
        if (!profile?.organization_id) return handleCORS(NextResponse.json({ error: 'No organization' }, { status: 403 }))

        const { id: campaignId } = await params
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'all'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
        const search = searchParams.get('search') || ''

        // Verify campaign belongs to org
        const { data: campaign } = await admin.from('campaigns').select('id').eq('id', campaignId).eq('organization_id', profile.organization_id).single()
        if (!campaign) return handleCORS(NextResponse.json({ error: 'Campaign not found' }, { status: 404 }))

        const result = await CampaignService.getEnrolledLeads(campaignId, profile.organization_id, { status, page, limit, search })

        return handleCORS(NextResponse.json(result))
    } catch (err) {
        console.error('[GET /campaigns/[id]/leads]', err)
        return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
    }
}

// POST /api/campaigns/[id]/leads — enroll leads
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

        const { id: campaignId } = await params
        const body = await request.json()
        const { lead_ids, filters } = body

        if (!lead_ids && !filters) {
            return handleCORS(NextResponse.json({ error: 'Provide lead_ids or filters' }, { status: 400 }))
        }
        if (lead_ids && lead_ids.length > 500) {
            return handleCORS(NextResponse.json({ error: 'lead_ids exceeds maximum of 500' }, { status: 422 }))
        }

        // Verify campaign exists and is enrollable
        const { data: campaign } = await admin.from('campaigns').select('id, status').eq('id', campaignId).eq('organization_id', profile.organization_id).single()
        if (!campaign) return handleCORS(NextResponse.json({ error: 'Campaign not found' }, { status: 404 }))

        const BLOCK_ENROLL = ['completed', 'cancelled', 'archived']
        if (BLOCK_ENROLL.includes(campaign.status)) {
            return handleCORS(NextResponse.json({ error: 'CAMPAIGN_NOT_ENROLLABLE', message: `Cannot enroll leads into a ${campaign.status} campaign` }, { status: 400 }))
        }

        const result = await CampaignService.enrollLeads(
            campaignId,
            profile.organization_id,
            user.id,
            { lead_ids, filters }
        )

        // If campaign is running, queue newly enrolled leads immediately
        if (campaign.status === 'running' && result.enrolled > 0) {
            await CampaignService.queueEnrolledLeads(campaignId, profile.organization_id)
        }

        await logAudit(admin, user.id, profile.full_name, 'campaign.leads.enrolled', 'campaign', campaignId, {
            enrolled: result.enrolled,
            skipped: result.skipped
        })

        return handleCORS(NextResponse.json({ success: true, ...result }))
    } catch (err) {
        console.error('[POST /campaigns/[id]/leads]', err)
        return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
    }
}
