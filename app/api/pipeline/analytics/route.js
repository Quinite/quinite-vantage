import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth } from '@/lib/middleware/withAuth'

/**
 * GET /api/pipeline/analytics
 * Per-stage metrics powered by stage_transitions table.
 * Query params: pipeline_id (required)
 */
export const GET = withAuth(async (request, { profile }) => {
    const { searchParams } = new URL(request.url)
    const pipelineId = searchParams.get('pipeline_id')
    if (!pipelineId) return NextResponse.json({ error: 'pipeline_id required' }, { status: 400 })

    const supabase = createAdminClient()

    // Fetch stages for this pipeline
    const { data: stages, error: stagesErr } = await supabase
        .from('pipeline_stages')
        .select('id, name, color, order_index')
        .eq('pipeline_id', pipelineId)
        .order('order_index')

    if (stagesErr) return NextResponse.json({ error: stagesErr.message }, { status: 500 })

    const stageIds = (stages ?? []).map(s => s.id)
    if (!stageIds.length) return NextResponse.json({ analytics: [] })

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Active leads per stage
    const { data: activeLeads } = await supabase
        .from('leads')
        .select('stage_id')
        .eq('organization_id', profile.organization_id)
        .in('stage_id', stageIds)
        .is('archived_at', null)

    // Transitions into each stage (all time — for avg days calculation)
    const { data: allTransitions } = await supabase
        .from('pipeline_stage_transitions')
        .select('to_stage_id, from_stage_id, lead_id, created_at')
        .eq('organization_id', profile.organization_id)
        .in('to_stage_id', stageIds)

    // Transitions into each stage this month (for entered_this_month)
    const { data: recentTransitions } = await supabase
        .from('pipeline_stage_transitions')
        .select('to_stage_id, lead_id')
        .eq('organization_id', profile.organization_id)
        .in('to_stage_id', stageIds)
        .gte('created_at', monthAgo)

    // Build per-stage metrics
    const activeCountMap: Record<string, number> = {}
    for (const lead of (activeLeads ?? [])) {
        if (lead.stage_id) activeCountMap[lead.stage_id] = (activeCountMap[lead.stage_id] ?? 0) + 1
    }

    const enteredThisMonthMap: Record<string, number> = {}
    for (const t of (recentTransitions ?? [])) {
        enteredThisMonthMap[t.to_stage_id] = (enteredThisMonthMap[t.to_stage_id] ?? 0) + 1
    }

    // Avg days between entering a stage and leaving it (approximation from consecutive transitions per lead)
    const stageTimeMap: Record<string, number[]> = {}
    const byLead: Record<string, typeof allTransitions> = {}
    for (const t of (allTransitions ?? [])) {
        if (!byLead[t.lead_id]) byLead[t.lead_id] = []
        byLead[t.lead_id]!.push(t)
    }

    for (const transitions of Object.values(byLead)) {
        const sorted = transitions!.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        for (let i = 0; i < sorted.length - 1; i++) {
            const stageId = sorted[i]!.to_stage_id
            const daysInStage = (new Date(sorted[i + 1]!.created_at).getTime() - new Date(sorted[i]!.created_at).getTime()) / (1000 * 60 * 60 * 24)
            if (!stageTimeMap[stageId]) stageTimeMap[stageId] = []
            stageTimeMap[stageId]!.push(daysInStage)
        }
    }

    const analytics = (stages ?? []).map(stage => {
        const times = stageTimeMap[stage.id] ?? []
        const avgDays = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null
        return {
            stage_id: stage.id,
            stage_name: stage.name,
            stage_color: stage.color,
            order_index: stage.order_index,
            active_leads: activeCountMap[stage.id] ?? 0,
            entered_this_month: enteredThisMonthMap[stage.id] ?? 0,
            avg_days_in_stage: avgDays,
        }
    })

    return NextResponse.json({ analytics })
})
