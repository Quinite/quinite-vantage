import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { firePipelineTrigger, TRIGGER_KEYS } from '@/lib/pipeline-triggers'

export async function PATCH(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id, visitId } = await params
        const body = await request.json()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const allowed = ['scheduled_at', 'status', 'assigned_agent_id', 'visit_notes',
                         'outcome', 'project_id', 'unit_id', 'pipeline_stage_id']
        const updates = Object.fromEntries(
            Object.entries(body).filter(([k]) => allowed.includes(k))
        )
        updates.updated_at = new Date().toISOString()

        const { data, error } = await supabase
            .from('site_visits')
            .update(updates)
            .eq('id', visitId)
            .eq('lead_id', id)
            .select('*')
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Fire pipeline trigger based on new status/outcome — non-blocking
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', authUser.id)
                .single()

            if (profile?.organization_id) {
                if (data.status === 'no_show') {
                    firePipelineTrigger(TRIGGER_KEYS.SITE_VISIT_NO_SHOW, id, profile.organization_id).catch(() => {})
                } else if (data.status === 'completed') {
                    const keyMap = {
                        interested:       TRIGGER_KEYS.SITE_VISIT_COMPLETED_INTERESTED,
                        not_interested:   TRIGGER_KEYS.SITE_VISIT_COMPLETED_NOT_INTERESTED,
                        follow_up_needed: TRIGGER_KEYS.SITE_VISIT_COMPLETED_FOLLOW_UP,
                    }
                    const triggerKey = keyMap[data.outcome]
                    if (triggerKey) firePipelineTrigger(triggerKey, id, profile.organization_id).catch(() => {})
                }
            }
        }

        return NextResponse.json({ visit: data })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id, visitId } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { error } = await supabase
            .from('site_visits')
            .delete()
            .eq('id', visitId)
            .eq('lead_id', id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
