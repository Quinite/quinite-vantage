/**
 * Subscription and Feature Access Middleware
 * Uses: subscriptions table + subscription_plans table
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'

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
  const supabase = await createServerSupabaseClient()

  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('id, status, cancel_at_period_end, trial_ends_at')
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

    // Check for overdue invoices (lock if 7+ days overdue)
    const { data: overdueInvoices } = await supabase
      .from('billing_invoices')
      .select('id, invoice_number, due_date')
      .eq('organization_id', organizationId)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(1)

    if (overdueInvoices?.length > 0) {
      const daysPastDue = Math.floor((Date.now() - new Date(overdueInvoices[0].due_date)) / 86400000)
      if (daysPastDue > 7) {
        return {
          isActive: false,
          isLocked: true,
          reason: `Payment overdue by ${daysPastDue} days. Invoice #${overdueInvoices[0].invoice_number}`,
          subscription
        }
      }
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
 * Get organization's current credit balance.
 */
export async function getCreditBalance(organizationId) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: credits, error } = await supabase
      .from('call_credits')
      .select('balance, low_balance_threshold')
      .eq('organization_id', organizationId)
      .single()

    if (error || !credits) return { balance: 0, lowBalance: true }

    return {
      balance: parseFloat(credits.balance),
      lowBalance: parseFloat(credits.balance) < parseFloat(credits.low_balance_threshold)
    }
  } catch (err) {
    console.error('getCreditBalance error:', err)
    return { balance: 0, lowBalance: true }
  }
}

/**
 * Add credits to organization account (purchase or refund).
 */
export async function addCallCredits(organizationId, credits, transactionType, referenceId, userId) {
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
    const newTotalPurchased = transactionType === 'purchase' ? totalPurchased + credits : totalPurchased

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
      reference_type: transactionType === 'purchase' ? 'invoice' : 'manual',
      reference_id: referenceId,
      description: `${transactionType === 'purchase' ? 'Purchased' : 'Refunded'} ${credits} credits`,
      created_by: userId
    })

    return { success: true, newBalance, error: null }
  } catch (err) {
    console.error('addCallCredits error:', err)
    return { success: false, newBalance: 0, error: 'Error processing credit addition' }
  }
}
