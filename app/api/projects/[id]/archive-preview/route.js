import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth } from '@/lib/middleware/withAuth'
import { corsJSON } from '@/lib/cors'

export const GET = withAuth(async (request, { params, profile }) => {
    try {
        const { id } = await params

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        const admin = createAdminClient()

        // 1. Fetch counts in parallel
        const [campaigns, leads, unitsCount, calls] = await Promise.all([
            admin.from('campaigns').select('*', { count: 'exact', head: true }).eq('project_id', id),
            admin.from('leads').select('*', { count: 'exact', head: true }).eq('project_id', id),
            admin.from('units').select('*', { count: 'exact', head: true }).eq('project_id', id),
            admin.from('call_logs').select('*', { count: 'exact', head: true }).eq('project_id', id)
        ])

        // 2. Fetch running campaigns specifically (safety check)
        const { count: runningCampaigns } = await admin
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', id)
            .eq('status', 'running')

        return corsJSON({
            counts: {
                campaigns: campaigns.count || 0,
                leads: leads.count || 0,
                inventory: unitsCount.count || 0,
                calls: calls.count || 0,
                running_campaigns: runningCampaigns || 0
            }
        })

    } catch (e) {
        console.error('Archive preview error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
})
