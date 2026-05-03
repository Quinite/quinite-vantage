import { corsJSON } from '@/lib/cors'
import { withPermission } from '@/lib/middleware/withAuth'
import { CampaignService } from '@/services/campaign.service'

export const POST = withPermission('view_campaigns', async (request, context) => {
  try {
    const { profile } = context
    if (!profile?.organization_id) {
      return corsJSON({ error: 'Organization not found' }, { status: 400 })
    }

    const body = await request.json()
    const { project_ids, inclusion, exclusion } = body

    if (!project_ids?.length) {
      return corsJSON({ error: 'project_ids is required' }, { status: 400 })
    }

    const result = await CampaignService.previewEnrollment(profile.organization_id, {
      project_ids,
      inclusion,
      exclusion,
    })

    return corsJSON(result)
  } catch (e) {
    console.error('preview-enrollment error:', e)
    return corsJSON({ error: e.message }, { status: 500 })
  }
})
