import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/permissions'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { withAuth } from '@/lib/middleware/withAuth'
import { CampaignService, assertCampaignOwnership } from '@/services/campaign.service'

function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
}

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

        const canView = await hasDashboardPermission(user.id, 'view_campaigns')
        if (!canView) {
            return handleCORS(NextResponse.json({ success: false, message: "You don't have permission to view campaigns" }, { status: 200 }))
        }

        const admin = createAdminClient()
        const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
        if (!profile) return handleCORS(NextResponse.json({ error: 'Profile not found' }, { status: 404 }))

        const { id } = await params

        await assertCampaignOwnership(admin, id, profile.organization_id)

        const campaign = await CampaignService.getCampaignById(id, profile.organization_id)

        return handleCORS(NextResponse.json({ campaign }))
    } catch (e) {
        console.error('[GET /campaigns/[id]]', e)
        return handleCORS(NextResponse.json({ error: e.message }, { status: e.status || 500 }))
    }
}

export const PUT = withAuth(async (request, context) => {
    try {
        const { user, profile } = context
        const params = await context.params
        const campaignId = params.id

        const canEdit = await hasDashboardPermission(user.id, 'edit_campaigns')
        if (!canEdit) {
            return handleCORS(NextResponse.json({ success: false, message: "You don't have permission to edit campaigns" }, { status: 200 }))
        }

        if (!profile?.organization_id) return handleCORS(NextResponse.json({ error: 'Organization not found' }, { status: 400 }))
        if (!campaignId) return handleCORS(NextResponse.json({ error: 'Campaign ID required' }, { status: 400 }))

        const admin = createAdminClient()
        const existing = await assertCampaignOwnership(admin, campaignId, profile.organization_id)

        let body = await request.json()

        // ── State-based edit guards ───────────────────────────────────────────
        if (['completed', 'cancelled', 'archived'].includes(existing.status)) {
            return handleCORS(NextResponse.json({ error: 'CAMPAIGN_IMMUTABLE', message: `Cannot edit a ${existing.status} campaign` }, { status: 400 }))
        }

        if (['running', 'paused'].includes(existing.status)) {
            // Audit sensitive mid-run changes
            const sensitiveChanged = ['ai_script', 'call_settings', 'time_start', 'time_end', 'dnd_compliance', 'credit_cap'].filter(k => body[k] !== undefined)
            if (sensitiveChanged.length > 0) {
                await logAudit(admin, user.id, profile.full_name, 'campaign.settings_changed_while_running', 'campaign', campaignId, {
                    changed: sensitiveChanged,
                    note: 'Changes take effect on next call'
                })
            }
        }

        // Sync junction table if project_ids is being updated
        if (body.project_ids && Array.isArray(body.project_ids) && body.project_ids.length > 0) {
            body.project_id = body.project_ids[0]
            await admin.from('campaign_projects').delete().eq('campaign_id', campaignId)
            await admin.from('campaign_projects').insert(body.project_ids.map(pid => ({ campaign_id: campaignId, project_id: pid })))
        }

        const campaign = await CampaignService.updateCampaign(campaignId, body, profile.organization_id)

        await logAudit(admin, user.id, profile.full_name, 'campaign.updated', 'campaign', campaignId, { updated_fields: Object.keys(body) })

        return handleCORS(NextResponse.json({ campaign }))
    } catch (e) {
        console.error('[PUT /campaigns/[id]]', e)
        return handleCORS(NextResponse.json({ error: e.message }, { status: e.status || 500 }))
    }
})

export async function DELETE(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

        const canDelete = await hasDashboardPermission(user.id, 'delete_campaigns')
        if (!canDelete) {
            return handleCORS(NextResponse.json({ success: false, message: "You don't have permission to delete campaigns" }, { status: 200 }))
        }

        const admin = createAdminClient()
        const { data: profile } = await admin.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
        if (!profile) return handleCORS(NextResponse.json({ error: 'Profile not found' }, { status: 404 }))

        const { id } = await params

        const existing = await assertCampaignOwnership(admin, id, profile.organization_id)

        // Block deletion of active campaigns
        if (['running', 'paused'].includes(existing.status)) {
            return handleCORS(NextResponse.json({ error: 'CAMPAIGN_ACTIVE', message: 'Cancel the campaign before deleting' }, { status: 400 }))
        }

        const { count: enrolledCount } = await admin.from('campaign_leads').select('id', { count: 'exact', head: true }).eq('campaign_id', id)
        const { count: callCount } = await admin.from('call_logs').select('id', { count: 'exact', head: true }).eq('campaign_id', id)

        // Hard delete ONLY if scheduled AND no calls have been made
        // If it's completed/cancelled OR calls were made, we archive to preserve history
        if (existing.status !== 'scheduled' || callCount > 0) {
            // Soft-delete: preserve history
            await admin.from('campaigns').update({ 
                status: 'archived', 
                archived_at: new Date().toISOString(), 
                archived_by: user.id, 
                updated_at: new Date().toISOString() 
            }).eq('id', id)
            await logAudit(admin, user.id, profile.full_name, 'campaign.archived_via_delete', 'campaign', id, { previous_status: existing.status })
            return handleCORS(NextResponse.json({ success: true, archived: true, message: 'Campaign archived (data preserved)' }))
        }

        // Hard delete for scheduled with no history
        // First delete dependent records that might not cascade
        await admin.from('campaign_leads').delete().eq('campaign_id', id)
        await admin.from('call_queue').delete().eq('campaign_id', id)
        await admin.from('call_logs').delete().eq('campaign_id', id)
        await admin.from('campaigns').delete().eq('id', id)

        await logAudit(admin, user.id, profile.full_name, 'campaign.deleted', 'campaign', id, {})

        return handleCORS(NextResponse.json({ success: true, deleted: true }))
    } catch (e) {
        console.error('[DELETE /campaigns/[id]]', e)
        return handleCORS(NextResponse.json({ error: e.message }, { status: e.status || 500 }))
    }
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
