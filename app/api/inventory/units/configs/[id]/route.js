import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'
import { withAuth } from '@/lib/middleware/withAuth'
import { UnitService } from '@/services/unit.service'

/**
 * PUT /api/inventory/units/configs/[id]
 * Update a unit configuration
 */
export const PUT = withAuth(async (request, context) => {
    try {
        const { user, profile, params } = context
        const body = await request.json()
        const configId = (await params).id

        const config = await UnitService.saveUnitConfig(
            { ...body, id: configId },
            profile.organization_id,
            user.id
        )

        return corsJSON({ config })
    } catch (error) {
        return corsJSON({ error: error.message }, { status: 500 })
    }
})

/**
 * DELETE /api/inventory/units/configs/[id]
 * Delete a unit configuration
 */
export const DELETE = withAuth(async (request, context) => {
    try {
        const { profile, params } = context
        const configId = (await params).id
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('unit_configs')
            .delete()
            .eq('id', configId)
            .eq('organization_id', profile.organization_id)

        if (error) throw error

        return corsJSON({ success: true })
    } catch (error) {
        return corsJSON({ error: error.message }, { status: 500 })
    }
})
