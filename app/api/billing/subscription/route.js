import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkSubscriptionStatus } from '@/lib/middleware/subscription'

/**
 * GET /api/billing/subscription
 */
export async function GET() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) return NextResponse.json({ error: 'No organization found' }, { status: 404 })

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*, plan:subscription_plans(*)')
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') {
            return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
        }

        const status = await checkSubscriptionStatus(profile.organization_id)
        return NextResponse.json({ subscription: subscription || null, status })
    } catch (err) {
        console.error('GET /api/billing/subscription:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/billing/subscription — Create or update subscription (Super Admin only)
 */
export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single()

        if (!profile || !['owner', 'admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { plan_id, billing_cycle } = body

        if (!plan_id) return NextResponse.json({ error: 'plan_id is required' }, { status: 400 })

        const now = new Date()
        const periodEnd = new Date(now)
        if (billing_cycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1)
        }

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .upsert({
                organization_id: profile.organization_id,
                plan_id,
                status: 'active',
                billing_cycle: billing_cycle || 'monthly',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                cancel_at_period_end: false,
                updated_at: now.toISOString()
            }, { onConflict: 'organization_id' })
            .select('*, plan:subscription_plans(*)')
            .single()

        if (error) return NextResponse.json({ error: 'Failed to create/update subscription' }, { status: 500 })

        // Ensure call_credits row exists
        await supabase.from('call_credits').upsert({
            organization_id: profile.organization_id,
            balance: 0,
            total_purchased: 0,
            total_consumed: 0
        }, { onConflict: 'organization_id' })

        return NextResponse.json({ subscription }, { status: 201 })
    } catch (err) {
        console.error('POST /api/billing/subscription:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/billing/subscription — Update plan or billing cycle (Super Admin only)
 */
export async function PATCH(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single()

        if (!profile || !['owner', 'admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const updateData = {}
        if (body.plan_id !== undefined) updateData.plan_id = body.plan_id
        if (body.billing_cycle !== undefined) updateData.billing_cycle = body.billing_cycle
        if (body.cancel_at_period_end !== undefined) updateData.cancel_at_period_end = body.cancel_at_period_end
        updateData.updated_at = new Date().toISOString()

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('organization_id', profile.organization_id)
            .select('*, plan:subscription_plans(*)')
            .single()

        if (error) return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })

        return NextResponse.json({ subscription })
    } catch (err) {
        console.error('PATCH /api/billing/subscription:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
