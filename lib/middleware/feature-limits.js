/**
 * Feature Limits Middleware
 * Reads limits from subscription_plans.features JSONB.
 * Uses: subscriptions + subscription_plans tables.
 */

import { createAdminClient } from '@/lib/supabase/admin'

async function getActivePlanFeatures(supabase, organizationId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('status, metadata, plan:subscription_plans(name, features)')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data || null
}

function getLimit(planFeatures, metadata, key) {
  const customLimits = metadata?.custom_limits || {}
  if (customLimits[key] !== undefined) return customLimits[key]
  return planFeatures[key]
}

export async function checkProjectLimit(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  const maxProjects = getLimit(features, subscription.metadata, 'max_projects') ?? null
  if (maxProjects === null) return { allowed: true, limit: null, current: null }
  if (maxProjects === -1) return { allowed: true, limit: -1, current: null }

  const { count: currentProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (currentProjects >= maxProjects) {
    return { allowed: false, limit: maxProjects, current: currentProjects, message: `Project limit reached. Your plan allows ${maxProjects} projects.` }
  }
  return { allowed: true, limit: maxProjects, current: currentProjects }
}

export async function checkLeadLimit(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  const maxLeads = getLimit(features, subscription.metadata, 'max_leads') ?? null
  if (maxLeads === null) return { allowed: true, limit: null, current: null }
  if (maxLeads === -1) return { allowed: true, limit: -1, current: null }

  const { count: currentLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (currentLeads >= maxLeads) {
    return { allowed: false, limit: maxLeads, current: currentLeads, message: `Lead limit reached. Your plan allows ${maxLeads} leads.` }
  }
  return { allowed: true, limit: maxLeads, current: currentLeads }
}

export async function checkUserLimit(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  const maxUsers = getLimit(features, subscription.metadata, 'max_users') ?? null
  if (maxUsers === null) return { allowed: true, limit: null, current: null }
  if (maxUsers === -1) return { allowed: true, limit: -1, current: null }

  const { count: currentUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (currentUsers >= maxUsers) {
    return { allowed: false, limit: maxUsers, current: currentUsers, message: `User limit reached. ${subscription.plan.name} plan allows ${maxUsers} users.` }
  }
  return { allowed: true, limit: maxUsers, current: currentUsers }
}

export async function checkCampaignLimit(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  const maxCampaigns = getLimit(features, subscription.metadata, 'max_campaigns') ?? null
  if (maxCampaigns === null) return { allowed: true, limit: null, current: null }
  if (maxCampaigns === -1) return { allowed: true, limit: -1, current: null }

  const { count: currentCampaigns } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (currentCampaigns >= maxCampaigns) {
    return { allowed: false, limit: maxCampaigns, current: currentCampaigns, message: `Campaign limit reached. Your plan allows ${maxCampaigns} campaigns.` }
  }
  return { allowed: true, limit: maxCampaigns, current: currentCampaigns }
}

export async function checkModuleAccess(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)
  if (!subscription) return { allowed: false, message: 'No active subscription found' }
  return { allowed: true, source: 'plan' }
}

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

export async function checkCSVExportAccess(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  if (features.csv_export !== true) {
    return { allowed: false, message: 'CSV export is not available on your plan.' }
  }
  return { allowed: true }
}

export async function checkCustomDomainAccess(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  if (features.custom_domain !== true) {
    return { allowed: false, message: 'Custom domain is not available on your plan.' }
  }
  return { allowed: true }
}

export async function checkIntegrationAccess(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, limit: 0, current: 0, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  const limit = getLimit(features, subscription.metadata, 'lead_source_integrations') ?? 0

  if (limit === 0) {
    return { allowed: false, limit: 0, current: 0, message: 'Lead source integrations are not available on your plan.' }
  }

  if (limit === -1) {
    return { allowed: true, limit: -1, current: null }
  }

  const { count: current } = await supabase
    .from('lead_source_integrations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  return { allowed: current < limit, limit, current }
}

export async function checkAuditLogAccess(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, days: 0, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  const days = getLimit(features, subscription.metadata, 'audit_log_days') ?? 0

  if (days === 0) {
    return { allowed: false, days: 0, message: 'Audit log access is not available on your plan.' }
  }

  return { allowed: true, days }
}

export async function checkTopupAccess(organizationId) {
  const supabase = createAdminClient()
  const subscription = await getActivePlanFeatures(supabase, organizationId)

  if (!subscription?.plan) return { allowed: false, message: 'No active subscription found' }

  const features = subscription.plan.features || {}
  if (features.topup_allowed !== true) {
    return { allowed: false, message: 'Credit top-up is not available on your plan.' }
  }
  return { allowed: true }
}

export async function getUsageStats(organizationId, { anyStatus = false } = {}) {
  const supabase = createAdminClient()
  let subscription = await getActivePlanFeatures(supabase, organizationId)

  // When called by platform admin, fall back to any latest subscription so usage
  // is always visible even for expired/cancelled orgs.
  if (!subscription?.plan && anyStatus) {
    const { data } = await supabase
      .from('subscriptions')
      .select('status, metadata, plan:subscription_plans(name, features)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    subscription = data || null
  }

  if (!subscription?.plan) return null

  const features = subscription.plan.features || {}
  const metadata = subscription.metadata
  const maxProjects = getLimit(features, metadata, 'max_projects') ?? null
  const maxLeads = getLimit(features, metadata, 'max_leads') ?? null
  const maxUsers = getLimit(features, metadata, 'max_users') ?? null
  const maxCampaigns = getLimit(features, metadata, 'max_campaigns') ?? null

  const [
    { count: projectTotal },
    { count: projectActive },
    { count: leadTotal },
    { count: leadActive },
    { count: userCount },
    { count: campaignTotal },
    { count: campaignActive },
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).is('archived_at', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).is('archived_at', null),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).is('archived_at', null),
  ])

  return {
    plan: subscription.plan.name,
    projects: { count: projectTotal, active: projectActive, archived: projectTotal - projectActive, limit: maxProjects },
    leads: { count: leadTotal, active: leadActive, archived: leadTotal - leadActive, limit: maxLeads },
    users: { count: userCount, limit: maxUsers },
    campaigns: { count: campaignTotal, active: campaignActive, archived: campaignTotal - campaignActive, limit: maxCampaigns },
  }
}
