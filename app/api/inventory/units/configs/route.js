import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'
import { withAuth } from '@/lib/middleware/withAuth'
import { UnitService } from '@/services/unit.service'

/**
 * GET /api/inventory/units/configs
 * Fetch all configs for a project
 */
export const GET = withAuth(async (request, context) => {
    try {
        const { profile } = context
        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('project_id')

        if (!projectId) return corsJSON({ error: 'Project ID required' }, { status: 400 })

        const configs = await UnitService.getUnitConfigs(projectId, profile.organization_id)
        return corsJSON({ configs })
    } catch (error) {
        return corsJSON({ error: error.message }, { status: 500 })
    }
})

/**
 * POST /api/inventory/units/configs
 * Create a new unit configuration
 */
export const POST = withAuth(async (request, context) => {
    try {
        const { user, profile } = context
        const body = await request.json()

        const config = await UnitService.saveUnitConfig(
            body,
            profile.organization_id,
            user.id
        )

        return corsJSON({ config }, { status: 201 })
    } catch (error) {
        return corsJSON({ error: error.message }, { status: 500 })
    }
})
