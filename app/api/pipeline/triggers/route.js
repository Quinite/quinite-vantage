import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'

const ALL_TRIGGER_KEYS = [
    'site_visit_booked',
    'site_visit_completed_interested',
    'site_visit_completed_not_interested',
    'site_visit_completed_follow_up',
    'site_visit_no_show',
    'call_answered',
    'call_transferred',
    'call_callback_requested',
    'call_exhausted',
    'deal_created',
    'deal_won',
    'deal_lost',
]

export const GET = withAuth(async (request, context) => {
    try {
        const { profile } = context
        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const admin = createAdminClient()
        const orgId = profile.organization_id

        const { data: rows, error } = await admin
            .from('org_pipeline_triggers')
            .select('trigger_key, is_enabled, target_stage_id, pipeline_stages(id, name)')
            .eq('organization_id', orgId)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const rowMap = Object.fromEntries((rows || []).map(r => [r.trigger_key, r]))

        const triggers = ALL_TRIGGER_KEYS.map(key => {
            const row = rowMap[key]
            return {
                trigger_key:       key,
                is_enabled:        row?.is_enabled ?? false,
                target_stage_id:   row?.target_stage_id ?? null,
                target_stage_name: row?.pipeline_stages?.name ?? null,
            }
        })

        return NextResponse.json({ triggers })
    } catch (err) {
        console.error('GET /api/pipeline/triggers error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})

export const PUT = withAuth(async (request, context) => {
    try {
        const { profile } = context
        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const body = await request.json()
        const { triggers } = body

        if (!Array.isArray(triggers)) {
            return NextResponse.json({ error: 'triggers must be an array' }, { status: 400 })
        }

        const admin = createAdminClient()
        const orgId = profile.organization_id
        const now = new Date().toISOString()

        const upserts = triggers
            .filter(t => ALL_TRIGGER_KEYS.includes(t.trigger_key))
            .map(t => ({
                organization_id: orgId,
                trigger_key:     t.trigger_key,
                is_enabled:      t.is_enabled ?? false,
                target_stage_id: t.target_stage_id || null,
                updated_at:      now,
            }))

        const { error } = await admin
            .from('org_pipeline_triggers')
            .upsert(upserts, { onConflict: 'organization_id,trigger_key' })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('PUT /api/pipeline/triggers error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})
