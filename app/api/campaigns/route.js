import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { createAdminClient } from '@/lib/supabase/admin'
import { withPermission } from '@/lib/middleware/withAuth'
import { CampaignService } from '@/services/campaign.service'
import { checkCampaignLimit } from '@/lib/middleware/feature-limits'
import { requireActiveSubscription } from '@/lib/middleware/subscription'

/**
 * GET /api/campaigns
 * Returns campaigns for the organization
 */
export const GET = withPermission('view_campaigns', async (request, context) => {
  try {
    const { profile } = context

    if (!profile?.organization_id) {
      return corsJSON({ error: 'Organization not found' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      projectId: searchParams.get('project_id'),
      status: searchParams.get('status'),
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20
    }

    const { campaigns, metadata } = await CampaignService.getCampaigns(profile.organization_id, filters)

    return corsJSON({ campaigns: campaigns || [], metadata })
  } catch (e) {
    console.error('campaigns GET error:', e)
    return corsJSON({ error: e.message }, { status: 500 })
  }
})

export const POST = withPermission('create_campaigns', async (request, context) => {
  try {
    const { user, profile } = context
    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    if (!profile?.organization_id) {
      return corsJSON({ error: 'Organization not found' }, { status: 400 })
    }

    // Subscription gate
    const subError = await requireActiveSubscription(profile.organization_id)
    if (subError) return corsJSON(subError, { status: 402 })

    // Check campaign limit
    const limitCheck = await checkCampaignLimit(profile.organization_id)
    if (!limitCheck.allowed) {
      return corsJSON({
        error: 'limit_reached',
        resource: 'campaigns',
        current: limitCheck.current,
        limit: limitCheck.limit,
        message: 'You have reached your campaign limit. Contact us to upgrade.'
      }, { status: 403 })
    }

    const { project_id, project_ids, name, description, start_date, end_date, time_start, time_end, metadata, ai_script, call_settings, credit_cap, dnd_compliance, auto_enroll, lead_ids, enroll_filters } = body

    // Support both legacy project_id (single) and new project_ids (array)
    const canonicalIds = (Array.isArray(project_ids) && project_ids.length > 0)
      ? project_ids
      : (project_id ? [project_id] : [])

    if (!canonicalIds.length || !start_date || !end_date || !time_start || !time_end) {
      return corsJSON({
        error: 'At least one project, start_date, end_date, time_start and time_end are required'
      }, { status: 400 })
    }

    const primaryProjectId = canonicalIds[0]

    const payload = {
      organization_id: profile.organization_id,
      project_id: primaryProjectId,
      project_ids: canonicalIds,
      name: name || 'Call Campaign',
      description: description || null,
      start_date,
      end_date,
      time_start,
      time_end,
      status: 'scheduled',
      metadata: metadata || null,
      ai_script: ai_script || null,
      call_settings: call_settings || { language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 },
      credit_cap: credit_cap != null && credit_cap !== '' ? parseFloat(credit_cap) : null,
      dnd_compliance: dnd_compliance !== undefined ? Boolean(dnd_compliance) : true,
      created_by: user.id
    }

    const admin = createAdminClient()
    const { data: campaign, error } = await admin
      .from('campaigns')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    // Populate junction table
    const cpRows = canonicalIds.map(pid => ({ campaign_id: campaign.id, project_id: pid }))
    await admin.from('campaign_projects').insert(cpRows)

    let enrollmentSummary = null
    if (enroll_filters) {
      enrollmentSummary = await CampaignService.enrollLeads(
          campaign.id,
          profile.organization_id,
          user.id,
          { inclusion: enroll_filters.inclusion, exclusion: enroll_filters.exclusion }
      )
    } else if (auto_enroll) {
      enrollmentSummary = await CampaignService.enrollLeads(
          campaign.id,
          profile.organization_id,
          user.id,
          { filters: { project_ids: canonicalIds } }
      )
    } else if (lead_ids && lead_ids.length > 0) {
      enrollmentSummary = await CampaignService.enrollLeads(
          campaign.id,
          profile.organization_id,
          user.id,
          { lead_ids }
      )
    }

    try {
      await logAudit(
        supabase,
        user.id,
        profile.full_name || user.email,
        'campaign.create',
        'campaign',
        campaign.id,
        { project_ids: canonicalIds }
      )
    } catch (e) {
      console.warn('Audit log failed:', e.message)
    }

    return corsJSON({ campaign, enrollment: enrollmentSummary })
  } catch (e) {
    console.error('campaigns POST error:', e)
    return corsJSON({ error: e.message }, { status: 500 })
  }
})
