import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

export async function GET() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        // 1. Fetch all pipelines and stages for the org
        const { data: pipelines, error: pipelineError } = await adminClient
            .from('pipelines')
            .select(`
                *,
                stages:pipeline_stages(*)
            `)
            .eq('organization_id', profile.organization_id)
            .order('created_at')

        if (pipelineError) throw pipelineError

        // 2. Fetch all ACTIVE (non-archived) leads for the org to get counts
        // We only need the stage_id for counting
        const { data: activeLeads, error: leadsError } = await adminClient
            .from('leads')
            .select('stage_id')
            .eq('organization_id', profile.organization_id)
            .is('archived_at', null)

        if (leadsError) console.warn('Error fetching active leads for counts:', leadsError)

        // 3. Aggregate counts in memory
        const leadCounts = {}
        let nullStageCount = 0

        activeLeads?.forEach(lead => {
            if (lead.stage_id) {
                leadCounts[lead.stage_id] = (leadCounts[lead.stage_id] || 0) + 1
            } else {
                nullStageCount++
            }
        })

        // 4. Attach counts to stages
        pipelines?.forEach(p => {
            if (p.stages) {
                p.stages.sort((a, b) => a.order_index - b.order_index)
                
                const firstStageId = p.stages[0]?.id

                p.stages = p.stages.map(s => {
                    let count = leadCounts[s.id] || 0
                    // Add null-stage leads to the first stage
                    if (s.id === firstStageId) {
                        count += nullStageCount
                    }
                    return {
                        ...s,
                        lead_count: count
                    }
                })
            }
        })

        return corsJSON({ pipelines: pipelines || [] })
    } catch (e) {
        console.error('pipelines GET error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
