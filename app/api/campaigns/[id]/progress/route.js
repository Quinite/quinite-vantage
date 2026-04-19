import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
}

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

        const admin = createAdminClient()
        const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
        if (!profile?.organization_id) return handleCORS(NextResponse.json({ error: 'No organization' }, { status: 403 }))

        const { id: campaignId } = await params

        const { data: campaign } = await admin
            .from('campaigns')
            .select('id, status, credit_spent, credit_cap, organization_id')
            .eq('id', campaignId)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!campaign) return handleCORS(NextResponse.json({ error: 'Campaign not found' }, { status: 404 }))

        // Fetch all campaign_leads statuses in one query
        const { data: statusRows } = await admin
            .from('campaign_leads')
            .select('status')
            .eq('campaign_id', campaignId)
            .eq('organization_id', profile.organization_id)

        const counts = { total: 0, enrolled: 0, queued: 0, calling: 0, called: 0, failed: 0, skipped: 0, opted_out: 0, archived: 0 }
        for (const row of statusRows || []) {
            counts.total++
            if (counts[row.status] !== undefined) counts[row.status]++
        }

        const processed = counts.called + counts.failed + counts.skipped + counts.opted_out + counts.archived
        const percentage = counts.total > 0 ? Math.round((processed / counts.total) * 100) : 0
        const creditRemaining = campaign.credit_cap != null
            ? Math.max(0, campaign.credit_cap - (campaign.credit_spent || 0))
            : null

        return handleCORS(NextResponse.json({
            status: campaign.status,
            total: counts.total,
            processed,
            enrolled_pending: counts.enrolled,
            queued: counts.queued,
            calling: counts.calling,
            called: counts.called,
            failed: counts.failed,
            skipped: counts.skipped,
            opted_out: counts.opted_out,
            percentage,
            credit_spent: campaign.credit_spent || 0,
            credit_cap: campaign.credit_cap,
            credit_remaining: creditRemaining,
        }))
    } catch (err) {
        console.error('[GET /campaigns/[id]/progress]', err)
        return handleCORS(NextResponse.json({ error: err.message }, { status: 500 }))
    }
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 204 }))
}
