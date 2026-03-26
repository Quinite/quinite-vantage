import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'
import { withAuth } from '@/lib/middleware/withAuth'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'

function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
}

export const POST = withAuth(async (request, { params, user, profile }) => {
    try {
        const { id } = await params

        if (!profile?.organization_id) {
            return handleCORS(NextResponse.json({ error: 'Profile not found' }, { status: 404 }))
        }

        const adminClient = createAdminClient()
        
        // 1. Fetch project to ensure it exists and belongs to org (and is archived)
        const { data: project } = await adminClient
            .from('projects')
            .select('id, name, archived_at')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!project) {
            return handleCORS(NextResponse.json({ error: 'Project not found' }, { status: 404 }))
        }

        if (!project.archived_at) {
            return handleCORS(NextResponse.json({ error: 'Project is already active' }, { status: 400 }))
        }

        // 2. Permission check
        const canEdit = await hasDashboardPermission(user.id, 'edit_projects')
        if (!canEdit && profile.role !== 'super_admin' && profile.role !== 'platform_admin') {
            return handleCORS(NextResponse.json({ error: 'Permission denied' }, { status: 403 }))
        }

        // 3. Restore project
        const { error: updateError } = await adminClient
            .from('projects')
            .update({
                archived_at: null,
                archived_by: null
            })
            .eq('id', id)
            .eq('organization_id', profile.organization_id)

        if (updateError) throw updateError

        const supabase = await createServerSupabaseClient()
        // 4. Audit
        try {
            await logAudit(
                supabase,
                user.id,
                profile.full_name || user.email,
                'project.restore',
                'project',
                id,
                { name: project.name }
            )
        } catch { }

        return handleCORS(NextResponse.json({ message: 'Project restored to active list' }))
    } catch (e) {
        console.error('projects/:id/restore error:', e)
        return handleCORS(NextResponse.json({ error: e.message }, { status: 500 }))
    }
})

export async function OPTIONS() {
    return handleCORS(new Response(null, { status: 204 }))
}
