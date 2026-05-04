import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/permissions'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { withAuth } from '@/lib/middleware/withAuth'
import { CampaignService } from '@/services/campaign.service'

function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
}

// Fields that cannot be changed once a campaign is running/paused
const IMMUTABLE_WHEN_RUNNING = new Set(['project_id', 'project_ids', 'start_date', 'end_date'])

// Fields that are allowed to change while running/paused
const ALLOWED_WHEN_RUNNING = new Set([
    'name', 'description', 'time_start', 'time_end',
    'credit_cap', 'ai_script', 'call_settings', 'dnd_compliance'
])

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

        const { data, error } = await admin
            .from('campaigns')
            .select('*, project:projects!campaigns_project_id_fkey(id, name), campaign_projects(project_id, project:projects(id, name, description, city, locality, project_status, possession_date))')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .single()

        if (error || !data) return handleCORS(NextResponse.json({ error: 'Campaign not found' }, { status: 404 }))

        const campaign = {
            ...data,
            projects: data.campaign_projects?.map(cp => cp.project).filter(Boolean)
                || (data.project ? [data.project] : [])
        }

        return handleCORS(NextResponse.json({ campaign }))
    } catch (e) {
        console.error('[GET /campaigns/[id]]', e)
        return handleCORS(NextResponse.json({ error: e.message }, { status: 500 }))
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
        const { data: existing } = await admin.from('campaigns').select('*').eq('id', campaignId).eq('organization_id', profile.organization_id).single()
        if (!existing) return handleCORS(NextResponse.json({ error: 'Campaign not found' }, { status: 404 }))

        let body = await request.json()

        // ── State-based edit guards ───────────────────────────────────────────
        if (['completed', 'cancelled', 'archived'].includes(existing.status)) {
            return handleCORS(NextResponse.json({ error: 'CAMPAIGN_IMMUTABLE', message: `Cannot edit a ${existing.status} campaign` }, { status: 400 }))
        }

        if (['running', 'paused'].includes(existing.status)) {
            // Block immutable fields
            const blockedFields = Object.keys(body).filter(k => IMMUTABLE_WHEN_RUNNING.has(k))
            if (blockedFields.length > 0) {
                return handleCORS(NextResponse.json({ error: 'FIELD_LOCKED', message: `Cannot change ${blockedFields.join(', ')} on a running/paused campaign`, blocked_fields: blockedFields }, { status: 400 }))
            }

            // Filter to only allowed fields
            const filteredBody = {}
            for (const k of ALLOWED_WHEN_RUNNING) {
                if (body[k] !== undefined) filteredBody[k] = body[k]
            }

            // Audit sensitive mid-run changes
            const sensitiveChanged = ['ai_script', 'call_settings'].filter(k => filteredBody[k] !== undefined)
            if (sensitiveChanged.length > 0) {
                await logAudit(admin, user.id, profile.full_name, 'campaign.settings_changed_while_running', 'campaign', campaignId, {
                    changed: sensitiveChanged,
                    note: 'Changes take effect on next call'
                })
            }

            body = filteredBody
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
        return handleCORS(NextResponse.json({ error: e.message }, { status: 500 }))
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

        const { data: existing } = await admin.from('campaigns').select('id, status').eq('id', id).eq('organization_id', profile.organization_id).single()
        if (!existing) return handleCORS(NextResponse.json({ error: 'Campaign not found' }, { status: 404 }))

        // Block deletion of active campaigns
        if (['running', 'paused'].includes(existing.status)) {
            return handleCORS(NextResponse.json({ error: 'CAMPAIGN_ACTIVE', message: 'Cancel the campaign before deleting' }, { status: 400 }))
        }

        // Check if any campaign_leads history exists
        const { count: enrolledCount } = await admin.from('campaign_leads').select('id', { count: 'exact', head: true }).eq('campaign_id', id)

        if (['completed', 'cancelled'].includes(existing.status) || enrolledCount > 0) {
            // Soft-delete: preserve history
            await admin.from('campaigns').update({ status: 'archived', archived_at: new Date().toISOString(), archived_by: user.id, updated_at: new Date().toISOString() }).eq('id', id)
            await logAudit(admin, user.id, profile.full_name, 'campaign.archived_via_delete', 'campaign', id, { previous_status: existing.status })
            return handleCORS(NextResponse.json({ success: true, archived: true, message: 'Campaign archived (data preserved)' }))
        }

        // Hard delete only for draft/scheduled with no history
        await admin.from('call_logs').delete().eq('campaign_id', id)
        await admin.from('campaigns').delete().eq('id', id)

        await logAudit(admin, user.id, profile.full_name, 'campaign.deleted', 'campaign', id, {})

        return handleCORS(NextResponse.json({ success: true, deleted: true }))
    } catch (e) {
        console.error('[DELETE /campaigns/[id]]', e)
        return handleCORS(NextResponse.json({ error: e.message }, { status: 500 }))
    }
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
