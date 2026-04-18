
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

        const adminClient = createAdminClient()

        // 1. Get current unit to release status if needed
        const { data: lead } = await adminClient
            .from('leads')
            .select('unit_id')
            .eq('id', leadId)
            .single()

        // 2. Unlink from Lead (clear unit_id and project_id)
        const { error: updateError } = await adminClient
            .from('leads')
            .update({ unit_id: null, project_id: null })
            .eq('id', leadId)

        if (updateError) throw updateError

        // 3. Mark unit as 'available' if it was reserved?
        if (lead?.unit_id) {
            const { data: unit } = await adminClient
                .from('units')
                .select('status')
                .eq('id', lead.unit_id)
                .single()

            if (unit && unit.status === 'reserved') {
                await adminClient
                    .from('units')
                    .update({ status: 'available' })
                    .eq('id', lead.unit_id)
            }
        }

        return corsJSON({ success: true })

    } catch (e) {
        console.error('Unlink property error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
