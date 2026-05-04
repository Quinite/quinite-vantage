import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { NextResponse } from 'next/server'

export async function PUT(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { taskId } = await params
        const body = await request.json()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await hasDashboardPermission(user.id, 'edit_tasks')
        if (!canEdit) return NextResponse.json({ error: "You don't have permission to edit tasks" }, { status: 403 })

        const admin = createAdminClient()
        const { data: existing } = await admin.from('tasks').select('*').eq('id', taskId).single()
        if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

        const updateData = {
            title:       body.title,
            description: body.description ?? null,
            due_date:    body.due_date    ?? null,
            due_time:    body.due_time    ?? null,
            priority:    body.priority,
            status:      body.status,
            assigned_to: body.assigned_to ?? null,
            unit_id:     body.unit_id     ?? null,
            updated_by:  user.id,
        }

        if (body.status === 'completed') {
            updateData.completed_at = body.completed_at || new Date().toISOString()
        } else if (body.status === 'pending') {
            updateData.completed_at = null
        }

        const { data, error } = await admin
            .from('tasks')
            .update(updateData)
            .eq('id', taskId)
            .select(`
                *,
                lead:leads!tasks_lead_id_fkey(
                    id, name, email, phone, mobile, score, interest_level, assigned_to,
                    stage:pipeline_stages!leads_stage_id_fkey(id, name, color)
                ),
                project:projects!tasks_project_id_fkey(id, name, city, address),
                unit:units!tasks_unit_id_fkey(id, unit_number, title, tower:towers(id, name))
            `)
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single()

        if (existing.status !== body.status) {
            await logAudit(null, user.id, profile?.full_name || user.email, 'task_status_changed', 'task', taskId, {
                from: existing.status, to: body.status, title: existing.title,
            })
        } else {
            await logAudit(null, user.id, profile?.full_name || user.email, 'task_updated', 'task', taskId, {
                title: data.title,
            })
        }

        return NextResponse.json({ task: data })
    } catch (error) {
        console.error('Error updating task:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { taskId } = await params
        const body = await request.json()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await hasDashboardPermission(user.id, 'edit_tasks')
        if (!canEdit) return NextResponse.json({ error: "You don't have permission to edit tasks" }, { status: 403 })

        const admin = createAdminClient()
        const { data: existing } = await admin.from('tasks').select('*').eq('id', taskId).single()
        if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

        const updateData = { updated_by: user.id }
        if (body.status      !== undefined) updateData.status      = body.status
        if (body.title       !== undefined) updateData.title       = body.title
        if (body.description !== undefined) updateData.description = body.description
        if (body.due_date    !== undefined) updateData.due_date    = body.due_date
        if (body.due_time    !== undefined) updateData.due_time    = body.due_time
        if (body.priority    !== undefined) updateData.priority    = body.priority
        if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to
        if (body.unit_id     !== undefined) updateData.unit_id     = body.unit_id

        if (body.status === 'completed') {
            updateData.completed_at = new Date().toISOString()
        } else if (body.status === 'pending') {
            updateData.completed_at = null
        }

        const { data, error } = await admin
            .from('tasks')
            .update(updateData)
            .eq('id', taskId)
            .select(`
                *,
                lead:leads!tasks_lead_id_fkey(
                    id, name, email, phone, mobile, score, interest_level, assigned_to,
                    stage:pipeline_stages!leads_stage_id_fkey(id, name, color)
                ),
                project:projects!tasks_project_id_fkey(id, name, city, address),
                unit:units!tasks_unit_id_fkey(
                    id, unit_number, bedrooms, bathrooms, floor_number, facing, 
                    carpet_area, total_price, status, construction_status,
                    tower:towers(name)
                )
            `)
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single()

        if (body.status !== undefined && existing.status !== body.status) {
            await logAudit(null, user.id, profile?.full_name || user.email, 'task_status_changed', 'task', taskId, {
                from: existing.status, to: body.status, title: existing.title,
            })
        } else {
            await logAudit(null, user.id, profile?.full_name || user.email, 'task_updated', 'task', taskId, {
                title: existing.title,
            })
        }

        return NextResponse.json({ task: data })
    } catch (error) {
        console.error('Error updating task:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { taskId } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const canDelete = await hasDashboardPermission(user.id, 'delete_tasks')
        if (!canDelete) return NextResponse.json({ error: "You don't have permission to delete tasks" }, { status: 403 })

        const admin = createAdminClient()
        const { data: existing } = await admin.from('tasks').select('title, lead_id, project_id').eq('id', taskId).single()
        if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

        const { error } = await admin.from('tasks').delete().eq('id', taskId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
        await logAudit(null, user.id, profile?.full_name || user.email, 'task_deleted', 'task', taskId, {
            title: existing.title, lead_id: existing.lead_id, project_id: existing.project_id,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting task:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
