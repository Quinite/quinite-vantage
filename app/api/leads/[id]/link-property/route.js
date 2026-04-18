import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) return corsJSON({ error: 'Unauthorized' }, { status: 401 })

        const { id: leadId } = await params
        const { unit_id } = await request.json()

        if (!unit_id) return corsJSON({ error: 'Unit ID required' }, { status: 400 })

        const adminClient = createAdminClient()

        // 1. Verify Unit is available
        const { data: unit } = await adminClient
            .from('units')
            .select('status, id, project_id')
            .eq('id', unit_id)
            .single()

        if (!unit) return corsJSON({ error: 'Unit not found' }, { status: 404 })

        // 2. Link to Lead (and sync project_id)
        const updateData = { unit_id }
        if (unit.project_id) updateData.project_id = unit.project_id

        const { error: updateError } = await adminClient
            .from('leads')
            .update(updateData)
            .eq('id', leadId)

        if (updateError) throw updateError

        // 3. Optional: Automatically reserve the unit?
        // User workflow: Link Unit -> Mark Deal Won -> Unit Sold.
        // Maybe linking sets it to 'Reserved'?
        // Let's set it to 'reserved' to prevent double booking.
        await adminClient
            .from('units')
            .update({ status: 'reserved' })
            .eq('id', unit_id)

        return corsJSON({ success: true })

    } catch (e) {
        console.error('Link property error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
