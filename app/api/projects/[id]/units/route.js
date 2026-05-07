import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const { id } = await params

        // Get user's organization
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        // Verify project belongs to user's organization
        const { data: project } = await adminClient
            .from('projects')
            .select('id')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!project) {
            return corsJSON({ error: 'Project not found' }, { status: 404 })
        }

        // Fetch all units for this project with configuration details
        const { data: units, error } = await adminClient
            .from('units')
            .select('*, config:unit_configs(*)')
            .eq('project_id', id)
            .order('unit_number', { ascending: true })

        if (error) throw error

        return corsJSON({ units: units || [] })
    } catch (e) {
        console.error('projects/[id]/units GET error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
