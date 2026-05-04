import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'
import { getCreditBalance } from '@/lib/middleware/subscription'
import { getUsageStats } from '@/lib/middleware/feature-limits'

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check platform admin access
        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'platform_admin') {
            return corsJSON({ error: 'Platform Admin access required' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const planSlug = searchParams.get('plan')

        // Build query
        let query = adminClient
            .from('subscriptions')
            .select(`
        *,
        organization:organizations(id, name, company_name),
        plan:subscription_plans(id, name, slug, price_monthly, price_yearly)
      `)
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }

        if (planSlug) {
            const { data: plan } = await adminClient
                .from('subscription_plans')
                .select('id')
                .eq('slug', planSlug)
                .single()

            if (plan) {
                query = query.eq('plan_id', plan.id)
            }
        }

        const { data: subscriptions, error } = await query

        if (error) throw error

        // Enrich each subscription with credit balance and usage stats
        const enriched = await Promise.all(
            subscriptions.map(async (sub) => {
                const orgId = sub.organization_id

                // Lazily expire period-ended subscriptions and get effective status
                const effectiveSub = { ...sub }
                if (
                    sub.status === 'active' &&
                    sub.current_period_end &&
                    new Date(sub.current_period_end) < new Date()
                ) {
                    effectiveSub.status = 'past_due'
                    // Best-effort DB update
                    adminClient.from('subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() }).eq('id', sub.id).then(() => {})
                    adminClient.from('organizations').update({ subscription_status: 'past_due', updated_at: new Date().toISOString() }).eq('id', orgId).then(() => {})
                }

                const [credits, usageStats] = await Promise.all([
                    getCreditBalance(orgId, adminClient),
                    getUsageStats(orgId, { anyStatus: true })
                ])

                // Highest utilization across resources (0–100, or null if unlimited)
                let highestUtilization = null
                if (usageStats) {
                    const utilizationValues = [
                        usageStats.projects.limit  > 0 ? (usageStats.projects.count  / usageStats.projects.limit)  * 100 : null,
                        usageStats.leads.limit     > 0 ? (usageStats.leads.count     / usageStats.leads.limit)     * 100 : null,
                        usageStats.campaigns.limit > 0 ? (usageStats.campaigns.count / usageStats.campaigns.limit) * 100 : null,
                        usageStats.users.limit     > 0 ? (usageStats.users.count     / usageStats.users.limit)     * 100 : null,
                    ].filter((v) => v !== null)

                    if (utilizationValues.length > 0) {
                        highestUtilization = Math.max(...utilizationValues)
                    }
                }

                const isOverLimit = (count, limit) => limit !== null && limit !== -1 && count > limit
                const anyOverLimit = usageStats
                    ? isOverLimit(usageStats.projects.count,  usageStats.projects.limit)  ||
                      isOverLimit(usageStats.leads.count,     usageStats.leads.limit)     ||
                      isOverLimit(usageStats.campaigns.count, usageStats.campaigns.limit) ||
                      isOverLimit(usageStats.users.count,     usageStats.users.limit)
                    : false

                return {
                    ...effectiveSub,
                    credit_balance: credits.balance,
                    low_balance: credits.low_balance,
                    highest_utilization: highestUtilization,
                    any_over_limit: anyOverLimit,
                    credits,
                    usage: usageStats
                        ? {
                            projects:  usageStats.projects,
                            leads:     usageStats.leads,
                            campaigns: usageStats.campaigns,
                            users:     usageStats.users
                          }
                        : null
                }
            })
        )

        // Calculate metrics using effective statuses from enriched array
        const metrics = {
            total: enriched.length,
            active: enriched.filter(s => s.status === 'active').length,
            trialing: enriched.filter(s => s.status === 'trialing').length,
            cancelled: enriched.filter(s => s.status === 'cancelled').length,
            past_due: enriched.filter(s => s.status === 'past_due').length,
            mrr: enriched
                .filter(s => s.status === 'active' && s.billing_cycle === 'monthly')
                .reduce((sum, s) => sum + parseFloat(s.plan?.price_monthly || 0), 0),
            arr: enriched
                .filter(s => s.status === 'active')
                .reduce((sum, s) => {
                    const monthly = s.billing_cycle === 'monthly'
                        ? parseFloat(s.plan?.price_monthly || 0) * 12
                        : parseFloat(s.plan?.price_yearly || 0)
                    return sum + monthly
                }, 0)
        }

        return corsJSON({ subscriptions: enriched, metrics })
    } catch (e) {
        console.error('platform/subscriptions GET error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check platform admin access
        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
            .from('profiles')
            .select('role, email')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'platform_admin') {
            return corsJSON({ error: 'Platform Admin access required' }, { status: 403 })
        }

        // Parse body once — action may come from query param OR body
        let body = {}
        try { body = await request.json() } catch { /* no body */ }

        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action') || body.action

        if (!action) {
            return corsJSON({ error: 'Missing action' }, { status: 400 })
        }

        // ----------------------------------------------------------------
        // Action: add_credits
        // Body: { org_id, minutes, reason }
        // ----------------------------------------------------------------
        if (action === 'add_credits') {
            const { org_id, minutes, reason } = body

            if (!org_id) {
                return corsJSON({ error: 'org_id is required' }, { status: 400 })
            }
            if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
                return corsJSON({ error: 'minutes must be a positive number' }, { status: 400 })
            }
            if (!reason || typeof reason !== 'string' || reason.trim() === '') {
                return corsJSON({ error: 'reason is required' }, { status: 400 })
            }

            // Add call credits via middleware helper
            const { addCallCredits } = await import('@/lib/middleware/subscription')
            const result = await addCallCredits(
                org_id,
                minutes,
                'manual_topup',
                null,
                user.id,
                reason.trim()
            )

            if (!result.success) {
                return corsJSON({ error: result.error || 'Failed to add credits' }, { status: 500 })
            }

            // Fetch fresh balance
            const { getCreditBalance } = await import('@/lib/middleware/subscription')
            const newCredits = await getCreditBalance(org_id, adminClient)

            await adminClient.from('audit_logs').insert({
                organization_id: org_id,
                user_id: user.id,
                user_name: profile.email || 'Platform Admin',
                action: 'CREDITS_ADDED',
                entity_type: 'call_credits',
                entity_id: org_id,
                metadata: { minutes, reason: reason.trim() }
            })

            return corsJSON({ success: true, credits: newCredits })
        }

        // ----------------------------------------------------------------
        // Action: update_org_limits
        // Body: { org_id, custom_limits: { max_leads?, max_projects?, max_campaigns?, max_users?, monthly_minutes_included? } }
        // ----------------------------------------------------------------
        if (action === 'update_org_limits') {
            const { org_id, custom_limits } = body

            if (!org_id) {
                return corsJSON({ error: 'org_id is required' }, { status: 400 })
            }
            if (!custom_limits || typeof custom_limits !== 'object') {
                return corsJSON({ error: 'custom_limits object is required' }, { status: 400 })
            }

            // Fetch current subscription to get current metadata
            const { data: currentSub, error: subFetchError } = await adminClient
                .from('subscriptions')
                .select('id, metadata')
                .eq('organization_id', org_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (subFetchError || !currentSub) {
                return corsJSON({ error: 'Subscription not found for this org' }, { status: 404 })
            }

            // Merge custom_limits into existing metadata
            const existingMetadata = currentSub.metadata || {}
            const existingCustomLimits = existingMetadata.custom_limits || {}
            const mergedCustomLimits = { ...existingCustomLimits, ...custom_limits }
            const newMetadata = { ...existingMetadata, custom_limits: mergedCustomLimits }

            const { data: updatedSub, error: updateError } = await adminClient
                .from('subscriptions')
                .update({ metadata: newMetadata, updated_at: new Date().toISOString() })
                .eq('id', currentSub.id)
                .select()
                .single()

            if (updateError) throw updateError

            await adminClient.from('audit_logs').insert({
                organization_id: org_id,
                user_id: user.id,
                user_name: profile.email || 'Platform Admin',
                action: 'ORG_LIMITS_UPDATED',
                entity_type: 'subscription',
                entity_id: currentSub.id,
                metadata: { custom_limits: mergedCustomLimits }
            })

            return corsJSON({ success: true, subscription: updatedSub })
        }

        // ----------------------------------------------------------------
        // Subscription status actions (cancel / suspend / activate / change_plan)
        // ----------------------------------------------------------------
        const id = searchParams.get('id') || body.id

        if (!id) {
            return corsJSON({ error: 'Missing subscription ID' }, { status: 400 })
        }

        // Fetch current subscription for org_id and plan context
        const { data: currentSub, error: fetchErr } = await adminClient
            .from('subscriptions')
            .select('id, organization_id, plan_id, billing_cycle, current_period_end, status')
            .eq('id', id)
            .single()

        if (fetchErr || !currentSub) {
            return corsJSON({ error: 'Subscription not found' }, { status: 404 })
        }

        const orgId = currentSub.organization_id
        let updateData = {}
        let sideEffects = [] // post-update async tasks

        switch (action) {
            case 'cancel':
                updateData = {
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                }
                sideEffects.push(() =>
                    adminClient.from('organizations').update({
                        subscription_status: 'cancelled',
                        updated_at: new Date().toISOString()
                    }).eq('id', orgId)
                )
                break

            case 'suspend':
                updateData = {
                    status: 'suspended',
                    updated_at: new Date().toISOString()
                }
                sideEffects.push(() =>
                    adminClient.from('organizations').update({
                        subscription_status: 'suspended',
                        updated_at: new Date().toISOString()
                    }).eq('id', orgId)
                )
                break

            case 'activate': {
                // Extend period by one billing cycle from today
                const billingCycle = body.billingCycle || currentSub.billing_cycle || 'monthly'
                const now = new Date()
                const newPeriodEnd = new Date(now)
                if (billingCycle === 'yearly') {
                    newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
                } else {
                    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
                }

                updateData = {
                    status: 'active',
                    current_period_start: now.toISOString(),
                    current_period_end: newPeriodEnd.toISOString(),
                    updated_at: now.toISOString()
                }

                sideEffects.push(() =>
                    adminClient.from('organizations').update({
                        subscription_status: 'active',
                        subscription_period_end: newPeriodEnd.toISOString(),
                        updated_at: now.toISOString()
                    }).eq('id', orgId)
                )
                // Credit plan-included minutes to balance on activation/renewal
                sideEffects.push(async () => {
                    const { data: activePlan } = await adminClient
                        .from('subscription_plans')
                        .select('features')
                        .eq('id', currentSub.plan_id)
                        .single()
                    const minutes = parseFloat(activePlan?.features?.ai_minutes_included ?? activePlan?.features?.monthly_minutes_included ?? 0)
                    if (minutes > 0) {
                        const { addCallCredits } = await import('@/lib/middleware/subscription')
                        await addCallCredits(orgId, minutes, 'plan_allocation', null, user.id)
                    }
                })
                break
            }

            case 'change_plan': {
                const { planId = body.plan_id, billingCycle } = body
                if (!planId) {
                    return corsJSON({ error: 'Missing plan ID' }, { status: 400 })
                }

                const { data: targetPlan } = await adminClient
                    .from('subscription_plans')
                    .select('*')
                    .eq('id', planId)
                    .single()

                if (!targetPlan) {
                    return corsJSON({ error: 'Invalid plan ID' }, { status: 400 })
                }

                const cycle = billingCycle || currentSub.billing_cycle || 'monthly'
                const now = new Date()
                const newPeriodEnd = new Date(now)
                if (cycle === 'yearly') {
                    newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
                } else {
                    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
                }

                updateData = {
                    plan_id: planId,
                    billing_cycle: cycle,
                    status: 'active',
                    trial_ends_at: null,
                    current_period_start: now.toISOString(),
                    current_period_end: newPeriodEnd.toISOString(),
                    updated_at: now.toISOString()
                }

                sideEffects.push(() =>
                    adminClient.from('organizations').update({
                        subscription_status: 'active',
                        subscription_period_end: newPeriodEnd.toISOString(),
                        current_plan_id: planId,
                        updated_at: now.toISOString()
                    }).eq('id', orgId)
                )
                // Credit plan-included minutes to balance on plan change
                sideEffects.push(async () => {
                    const minutes = parseFloat(targetPlan?.features?.ai_minutes_included ?? targetPlan?.features?.monthly_minutes_included ?? 0)
                    if (minutes > 0) {
                        const { addCallCredits } = await import('@/lib/middleware/subscription')
                        await addCallCredits(orgId, minutes, 'plan_allocation', null, user.id)
                    }
                })
                break
            }

            default:
                return corsJSON({ error: 'Invalid action' }, { status: 400 })
        }

        const { data, error } = await adminClient
            .from('subscriptions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Fire side effects (org sync, credit reset) without blocking response
        await Promise.allSettled(sideEffects.map(fn => fn()))

        await adminClient.from('audit_logs').insert({
            organization_id: orgId,
            user_id: user.id,
            user_name: profile.email || 'Platform Admin',
            action: `SUBSCRIPTION_${action.toUpperCase()}`,
            entity_type: 'subscription',
            entity_id: id,
            metadata: { action, updateData }
        })

        return corsJSON({ success: true, subscription: data })
    } catch (e) {
        console.error('platform/subscriptions POST error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
