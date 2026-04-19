/**
 * Usage Limits Middleware
 * Uses: subscriptions + subscription_plans tables.
 * user_count tracking removed (simplified subscription model).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getActivePlanFeatures(supabase, organizationId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('status, plan:subscription_plans(features)')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data || null
}

/**
 * Check if organization can add more users.
 */
export async function checkUserLimit(organizationId) {
  const supabase = await createServerSupabaseClient()

  try {
    const subscription = await getActivePlanFeatures(supabase, organizationId)
    if (!subscription) return { canAdd: false, currentCount: 0, maxUsers: null, reason: 'No active subscription found' }

    const maxUsers = subscription.plan?.features?.max_users ?? null

    const { count: currentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (maxUsers !== null && currentCount >= maxUsers) {
      return { canAdd: false, currentCount, maxUsers, reason: `User limit reached (${currentCount}/${maxUsers}).` }
    }

    return { canAdd: true, currentCount, maxUsers, reason: null }
  } catch (err) {
    console.error('checkUserLimit error:', err)
    return { canAdd: false, currentCount: 0, maxUsers: null, reason: 'Error checking user limit' }
  }
}

/**
 * Check storage usage limit.
 */
export async function checkStorageLimit(organizationId, additionalMB = 0) {
  const supabase = await createServerSupabaseClient()

  try {
    const subscription = await getActivePlanFeatures(supabase, organizationId)
    if (!subscription) return { canUse: false, currentUsage: 0, limit: 0, reason: 'No active subscription found' }

    const storageLimit = subscription.plan?.features?.storage_limit_gb || 5
    const limitMB = storageLimit * 1024

    const { data: files } = await supabase
      .from('lead_documents')
      .select('file_size')
      .eq('organization_id', organizationId)

    const currentUsageMB = files ? files.reduce((sum, f) => sum + (f.file_size || 0), 0) / (1024 * 1024) : 0
    const totalUsage = currentUsageMB + additionalMB

    if (totalUsage > limitMB) {
      return { canUse: false, currentUsage: currentUsageMB, limit: limitMB, reason: `Storage limit exceeded (${totalUsage.toFixed(2)}MB / ${limitMB}MB).` }
    }

    return { canUse: true, currentUsage: currentUsageMB, limit: limitMB, reason: null }
  } catch (err) {
    console.error('checkStorageLimit error:', err)
    return { canUse: false, currentUsage: 0, limit: 0, reason: 'Error checking storage limit' }
  }
}

/**
 * Check API rate limit (requests per hour from plan features).
 */
export async function checkRateLimit(organizationId) {
  const supabase = await createServerSupabaseClient()

  try {
    const subscription = await getActivePlanFeatures(supabase, organizationId)
    const rateLimit = subscription?.plan?.features?.api_rate_limit || 1000

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const { count } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', oneHourAgo)

    const remaining = Math.max(0, rateLimit - (count || 0))

    if (remaining === 0) {
      const resetAt = new Date(Math.ceil(Date.now() / 3600000) * 3600000)
      return { canProceed: false, remaining: 0, limit: rateLimit, resetAt }
    }

    return { canProceed: true, remaining, limit: rateLimit, resetAt: null }
  } catch (err) {
    console.error('checkRateLimit error:', err)
    return { canProceed: true, remaining: 0, limit: 0, resetAt: null }
  }
}

// user_count column removed from subscriptions (simplified model)
// These are no-ops kept for backward compatibility with any callers
export async function incrementUserCount() { return { success: true, error: null } }
export async function decrementUserCount() { return { success: true, error: null } }
