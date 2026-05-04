/**
 * Subscription and Feature Access Middleware
 * Uses: subscriptions table + subscription_plans table
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Get org's active subscription joined with plan details.
 * Returns null if none found.
 */
async function getSubscription(supabase, organizationId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data || null
}

/**
 * Check if an organization's subscription is active.
 */
export async function checkSubscriptionStatus(organizationId) {
  const admin = createAdminClient()

  try {
    const { data: subscription, error } = await admin
      .from('subscriptions')
      .select('id, status, trial_ends_at, current_period_end, organization_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !subscription) {
      return { isActive: false, isLocked: true, reason: 'No active subscription found', subscription: null }
    }

    if (subscription.status === 'cancelled') {
      return { isActive: false, isLocked: true, reason: 'Subscription has been cancelled', subscription }
    }

    // If period has ended and status is still active/trialing, lazily expire it
    if (
      subscription.status !== 'past_due' &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) < new Date()
    ) {
      admin
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('id', subscription.id)
        .then(() => {})
      admin
        .from('organizations')
        .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
        .eq('id', subscription.organization_id)
        .then(() => {})
      return { isActive: false, isLocked: false, reason: 'Subscription period has ended', subscription }
    }

    if (subscription.status === 'past_due') {
      return { isActive: false, isLocked: false, reason: 'Subscription period has ended', subscription }
    }

    return {
      isActive: subscription.status === 'active' || subscription.status === 'trialing',
      isLocked: false,
      reason: null,
      subscription
    }
  } catch (err) {
    console.error('checkSubscriptionStatus error:', err)
    return { isActive: false, isLocked: true, reason: 'Error checking subscription', subscription: null }
  }
}

/**
 * Check if an organization has access to a specific feature (from plan's features JSONB).
 */
export async function checkFeatureAccess(organizationId, feature) {
  const supabase = await createServerSupabaseClient()

  try {
    const { isActive } = await checkSubscriptionStatus(organizationId)
    if (!isActive) return { hasAccess: false, reason: 'Subscription is not active' }

    const subscription = await getSubscription(supabase, organizationId)
    if (!subscription) return { hasAccess: false, reason: 'Could not verify subscription plan' }

    const planFeatures = subscription.plan?.features || {}
    if (planFeatures[feature] === true) return { hasAccess: true, reason: null }

    return { hasAccess: false, reason: `Feature '${feature}' not included in your plan` }
  } catch (err) {
    console.error('checkFeatureAccess error:', err)
    return { hasAccess: false, reason: 'Error checking feature access' }
  }
}

/**
 * Check if org's subscription is active (module access is no longer per-module gated).
 */
export async function checkModuleAccess(organizationId) {
  const { isActive } = await checkSubscriptionStatus(organizationId)
  return {
    hasAccess: isActive,
    reason: isActive ? null : 'Subscription is not active'
  }
}

/**
 * Guard helper — call at the top of any mutating API route.
 * Returns an error object { error, code } if subscription is not active, null if OK.
 * Usage: const sub = await requireActiveSubscription(orgId); if (sub) return corsJSON(sub, { status: 402 })
 */
export async function requireActiveSubscription(organizationId) {
  const { isActive, reason, subscription } = await checkSubscriptionStatus(organizationId)
  // Only block when there is an explicit subscription that has expired/been cancelled.
  // If no subscription row exists at all (new org, free tier), allow through.
  if (!isActive && subscription) {
    return {
      error: reason || 'Your subscription has expired. Please renew to continue.',
      code: 'SUBSCRIPTION_EXPIRED'
    }
  }
  return null
}

/**
 * Get organization's current credit balance.
 */
export async function getCreditBalance(organizationId, client = null) {
  const supabase = client ?? await createServerSupabaseClient()

  try {
    const { data: row, error } = await supabase
      .from('call_credits')
      .select('balance, total_purchased, total_consumed, low_balance_threshold, last_recharged_at')
      .eq('organization_id', organizationId)
      .single()

    if (error || !row) return { balance: 0, total_purchased: 0, total_consumed: 0, low_balance: true, last_recharged_at: null }

    return {
      balance:           row.balance ?? 0,
      total_purchased:   row.total_purchased ?? 0,
      total_consumed:    row.total_consumed ?? 0,
      low_balance:       (row.balance ?? 0) < (row.low_balance_threshold ?? 50),
      last_recharged_at: row.last_recharged_at ?? null,
    }
  } catch (err) {
    console.error('getCreditBalance error:', err)
    return { balance: 0, total_purchased: 0, total_consumed: 0, low_balance: true, last_recharged_at: null }
  }
}

/**
 * Add credits to organization account (purchase or refund).
 */
export async function addCallCredits(organizationId, credits, transactionType = 'manual_topup', referenceId, userId) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: creditRecord } = await supabase
      .from('call_credits')
      .select('balance, total_purchased')
      .eq('organization_id', organizationId)
      .single()

    const currentBalance = creditRecord ? parseFloat(creditRecord.balance) : 0
    const totalPurchased = creditRecord ? parseFloat(creditRecord.total_purchased) : 0
    const newBalance = currentBalance + credits
    const newTotalPurchased = transactionType === 'manual_topup' ? totalPurchased + credits : totalPurchased

    const { error: upsertError } = await supabase
      .from('call_credits')
      .upsert({
        organization_id: organizationId,
        balance: newBalance,
        total_purchased: newTotalPurchased,
        last_recharged_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })

    if (upsertError) return { success: false, newBalance: currentBalance, error: 'Failed to update credit balance' }

    await supabase.from('credit_transactions').insert({
      organization_id: organizationId,
      transaction_type: transactionType,
      amount: credits,
      balance_before: currentBalance,
      balance_after: newBalance,
      reference_type: 'manual',
      reference_id: referenceId,
      description: `Added ${credits} credits (${transactionType})`,
      created_by: userId
    })

    return { success: true, newBalance, error: null }
  } catch (err) {
    console.error('addCallCredits error:', err)
    return { success: false, newBalance: 0, error: 'Error processing credit addition' }
  }
}
