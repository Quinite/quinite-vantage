import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { corsJSON } from '@/lib/cors'

/**
 * GET /api/campaigns/[id]/logs
 * Get all call logs for a campaign
 */
export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check permission
        const canView = await hasDashboardPermission(user.id, 'view_campaigns')
        if (!canView) {
            return corsJSON({ error: 'Insufficient permissions' }, { status: 403 })
        }

        // Get user's profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        const { id } = await params
        const adminClient = createAdminClient()

        // Verify campaign belongs to organization
        const { data: campaign } = await adminClient
            .from('campaigns')
            .select('id, name, organization_id')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!campaign) {
            return corsJSON({ error: 'Campaign not found' }, { status: 404 })
        }

        // Get call logs with lead details
        const { data: logs, error } = await adminClient
            .from('call_logs')
            .select(`
        id,
        call_status,
        transferred,
        created_at,
        duration,
        call_cost,
        summary,
        sentiment_score,
        interest_level,
        disconnect_reason,
        lead:leads (
          id,
          name,
          email,
          phone,
          score
        )
      `)
            .eq('campaign_id', id)
            .order('created_at', { ascending: false })

        if (error) throw error

        const answeredLogs = logs?.filter(l => l.duration > 0) || []
        const avgSentiment = answeredLogs.length > 0
            ? (answeredLogs.reduce((sum, l) => sum + (parseFloat(l.sentiment_score) || 0), 0) / answeredLogs.length).toFixed(2)
            : null

        return corsJSON({
            campaign: {
                id: campaign.id,
                name: campaign.name
            },
            logs: logs || [],
            summary: {
                totalCalls: logs?.length || 0,
                answeredCalls: answeredLogs.length,
                transferred: logs?.filter(l => l.transferred).length || 0,
                conversionRate: logs?.length > 0
                    ? ((logs.filter(l => l.transferred).length / logs.length) * 100).toFixed(2)
                    : 0,
                avgSentiment
            }
        })
    } catch (e) {
        console.error('campaign logs error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
