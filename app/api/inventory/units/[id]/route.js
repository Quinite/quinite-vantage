import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

/**
 * PATCH /api/inventory/units/[id]
 * Update unit fields
 */
export async function PATCH(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) return corsJSON({ error: 'Unauthorized' }, { status: 401 })

        const { hasDashboardPermission } = await import('@/lib/dashboardPermissions')
        const canEdit = await hasDashboardPermission(user.id, 'edit_inventory')
        const canManage = await hasDashboardPermission(user.id, 'manage_inventory')

        if (!canEdit && !canManage) {
            return corsJSON({
                success: false,
                message: 'You don\'t have permission to edit inventory'
            }, { status: 200 })
        }

        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) return corsJSON({ error: 'Organization not found' }, { status: 400 })

        const { id } = await params
        const body = await request.json()

        // Build update object with all allowed fields
        const allowedUpdates = {
            updated_at: new Date().toISOString()
        }

        // Mapping fields from body to schema
        const fields = [
            'config_id', 'tower_id', 'floor_number', 'unit_number', 'status',
            'transaction_type', 'base_price', 'floor_rise_price', 'plc_price',
            'carpet_area', 'built_up_area', 'super_built_up_area', 'plot_area',
            'bedrooms', 'bathrooms', 'balconies', 'facing',
            'is_corner', 'is_vastu_compliant', 'possession_date', 'completion_date',
            'construction_status', 'is_archived', 'metadata', 'lead_id'
        ]

        fields.forEach(field => {
            if (body[field] !== undefined) allowedUpdates[field] = body[field]
        })

        // amenities: null = inherit from config, [] = no features, array = override
        if (body.amenities !== undefined) allowedUpdates.amenities = body.amenities

        // Recalculate total_price if prices changed
        if (allowedUpdates.base_price !== undefined || allowedUpdates.floor_rise_price !== undefined || allowedUpdates.plc_price !== undefined) {
            // Need current values if not provided
            const { data: currentUnit } = await adminClient.from('units').select('*').eq('id', id).single()
            const base = allowedUpdates.base_price ?? currentUnit.base_price ?? 0
            const rise = allowedUpdates.floor_rise_price ?? currentUnit.floor_rise_price ?? 0
            const plc = allowedUpdates.plc_price ?? currentUnit.plc_price ?? 0
            allowedUpdates.total_price = Number(base) + Number(rise) + Number(plc)
        }

        const { data: unit, error } = await adminClient
            .from('units')
            .update(allowedUpdates)
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .select()
            .single()

        if (error) throw error

        return corsJSON({ unit })
    } catch (e) {
        console.error('units PATCH error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}

/**
 * DELETE /api/inventory/units/[id]
 * Delete a unit
 */
export async function DELETE(request, { params }) {
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
        const { id } = await params

        // Verify organization ownership
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) return corsJSON({ error: 'Organization not found' }, { status: 400 })

        // Delete
        const { error: deleteError } = await adminClient
            .from('units')
            .delete()
            .eq('id', id)
            .eq('organization_id', profile.organization_id)

        if (deleteError) throw deleteError

        return corsJSON({ success: true })
    } catch (e) {
        console.error('units DELETE error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
