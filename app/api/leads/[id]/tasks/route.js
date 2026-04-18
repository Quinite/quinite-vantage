import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Cleanup completed tasks older than 24 hours
        try {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            await supabase
                .from('lead_tasks')
                .delete()
                .eq('lead_id', id)
                .eq('status', 'completed')
                .lt('completed_at', yesterday)
        } catch (cleanupError) {
            console.error('Error cleaning up old tasks:', cleanupError)
        }

        const { data: tasks, error } = await supabase
            .from('lead_tasks')
            .select('*')
            .eq('lead_id', id)
            .order('due_date', { ascending: true, nullsFirst: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Enrich with assignee + creator profiles
        const userIds = [...new Set([
            ...(tasks || []).map(t => t.assigned_to).filter(Boolean),
            ...(tasks || []).map(t => t.created_by).filter(Boolean),
        ])]

        let profileMap = {}
        if (userIds.length > 0) {
            const admin = createAdminClient()
            const { data: profiles } = await admin
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds)
            if (profiles) {
                profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
            }
        }

        const enriched = (tasks || []).map(t => ({
            ...t,
            assignee: t.assigned_to ? (profileMap[t.assigned_to] ?? null) : null,
            creator:  t.created_by  ? (profileMap[t.created_by]  ?? null) : null,
        }))

        return NextResponse.json({ tasks: enriched })
    } catch (error) {
        console.error('Error fetching tasks:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params
        const body = await request.json()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 403 })
        }

        // due_date can be a full datetime-local string (YYYY-MM-DDTHH:mm)
        // or a date string — store as-is, Postgres handles both
        const { data, error } = await supabase
            .from('lead_tasks')
            .insert({
                lead_id:         id,
                organization_id: profile.organization_id,
                title:           body.title,
                description:     body.description || null,
                due_date:        body.due_date    || null,
                due_time:        body.due_time    || null,
                priority:        body.priority    || 'medium',
                status:          'pending',
                assigned_to:     body.assigned_to || null,
                created_by:      user.id,
            })
            .select('*')
            .single()

        if (error) {
            console.error('Supabase error creating task:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ task: data })
    } catch (error) {
        console.error('Error creating task:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
