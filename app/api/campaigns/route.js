import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { createAdminClient } from '@/lib/supabase/admin'
import { withPermission } from '@/lib/middleware/withAuth'
import { CampaignService } from '@/services/campaign.service'

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

    const { project_id, name, description, start_date, end_date, time_start, time_end, metadata, manual_start, ai_script, call_settings } = body

    if (!project_id || !start_date || !end_date || !time_start || !time_end) {
      return corsJSON({
        error: 'project_id, start_date, end_date, time_start and time_end are required'
      }, { status: 400 })
    }

    const payload = {
      organization_id: profile.organization_id,
      project_id,
      name: name || 'Call Campaign',
      description: description || null,
      start_date,
      end_date,
      time_start,
      time_end,
      status: 'scheduled',
      manual_start: manual_start === true,
      metadata: metadata || null,
      ai_script: ai_script || null,
      call_settings: call_settings || { language: 'hinglish', voice_id: 'shimmer', max_duration: 600, silence_timeout: 30 },
      created_by: user.id
    }

    const admin = createAdminClient()
    const { data: campaign, error } = await admin
      .from('campaigns')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    try {
      await logAudit(
        supabase,
        user.id,
        profile.full_name || user.email,
        'campaign.create',
        'campaign',
        campaign.id,
        { project_id }
      )
    } catch (e) {
      console.warn('Audit log failed:', e.message)
    }

    return corsJSON({ campaign })
  } catch (e) {
    console.error('campaigns POST error:', e)
    return corsJSON({ error: e.message }, { status: 500 })
  }
})
