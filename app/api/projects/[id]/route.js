import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'

function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
}

/* ===================== UPDATE PROJECT ===================== */
import { withAuth } from '@/lib/middleware/withAuth'
import { ProjectService } from '@/services/project.service'
import { UnitService } from '@/services/unit.service'

export const PUT = withAuth(async (request, { params, user, profile }) => {
    try {
        const { id } = await params
        const body = await request.json()

        if (!profile?.organization_id) {
            return handleCORS(
                NextResponse.json({ error: 'Profile check failed' }, { status: 404 })
            )
        }

        console.log('[Project Update] Profile found:', profile.organization_id, 'Project ID:', id)

        // Fetch project (IMPORTANT)
        const adminClient = createAdminClient()
        const { data: existing } = await adminClient
            .from('projects')
            .select('id, name, image_path, created_by, is_draft')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!existing) {
            console.error('[Project Update] Project not found or org mismatch. ProjectId:', id, 'OrgId:', profile.organization_id)
            return handleCORS(
                NextResponse.json({ error: 'Project not found' }, { status: 404 })
            )
        }

        // Permission check
        const isOwner = existing.created_by === user.id
        const canEdit = await hasDashboardPermission(user.id, 'edit_projects')

        if (
            !isOwner &&
            !['super_admin', 'platform_admin'].includes(profile.role) &&
            !canEdit
        ) {
            return handleCORS(
                NextResponse.json({
                    success: false,
                    message: 'You don\'t have permission to edit this project'
                }, { status: 200 })
            )
        }

        // 5️⃣ Build updates
        const updates = {
            updated_at: new Date().toISOString()
        }

        if (body.name !== undefined) updates.name = body.name
        if (body.description !== undefined) updates.description = body.description
        if (body.address !== undefined) updates.address = body.address
        if (body.image_url !== undefined) updates.image_url = body.image_url
        if (body.image_path !== undefined) updates.image_path = body.image_path

        if (body.total_units !== undefined) updates.total_units = body.total_units
        if (body.project_status !== undefined) updates.project_status = body.project_status
        if (body.is_draft !== undefined) updates.is_draft = body.is_draft
        if (body.show_in_inventory !== undefined) updates.show_in_inventory = body.show_in_inventory
        if (body.public_visibility !== undefined) updates.public_visibility = body.public_visibility
        if (body.possession_date !== undefined) updates.possession_date = body.possession_date || null
        if (body.completion_date !== undefined) updates.completion_date = body.completion_date || null
        if (body.rera_number !== undefined) updates.rera_number = body.rera_number || null
        if (body.amenities !== undefined) updates.amenities = Array.isArray(body.amenities) ? body.amenities : []

        // Location — support both flat and legacy real_estate nested shape
        const re = body.real_estate || {}
        const loc = re.location || {}
        const city     = loc.city     ?? body.city
        const state    = loc.state    ?? body.state
        const country  = loc.country  ?? body.country
        const pincode  = loc.pincode  ?? body.pincode
        const locality = loc.locality ?? body.locality
        const landmark = loc.landmark ?? body.landmark
        if (city     !== undefined) updates.city     = city     || null
        if (state    !== undefined) updates.state    = state    || null
        if (country  !== undefined) updates.country  = country  || 'India'
        if (pincode  !== undefined) updates.pincode  = pincode  || null
        if (locality !== undefined) updates.locality = locality || null
        if (landmark !== undefined) updates.landmark = landmark || null

        // Recalculate pricing from unit_types if provided (for syncUnitConfigs)
        if (Array.isArray(body.unit_types)) {
            const prices = body.unit_types.map(u => Number(u.price || u.base_price)).filter(p => !isNaN(p) && p > 0)
            updates.min_price = prices.length ? Math.min(...prices) : null
            updates.max_price = prices.length ? Math.max(...prices) : null
        }

        // 6️⃣ Update project
        const { data: project, error } = await adminClient
            .from('projects')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .select()
            .single()

        if (error) throw error

        // Sync Unit Configs to unit_configs table if provided
        if (body.unit_types) {
            await ProjectService.syncUnitConfigs(project.id, profile.organization_id, body.unit_types, user.id)
        }

        // 7️⃣ Auto-delete old image if replaced
        if (
            existing.image_path &&
            body.image_path &&
            existing.image_path !== body.image_path
        ) {
            await supabase.storage
                .from('project-images')
                .remove([existing.image_path])
        }

        // 9️⃣ Audit
        try {
            await logAudit(
                supabase,
                user.id,
                profile.full_name || user.email,
                'project.edit',
                'project',
                project.id,
                { name: project.name }
            )
        } catch { }

        /* 
        // Manual sync is deprecated in favor of Visual Unit Painting
        try {
            await UnitService.syncProjectInventory(project, user.id)
        } catch (syncError) {
            console.error('Failed to sync project inventory:', syncError)
        }
        */

        return handleCORS(NextResponse.json({ project }))
    } catch (e) {
        console.error('projects/:id PUT error:', e)
        return handleCORS(
            NextResponse.json({ error: e.message }, { status: 500 })
        )
    }
})



/* ===================== DELETE PROJECT ===================== */
export async function DELETE(request, { params }) {
    try {
        const { id } = await params
        const supabase = await createServerSupabaseClient()

        // 1️⃣ Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return handleCORS(
                NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            )
        }

        // 2️⃣ Profile
        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id, full_name, role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return handleCORS(NextResponse.json({ error: 'Profile not found' }, { status: 404 }))
        }

        // 3️⃣ Fetch project
        const { data: project } = await adminClient
            .from('projects')
            .select('id, name, image_path, created_by')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!project) {
            return handleCORS(
                NextResponse.json({ error: 'Project not found' }, { status: 404 })
            )
        }

        // 4️⃣ Permission check
        const isOwner = project.created_by === user.id
        const canDelete = await hasDashboardPermission(user.id, 'delete_projects')

        // 4️⃣ Handle active campaigns — auto-pause instead of blocking
        const { data: activeCampaigns } = await adminClient
            .from('campaigns')
            .select('id, name')
            .eq('project_id', id)
            .eq('organization_id', profile.organization_id)
            .in('status', ['running', 'paused'])

        const pausedCampaignNames = []
        if (activeCampaigns?.length > 0) {
            const campaignIds = activeCampaigns.map(c => c.id)
            const now2 = new Date().toISOString()
            await Promise.all([
                adminClient.from('campaigns')
                    .update({ status: 'paused', paused_at: now2, updated_at: now2 })
                    .in('id', campaignIds),
                adminClient.from('call_queue')
                    .update({ status: 'failed', last_error: 'project_archived', updated_at: now2 })
                    .in('campaign_id', campaignIds)
                    .eq('status', 'queued'),
                adminClient.from('campaign_leads')
                    .update({ status: 'skipped', skip_reason: 'project_archived', updated_at: now2 })
                    .in('campaign_id', campaignIds)
                    .in('status', ['enrolled', 'queued'])
            ])
            pausedCampaignNames.push(...activeCampaigns.map(c => c.name))
        }

        // 5️⃣ Perform cascading archival
        const now = new Date().toISOString()

        const [projectUpdate, , leadsUpdate] = await Promise.all([
            adminClient.from('projects')
                .update({ archived_at: now, archived_by: user.id, public_visibility: false })
                .eq('id', id)
                .eq('organization_id', profile.organization_id),
            adminClient.from('campaigns')
                .update({ archived_at: now, archived_by: user.id })
                .eq('project_id', id)
                .eq('organization_id', profile.organization_id),
            adminClient.from('leads')
                .update({ archived_at: now, archived_by: user.id })
                .eq('project_id', id)
                .eq('organization_id', profile.organization_id),
            adminClient.from('units')
                .update({ archived_at: now, archived_by: user.id })
                .eq('project_id', id)
                .eq('organization_id', profile.organization_id)
        ])

        if (projectUpdate.error) throw projectUpdate.error

        // Clean up campaign_leads for leads that just got archived
        if (leadsUpdate && !leadsUpdate.error) {
            const { data: archivedLeads } = await adminClient
                .from('leads')
                .select('id')
                .eq('project_id', id)
                .eq('organization_id', profile.organization_id)
                .not('archived_at', 'is', null)

            if (archivedLeads?.length > 0) {
                const leadIds = archivedLeads.map(l => l.id)
                await adminClient.from('campaign_leads')
                    .update({ status: 'archived', skip_reason: 'lead_archived', updated_at: now })
                    .in('lead_id', leadIds)
                    .in('status', ['enrolled', 'queued'])
            }
        }

        try {
            await logAudit(supabase, user.id, profile.full_name || user.email, 'project.archive', 'project', id, {
                name: project.name,
                cascade_archived: true,
                campaigns_auto_paused: pausedCampaignNames
            })
        } catch { }

        return handleCORS(NextResponse.json({
            message: 'Project and all associated data archived successfully.',
            warnings: pausedCampaignNames.length > 0
                ? [`${pausedCampaignNames.length} campaign(s) auto-paused: ${pausedCampaignNames.join(', ')}`]
                : []
        }))
    } catch (e) {
        console.error('projects/:id DELETE error:', e)
        return handleCORS(
            NextResponse.json({ error: e.message }, { status: 500 })
        )
    }
}




/* ===================== GET PROJECT ===================== */
export async function GET(request, { params }) {
    try {
        const { id } = await params // ✅ FIX
        const supabase = await createServerSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
        }

        // 2️⃣ Profile
        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return handleCORS(NextResponse.json({ error: 'Profile not found' }, { status: 404 }))
        }

        const canView = await hasDashboardPermission(user.id, 'view_projects')
        if (!canView) {
            return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
        }

        const project = await ProjectService.getProjectById(id, profile.organization_id)

        if (!project) {
            return handleCORS(NextResponse.json({ error: 'Project not found' }, { status: 404 }))
        }

        return handleCORS(NextResponse.json({ project }))
    } catch (e) {
        console.error('projects/:id GET error:', e)
        return handleCORS(NextResponse.json({ error: e.message }, { status: 500 }))
    }
}
