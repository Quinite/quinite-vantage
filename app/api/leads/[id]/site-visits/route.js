import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { DealService } from '@/services/deal.service'
import { firePipelineTrigger, TRIGGER_KEYS } from '@/lib/pipeline-triggers'

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: visits, error } = await supabase
            .from('site_visits')
            .select('*, project:projects(id, name), unit:units(id, unit_number, tower:towers(name))')
            .eq('lead_id', id)
            .order('scheduled_at', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Enrich with agent profile
        const agentIds = [...new Set((visits || []).map(v => v.assigned_agent_id).filter(Boolean))]
        let agentMap = {}
        if (agentIds.length > 0) {
            const admin = createAdminClient()
            const { data: profiles } = await admin
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', agentIds)
            if (profiles) agentMap = Object.fromEntries(profiles.map(p => [p.id, p]))
        }

        const enriched = (visits || []).map(v => ({
            ...v,
            assigned_agent: v.assigned_agent_id ? (agentMap[v.assigned_agent_id] ?? null) : null,
        }))

        return NextResponse.json({ visits: enriched })
    } catch (error) {
        console.error('Error fetching site visits:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params
        const body = await request.json()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 403 })
        }

        const { data, error } = await supabase
            .from('site_visits')
            .insert({
                lead_id:           id,
                organization_id:   profile.organization_id,
                project_id:        body.project_id        || null,
                unit_id:           body.unit_id            || null,
                scheduled_at:      body.scheduled_at,
                status:            body.status             || 'scheduled',
                booked_via:        body.booked_via         || 'manual',
                assigned_agent_id: body.assigned_agent_id  || null,
                visit_notes:       body.visit_notes        || null,
                pipeline_stage_id: body.pipeline_stage_id  || null,
                created_by:        user.id,
            })
            .select('*')
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Auto-create a deal (interested) when a site visit is booked for a specific unit
        let dealCreated = false
        if (data.unit_id) {
            try {
                const result = await DealService.autoCreateFromSiteVisit(
                    id,
                    data.unit_id,
                    data.id,
                    profile.organization_id,
                    user.id
                )
                dealCreated = result !== null
            } catch {
                // Non-blocking — site visit is saved regardless
            }
        }

        // Fire pipeline trigger — non-blocking
        firePipelineTrigger(TRIGGER_KEYS.SITE_VISIT_BOOKED, id, profile.organization_id).catch(() => {})

        return NextResponse.json({ visit: data, dealCreated }, { status: 201 })
    } catch (error) {
        console.error('Error creating site visit:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
