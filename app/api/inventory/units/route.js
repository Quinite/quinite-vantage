import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { withAuth } from '@/lib/middleware/withAuth'
import { UnitService } from '@/services/unit.service'

/**
 * GET /api/inventory/units
 * Fetch units with filters
 */
export const GET = withAuth(async (request, context) => {
    try {
        const { user, profile } = context

        const { hasDashboardPermission } = await import('@/lib/dashboardPermissions')
        const canView = await hasDashboardPermission(user.id, 'view_inventory')
        if (!canView) {
            return corsJSON({
                success: false,
                message: 'You don\'t have permission to view inventory'
            }, { status: 200 })
        }

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        const { searchParams } = new URL(request.url)
        const filters = {
            status: searchParams.get('status'),
            category: searchParams.get('category'),
            projectId: searchParams.get('project_id')
        }

        const units = await UnitService.getUnits(profile.organization_id, filters)

        return corsJSON({ units: units || [] })
    } catch (error) {
        console.error('Error fetching units:', error)
        return corsJSON({ error: error.message }, { status: 500 })
    }
})

/**
 * POST /api/inventory/units
 * Create a new unit
 */
export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) return corsJSON({ error: 'Unauthorized' }, { status: 401 })

        const { hasDashboardPermission } = await import('@/lib/dashboardPermissions')
        const canManage = await hasDashboardPermission(user.id, 'manage_inventory')
        if (!canManage) {
            return corsJSON({
                success: false,
                message: 'You don\'t have permission to manage inventory'
            }, { status: 200 })
        }

        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id, full_name')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) return corsJSON({ error: 'Organization not found' }, { status: 400 })

        const body = await request.json()
        const {
            projectId, tower_id, config_id,
            floor_number, unit_number, transaction_type,
            status, base_price, floor_rise_price, plc_price,
            carpet_area, built_up_area, super_built_up_area, plot_area,
            bedrooms, bathrooms, balconies, facing,
            is_corner, is_vastu_compliant,
            possession_date, completion_date, construction_status
        } = body

        if (!unit_number || !projectId) {
            return corsJSON({ error: 'Missing required fields' }, { status: 400 })
        }

        // Insert Unit
        const { data: unit, error } = await adminClient
            .from('units')
            .insert({
                organization_id: profile.organization_id,
                project_id: projectId,
                config_id: config_id || null,
                tower_id: tower_id || null,
                floor_number: floor_number !== undefined ? Number(floor_number) : null,
                unit_number,
                transaction_type: transaction_type || 'sell',
                status: status || 'available',
                base_price: Number(base_price) || 0,
                floor_rise_price: Number(floor_rise_price) || 0,
                plc_price: Number(plc_price) || 0,
                total_price: (Number(base_price) || 0) + (Number(floor_rise_price) || 0) + (Number(plc_price) || 0),
                carpet_area: Number(carpet_area) || 0,
                built_up_area: Number(built_up_area) || 0,
                super_built_up_area: Number(super_built_up_area) || 0,
                plot_area: Number(plot_area) || 0,
                bedrooms: Number(bedrooms) || 0,
                bathrooms: Number(bathrooms) || 0,
                balconies: Number(balconies) || 0,
                facing: facing || null,
                is_corner: is_corner || false,
                is_vastu_compliant: is_vastu_compliant || false,
                possession_date: possession_date || null,
                completion_date: completion_date || null,
                construction_status: construction_status || 'under_construction',
                created_by: user.id,
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        // Audit Log
        try {
            await logAudit(
                supabase,
                user.id,
                profile.full_name || user.email,
                'unit.create',
                'unit',
                unit.id,
                { unit_number: unit.unit_number }
            )
        } catch (e) {
            console.error('Audit log failed', e)
        }

        return corsJSON({ unit }, { status: 201 })
    } catch (e) {
        console.error('units POST error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
