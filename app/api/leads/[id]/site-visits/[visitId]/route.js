import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
