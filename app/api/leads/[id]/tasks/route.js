import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: tasks, error } = await supabase
            .from('tasks')
            .select(`
                *,
                project:projects!tasks_project_id_fkey(id, name, city, address),
                unit:units!tasks_unit_id_fkey(
                    id, unit_number, bedrooms, bathrooms, floor_number, facing, 
                    carpet_area, total_price, status, construction_status,
                    tower:towers(name)
                )
            `)
            .eq('lead_id', id)
            .order('due_date', { ascending: true, nullsFirst: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const userIds = [...new Set([
            ...(tasks || []).map(t => t.assigned_to).filter(Boolean),
            ...(tasks || []).map(t => t.created_by).filter(Boolean),
            ...(tasks || []).map(t => t.updated_by).filter(Boolean),
        ])]

        let profileMap = {}
        if (userIds.length > 0) {
            const admin = createAdminClient()
            const { data: profiles } = await admin
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds)
            if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
        }

        const enriched = (tasks || []).map(t => ({
            ...t,
            assignee: t.assigned_to ? (profileMap[t.assigned_to] ?? null) : null,
            creator:  t.created_by  ? (profileMap[t.created_by]  ?? null) : null,
            updater:  t.updated_by  ? (profileMap[t.updated_by]  ?? null) : null,
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
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const canCreate = await hasDashboardPermission(user.id, 'create_tasks')
        if (!canCreate) {
            return NextResponse.json({ error: "You don't have permission to create tasks" }, { status: 403 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, full_name')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 403 })
        }

        const admin = createAdminClient()
        const { data, error } = await admin
            .from('tasks')
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
                unit_id:         body.unit_id     || null,
                created_by:      user.id,
            })
            .select(`
                *,
                project:projects!tasks_project_id_fkey(id, name, city, address),
                unit:units!tasks_unit_id_fkey(
                    id, unit_number, bedrooms, bathrooms, floor_number, facing, 
                    carpet_area, total_price, status, construction_status,
                    tower:towers(name)
                )
            `)
            .single()

        if (error) {
            console.error('Supabase error creating task:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        await logAudit(null, user.id, profile.full_name || user.email, 'task_created', 'task', data.id, {
            title:    data.title,
            lead_id:  id,
            priority: data.priority,
        })

        return NextResponse.json({ task: data })
    } catch (error) {
        console.error('Error creating task:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
