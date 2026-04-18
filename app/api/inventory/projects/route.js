import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { corsJSON } from '@/lib/cors'

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        const { hasDashboardPermission } = await import('@/lib/dashboardPermissions')
        const canView = await hasDashboardPermission(user.id, 'view_inventory')
        if (!canView) {
            return corsJSON({ error: 'Forbidden - Missing "view_inventory" permission' }, { status: 403 })
        }

        const adminClient = createAdminClient()

        // Get user's organization
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        // Fetch projects with show_in_inventory = true
        const { data: projects, error } = await adminClient
            .from('projects')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .eq('show_in_inventory', true)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Fetch all units for these projects to calculate real stats
        const { data: units, error: propsError } = await adminClient
            .from('units')
            .select('id, project_id, status')
            .eq('organization_id', profile.organization_id)

        if (propsError) throw propsError

        // Calculate real-time stats for each project
        const projectsWithStats = (projects || []).map(project => {
            const projectUnits = (units || []).filter(p => p.project_id === project.id)
            const totalCount = projectUnits.length
            const soldCount = projectUnits.filter(p => p.status === 'sold').length
            const reservedCount = projectUnits.filter(p => p.status === 'reserved').length
            const availableCount = projectUnits.filter(p => p.status === 'available').length

            return {
                ...project,
                total_units: totalCount > 0 ? totalCount : (project.total_units || 0),
                sold_units: soldCount,
                reserved_units: reservedCount,
                available_units: availableCount
            }
        })

        return corsJSON({ projects: projectsWithStats })
    } catch (e) {
        console.error('inventory/projects GET error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
