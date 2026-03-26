import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'
import path from 'path'
import fs from 'fs'
import Ajv from 'ajv'
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
import { PropertyService } from '@/services/property.service'

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
        if (body.unit_types !== undefined) updates.unit_types = body.unit_types
        if (body.project_status !== undefined) updates.project_status = body.project_status
        if (body.is_draft !== undefined) updates.is_draft = body.is_draft
        
        if (body.show_in_inventory !== undefined) updates.show_in_inventory = body.show_in_inventory
        if (body.public_visibility !== undefined) updates.public_visibility = body.public_visibility
        if (body.possession_date !== undefined) updates.possession_date = body.possession_date || null
        if (body.completion_date !== undefined) updates.completion_date = body.completion_date || null
        
        // Validate optional real_estate payload (Skip if draft)
        const realEstate = body.real_estate || (body.metadata && body.metadata.real_estate)
        
        if (realEstate?.location) {
            if (realEstate.location.city !== undefined) updates.city = realEstate.location.city || null
            if (realEstate.location.state !== undefined) updates.state = realEstate.location.state || null
            if (realEstate.location.country !== undefined) updates.country = realEstate.location.country || 'India'
            if (realEstate.location.pincode !== undefined) updates.pincode = realEstate.location.pincode || null
            if (realEstate.location.locality !== undefined) updates.locality = realEstate.location.locality || null
            if (realEstate.location.landmark !== undefined) updates.landmark = realEstate.location.landmark || null
        }

        // Add pricing calculations if unit_types changed
        if (updates.unit_types) {
            const min = Math.min(...updates.unit_types.map(u => Number(u.price)).filter(p => !isNaN(p) && p > 0))
            const max = Math.max(...updates.unit_types.map(u => Number(u.price)).filter(p => !isNaN(p) && p > 0))
            updates.min_price = min === Infinity ? null : min
            updates.max_price = max === -Infinity ? null : max
        }
        
        const isDraft = body.is_draft !== undefined ? body.is_draft : existing.is_draft === true
        
        if (realEstate && !isDraft) {
            try {
                const schemaPath = path.join(process.cwd(), 'lib', 'schemas', 'realEstateProperty.schema.json')
                const schemaRaw = fs.readFileSync(schemaPath, 'utf8')
                const schema = JSON.parse(schemaRaw)
                const ajv = new Ajv({ allErrors: true, strict: false })
                const validate = ajv.compile(schema)
                const valid = validate(realEstate)
                if (!valid) {
                    return handleCORS(NextResponse.json({ error: 'Invalid real_estate payload', details: validate.errors }, { status: 400 }))
                }
                updates.metadata = { ...(body.metadata || {}), real_estate: realEstate }
            } catch (err) {
                console.error('Schema validation error:', err)
                return handleCORS(NextResponse.json({ error: 'Schema validation failed' }, { status: 500 }))
            }
        } else if (realEstate && isDraft) {
            // Still update the metadata if it's a draft, just skip validation
            updates.metadata = { ...(body.metadata || {}), real_estate: realEstate }
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

        // Automatic Inventory Sync
        try {
            await PropertyService.syncProjectInventory(project, user.id)
        } catch (syncError) {
            console.error('Failed to sync project inventory:', syncError)
        }

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

        // 4️⃣ Check for running campaigns (Archive Safety Check)
        const { data: runningCampaigns } = await adminClient
            .from('campaigns')
            .select('id, name')
            .eq('project_id', id)
            .eq('organization_id', profile.organization_id)
            .eq('status', 'running')
        
        if (runningCampaigns?.length > 0) {
            return handleCORS(
                NextResponse.json({ 
                    error: `Action Blocked: Campaigns are currently running for this project. Please pause or complete them before archiving.`,
                    running_campaigns: runningCampaigns
                }, { status: 400 })
            )
        }

        // 5️⃣ Perform cascading archival
        const now = new Date().toISOString()
        
        // Use Promise.all for speed since we don't have built-in cross-table transactions easily accessible here
        // (For production scale, a Postgres RPC or function would be better)
        const [
          projectUpdate,
          campaignUpdate,
          leadsUpdate,
          propertyUpdate
        ] = await Promise.all([
          adminClient
            .from('projects')
            .update({ 
                archived_at: now, 
                archived_by: user.id,
                public_visibility: false
            })
            .eq('id', id)
            .eq('organization_id', profile.organization_id),
          adminClient
            .from('campaigns')
            .update({ archived_at: now, archived_by: user.id })
            .eq('project_id', id)
            .eq('organization_id', profile.organization_id),
          adminClient
            .from('leads')
            .update({ archived_at: now, archived_by: user.id })
            .eq('project_id', id)
            .eq('organization_id', profile.organization_id),
          adminClient
            .from('properties')
            .update({ archived_at: now, archived_by: user.id })
            .eq('project_id', id)
            .eq('organization_id', profile.organization_id)
        ])

        if (projectUpdate.error) throw projectUpdate.error

        // 8️⃣ Audit with enriched metadata
        try {
            await logAudit(
                supabase,
                user.id,
                profile.full_name || user.email,
                'project.archive',
                'project',
                id,
                { 
                    name: project.name,
                    cascade_archived: true,
                    archived_at: now
                }
            )
        } catch { }

        return handleCORS(
            NextResponse.json({ message: 'Project and all associated data archived successfully.' })
        )
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

        const { data: project, error } = await adminClient
            .from('projects')
            .select('*')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .is('archived_at', null)
            .single()

        if (error) throw error

        return handleCORS(NextResponse.json({ project }))
    } catch (e) {
        console.error('projects/:id GET error:', e)
        return handleCORS(NextResponse.json({ error: e.message }, { status: 500 }))
    }
}
