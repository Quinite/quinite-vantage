import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { corsJSON } from '@/lib/cors'

export async function PATCH(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const { id } = await params
        const body = await request.json()
        const { status, lead_id } = body

        // Validate status
        const validStatuses = ['available', 'reserved', 'sold']
        if (!status || !validStatuses.includes(status)) {
            return corsJSON({ error: 'Invalid status. Must be: available, reserved, or sold' }, { status: 400 })
        }

        // Get user's organization
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        // Verify unit belongs to user's organization
        const { data: unit } = await adminClient
            .from('units')
            .select('id, organization_id, project_id')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!unit) {
            return corsJSON({ error: 'Unit not found' }, { status: 404 })
        }

        // Update unit status
        const { data: updated, error } = await adminClient
            .from('units')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Handle lead linking / unlinking
        if (lead_id && (status === 'reserved' || status === 'sold')) {
            // First clear any previous lead linked to this unit
            await adminClient
                .from('leads')
                .update({ unit_id: null })
                .eq('unit_id', id)
                .neq('id', lead_id)

            // Link the selected lead to this unit
            const { error: leadError } = await adminClient
                .from('leads')
                .update({ unit_id: id })
                .eq('id', lead_id)
                .eq('organization_id', profile.organization_id)

            if (leadError) console.error('Failed to link lead to unit:', leadError)
        } else if (status === 'available') {
            // Unlink all leads from this unit when it becomes available again
            await adminClient
                .from('leads')
                .update({ unit_id: null })
                .eq('unit_id', id)
        }

        // Fetch updated project metrics if unit is linked to a project
        let projectMetrics = null
        if (unit.project_id) {
            const { data: project } = await adminClient
                .from('projects')
                .select('total_units, sold_units, reserved_units, available_units')
                .eq('id', unit.project_id)
                .single()

            projectMetrics = project
        }

        return corsJSON({
            unit: updated,
            projectMetrics,
            message: 'Unit status updated successfully'
        })
    } catch (e) {
        console.error('units/[id]/status PATCH error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
