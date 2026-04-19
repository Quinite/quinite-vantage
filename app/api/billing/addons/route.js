import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/billing/addons
 * Lists all available subscription add-ons from subscription_addons table.
 * organization_addons table has been removed (simplified subscription model).
 */
export async function GET() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: addons, error } = await supabase
            .from('subscription_addons')
            .select('*')
            .eq('is_active', true)
            .order('price_inr', { ascending: true })

        if (error) return NextResponse.json({ error: 'Failed to fetch add-ons' }, { status: 500 })

        return NextResponse.json({ addons: addons || [] })
    } catch (err) {
        console.error('GET /api/billing/addons:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
