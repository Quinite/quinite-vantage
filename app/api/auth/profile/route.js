import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function PATCH(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return corsJSON({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const admin = createAdminClient()

        const updates = {}
        if (body.full_name !== undefined) updates.full_name = body.full_name.trim()
        if (body.phone !== undefined) updates.phone = body.phone.trim() || null
        updates.updated_at = new Date().toISOString()

        const { data: profile, error } = await admin
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select('id, full_name, phone, email, role, organization_id')
            .single()

        if (error) throw new Error('Failed to update profile')

        return corsJSON({ profile })
    } catch (e) {
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
