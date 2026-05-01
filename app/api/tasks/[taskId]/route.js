import { corsJSON } from '@/lib/cors'
import { withAuth } from '@/lib/middleware/withAuth'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { enrichTasksWithProfiles } from '../route'

async function resolveTaskScope(admin, user, profile, taskId) {
    const [canViewAll, canViewTeam, canViewOwn] = await Promise.all([
        hasDashboardPermission(user.id, 'view_all_tasks'),
        hasDashboardPermission(user.id, 'view_team_tasks'),
        hasDashboardPermission(user.id, 'view_own_tasks'),
    ])

    const { data: task, error } = await admin
        .from('tasks')
        .select(`
            id, lead_id, project_id, title, description, due_date, due_time,
            priority, status, assigned_to, created_by, updated_by,
            completed_at, created_at, updated_at,
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
        .eq('id', taskId)
        .eq('organization_id', profile.organization_id)
        .single()

    if (error || !task) return { task: null, allowed: false }

    if (canViewAll) return { task, allowed: true }

    if (canViewTeam) {
        const isAssigned = task.assigned_to === user.id || task.created_by === user.id
        if (isAssigned) return { task, allowed: true }

        if (task.lead_id) {
            const { data: lead } = await admin
                .from('leads')
                .select('assigned_to')
                .eq('id', task.lead_id)
                .single()
            if (lead?.assigned_to === user.id) return { task, allowed: true }
        }
        return { task: null, allowed: false }
    }

    if (canViewOwn) {
        const allowed = task.assigned_to === user.id || task.created_by === user.id
        return { task: allowed ? task : null, allowed }
    }

    return { task: null, allowed: false }
}

/**
 * GET /api/tasks/[taskId]
 */
export const GET = withAuth(async (request, context) => {
    try {
        const { user, profile } = context
        const { taskId } = await context.params

        const [canViewAll, canViewTeam, canViewOwn] = await Promise.all([
            hasDashboardPermission(user.id, 'view_all_tasks'),
            hasDashboardPermission(user.id, 'view_team_tasks'),
            hasDashboardPermission(user.id, 'view_own_tasks'),
        ])
        if (!canViewAll && !canViewTeam && !canViewOwn) {
            return corsJSON({ error: 'Permission denied' }, { status: 403 })
        }

        const admin = createAdminClient()
        const { task, allowed } = await resolveTaskScope(admin, user, profile, taskId)
        if (!allowed) return corsJSON({ error: 'Task not found or access denied' }, { status: 404 })

        const [enriched] = await enrichTasksWithProfiles(admin, [task])
        return corsJSON({ task: enriched })
    } catch (e) {
        console.error('[Tasks/[id] GET]', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
})

/**
 * PATCH /api/tasks/[taskId]
 */
export const PATCH = withAuth(async (request, context) => {
    try {
        const { user, profile } = context
        const { taskId } = await context.params

        const [canEdit, canAssign] = await Promise.all([
            hasDashboardPermission(user.id, 'edit_tasks'),
            hasDashboardPermission(user.id, 'assign_tasks'),
        ])
        if (!canEdit) return corsJSON({ error: "You don't have permission to edit tasks" }, { status: 403 })

        const admin = createAdminClient()
        const { task: existing, allowed } = await resolveTaskScope(admin, user, profile, taskId)
        if (!allowed) return corsJSON({ error: 'Task not found or access denied' }, { status: 404 })

        const body = await request.json()
        const updates = {}
        const changedFields = {}

        const editableFields = ['title', 'description', 'due_date', 'due_time', 'priority', 'status', 'lead_id', 'project_id', 'unit_id']
        for (const field of editableFields) {
            if (field in body) {
                if (field === 'status' || body[field] !== existing[field]) {
                    changedFields[field] = [existing[field], body[field]]
                    updates[field] = body[field]
                }
            }
        }

        if ('assigned_to' in body && body.assigned_to !== existing.assigned_to) {
            if (!canAssign && body.assigned_to !== user.id) {
                return corsJSON({ error: "You don't have permission to assign tasks to others" }, { status: 403 })
            }
            changedFields.assigned_to = [existing.assigned_to, body.assigned_to]
            updates.assigned_to = body.assigned_to
        }

        if (updates.status === 'completed' && existing.status !== 'completed') {
            updates.completed_at = new Date().toISOString()
        } else if (updates.status && updates.status !== 'completed') {
            updates.completed_at = null
        }

        updates.updated_by = user.id

        const { data: updated, error } = await admin
            .from('tasks')
            .update(updates)
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

        if (error) {
            console.error('[Tasks PATCH]', error)
            return corsJSON({ error: error.message }, { status: 500 })
        }

        const { data: userProfile } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
        const userName = userProfile?.full_name || user.email

        if (updates.status && existing.status !== updates.status) {
            await logAudit(null, user.id, userName, 'task_status_changed', 'task', taskId, {
                from: existing.status, to: updates.status, title: existing.title,
            })
        } else if (Object.keys(changedFields).length > 0) {
            await logAudit(null, user.id, userName, 'task_updated', 'task', taskId, {
                changed_fields: changedFields, title: existing.title,
            })
        }

        if ('assigned_to' in updates && updates.assigned_to !== existing.assigned_to) {
            let assigneeName = 'Unassigned'
            if (updates.assigned_to) {
                const { data: ap } = await admin.from('profiles').select('full_name').eq('id', updates.assigned_to).single()
                assigneeName = ap?.full_name || updates.assigned_to
            }
            await logAudit(null, user.id, userName, 'task_assigned', 'task', taskId, {
                assigned_to_name: assigneeName, title: existing.title,
            })
        }

        const [enriched] = await enrichTasksWithProfiles(admin, [updated])
        return corsJSON({ task: enriched })
    } catch (e) {
        console.error('[Tasks PATCH]', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
})

/**
 * DELETE /api/tasks/[taskId]
 */
export const DELETE = withAuth(async (request, context) => {
    try {
        const { user, profile } = context
        const { taskId } = await context.params

        const canDelete = await hasDashboardPermission(user.id, 'delete_tasks')
        if (!canDelete) return corsJSON({ error: "You don't have permission to delete tasks" }, { status: 403 })

        const admin = createAdminClient()
        const { task: existing, allowed } = await resolveTaskScope(admin, user, profile, taskId)
        if (!allowed) return corsJSON({ error: 'Task not found or access denied' }, { status: 404 })

        const { error } = await admin.from('tasks').delete().eq('id', taskId)
        if (error) {
            console.error('[Tasks DELETE]', error)
            return corsJSON({ error: error.message }, { status: 500 })
        }

        const { data: userProfile } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
        await logAudit(null, user.id, userProfile?.full_name || user.email, 'task_deleted', 'task', taskId, {
            title:      existing.title,
            lead_id:    existing.lead_id,
            project_id: existing.project_id,
        })

        return corsJSON({ success: true })
    } catch (e) {
        console.error('[Tasks DELETE]', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
})
