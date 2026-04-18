import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { corsJSON } from '@/lib/cors'

/**
 * DELETE endpoint to clean up orphaned units
 * (units whose project_id doesn't exist in projects table)
 */
export async function DELETE(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()

        // Get user's organization
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        // Only allow admins to run cleanup
        if (!['super_admin', 'platform_admin', 'admin'].includes(profile.role)) {
            return corsJSON({ error: 'Forbidden - Admin access required' }, { status: 403 })
        }

        // Get all units for this organization
        const { data: units, error: propsError } = await adminClient
            .from('units')
            .select('id, project_id')
            .eq('organization_id', profile.organization_id)

        if (propsError) throw propsError

        // Get all valid project IDs
        const { data: projects, error: projectsError } = await adminClient
            .from('projects')
            .select('id')
            .eq('organization_id', profile.organization_id)

        if (projectsError) throw projectsError

        const validProjectIds = new Set(projects.map(p => p.id))

        // Find orphaned units
        const orphanedUnits = units.filter(prop => !validProjectIds.has(prop.project_id))
        const orphanedIds = orphanedUnits.map(p => p.id)

        if (orphanedIds.length === 0) {
            return corsJSON({
                message: 'No orphaned units found',
                deleted: 0
            })
        }

        // Delete orphaned units
        const { error: deleteError } = await adminClient
            .from('units')
            .delete()
            .in('id', orphanedIds)
            .eq('organization_id', profile.organization_id)

        if (deleteError) throw deleteError

        return corsJSON({
            message: `Successfully deleted ${orphanedIds.length} orphaned units`,
            deleted: orphanedIds.length,
            orphanedProjectIds: [...new Set(orphanedUnits.map(p => p.project_id))]
        })
    } catch (e) {
        console.error('cleanup-orphaned DELETE error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
