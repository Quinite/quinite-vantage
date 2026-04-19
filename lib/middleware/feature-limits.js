/**
 * Feature Limits Middleware
 * Reads limits from subscription_plans.features JSONB.
 * Uses: subscriptions + subscription_plans tables.
 */

import { createAdminClient } from '@/lib/supabase/server'

async function getActivePlanFeatures(supabase, organizationId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('status, plan:subscription_plans(name, features)')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data || null
}

/**
 * Check if organization has reached project limit.
 */
export async function checkProjectLimit(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const maxProjects = subscription.plan.features?.max_projects ?? null
  if (maxProjects === null) return { allowed: true, limit: null, current: null }

  const { count: currentProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('archived_at', null)

  if (currentProjects >= maxProjects) {
    return { allowed: false, limit: maxProjects, current: currentProjects, message: `Project limit reached. Your plan allows ${maxProjects} projects.` }
  }
  return { allowed: true, limit: maxProjects, current: currentProjects }
}

/**
 * Check if organization has reached lead limit.
 */
export async function checkLeadLimit(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const maxLeads = subscription.plan.features?.max_leads ?? null
  if (maxLeads === null) return { allowed: true, limit: null, current: null }

  const { count: currentLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('archived_at', null)

  if (currentLeads >= maxLeads) {
    return { allowed: false, limit: maxLeads, current: currentLeads, message: `Lead limit reached. Your plan allows ${maxLeads} leads.` }
  }
  return { allowed: true, limit: maxLeads, current: currentLeads }
}

/**
 * Check if organization can add more users.
 */
export async function checkUserLimit(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const maxUsers = subscription.plan.features?.max_users ?? null
  if (maxUsers === null) return { allowed: true, limit: null, current: null }

  const { count: currentUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (currentUsers >= maxUsers) {
    return { allowed: false, limit: maxUsers, current: currentUsers, message: `User limit reached. ${subscription.plan.name} plan allows ${maxUsers} users.` }
  }
  return { allowed: true, limit: maxUsers, current: currentUsers }
}

/**
 * Check if org's subscription is active (module gating removed — all modules available).
 */
export async function checkModuleAccess(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)
  if (!subscription) return { allowed: false, message: 'No active subscription found' }
  return { allowed: true, source: 'plan' }
}

/**
 * Check if organization can export data (CSV export flag in plan features).
 */
export async function checkExportAccess(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  if (features.csv_export !== true) {
    return { allowed: false, message: 'Data export is not available on your plan. Upgrade to access this feature.' }
  }
  return { allowed: true }
}

/**
 * Get usage statistics for the organization.
 */
export async function getUsageStats(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return null

  const features = subscription.plan.features || {}
  const maxProjects = features.max_projects ?? null
  const maxLeads = features.max_leads ?? null
  const maxUsers = features.max_users ?? null

  const [{ count: projectCount }, { count: leadCount }, { count: userCount }] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).is('archived_at', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).is('archived_at', null),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId)
  ])

  return {
    plan: subscription.plan.name,
    projects: { current: projectCount, limit: maxProjects, percentage: maxProjects ? (projectCount / maxProjects) * 100 : 0 },
    leads: { current: leadCount, limit: maxLeads, percentage: maxLeads ? (leadCount / maxLeads) * 100 : 0 },
    users: { current: userCount, limit: maxUsers, percentage: maxUsers ? (userCount / maxUsers) * 100 : 0 }
  }
}
