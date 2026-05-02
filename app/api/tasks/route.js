import { corsJSON } from '@/lib/cors'
import { withAuth } from '@/lib/middleware/withAuth'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { logAudit } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/tasks
 * Returns tasks scoped by view permission level:
 *   view_all_tasks  → all org tasks
 *   view_team_tasks → tasks on leads assigned to user + tasks assigned to user
 *   view_own_tasks  → tasks created_by or assigned_to the current user
 *
 * Query params: status, priority, due_before, due_after
 */
export const GET = withAuth(async (request, context) => {
    try {
        const { user, profile } = context

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        const [canViewTasks, canViewAll, canViewTeam, canViewOwn] = await Promise.all([
            hasDashboardPermission(user.id, 'view_tasks'),
            hasDashboardPermission(user.id, 'view_all_tasks'),
            hasDashboardPermission(user.id, 'view_team_tasks'),
            hasDashboardPermission(user.id, 'view_own_tasks'),
        ])

        if (!canViewTasks) {
            return corsJSON({ error: "You don't have permission to view tasks" }, { status: 403 })
        }
        if (!canViewAll && !canViewTeam && !canViewOwn) {
            return corsJSON({ error: "No task view scope permission granted" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const statusFilter = searchParams.get('status')
        const priority     = searchParams.get('priority')
        const dueBefore    = searchParams.get('due_before')
        const dueAfter     = searchParams.get('due_after')

        const admin = createAdminClient()

        let query = admin
            .from('tasks')
            .select(`
                id,
                lead_id,
                project_id,
                unit_id,
                title,
                description,
                due_date,
                due_time,
                priority,
                status,
                assigned_to,
                created_by,
                updated_by,
                completed_at,
                created_at,
                updated_at,
                lead:leads!tasks_lead_id_fkey(
                    id,
                    name,
                    email,
                    phone,
                    mobile,
                    score,
                    interest_level,
                    assigned_to,
                    stage:pipeline_stages!leads_stage_id_fkey(id, name, color)
                ),
                project:projects!tasks_project_id_fkey(
                    id,
                    name,
                    city,
                    address
                ),
                unit:units!tasks_unit_id_fkey(
                    id, unit_number, bedrooms, bathrooms, floor_number, facing, 
                    carpet_area, total_price, status, construction_status,
                    tower:towers(name)
                )
            `)
            .eq('organization_id', profile.organization_id)

        if (!canViewAll) {
            if (canViewTeam) {
                const { data: myLeads } = await admin
                    .from('leads')
                    .select('id')
                    .eq('organization_id', profile.organization_id)
                    .eq('assigned_to', user.id)

                const myLeadIds = (myLeads || []).map(l => l.id)

                if (myLeadIds.length > 0) {
                    query = query.or(
                        `assigned_to.eq.${user.id},created_by.eq.${user.id},lead_id.in.(${myLeadIds.join(',')})`
                    )
                } else {
                    query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
                }
            } else {
                // view_own_tasks only
                query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
            }
        }

        if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter)
        if (priority) query = query.eq('priority', priority)
        if (dueBefore) query = query.lte('due_date', dueBefore)
        if (dueAfter)  query = query.gte('due_date', dueAfter)

        query = query.order('due_date', { ascending: true, nullsFirst: false })

        const { data: tasks, error } = await query
        if (error) {
            console.error('[Tasks API] Query error:', error)
            return corsJSON({ error: error.message }, { status: 500 })
        }

        const enriched = await enrichTasksWithProfiles(admin, tasks || [])
        return corsJSON({ tasks: enriched })
    } catch (e) {
        console.error('[Tasks API] Unexpected error:', e)
        return corsJSON({ error: e.message || 'Internal server error' }, { status: 500 })
    }
})

/**
 * POST /api/tasks
 * Create a task (optionally linked to lead/project — both are optional).
 */
export const POST = withAuth(async (request, context) => {
    try {
        const { user, profile } = context

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        const canCreate = await hasDashboardPermission(user.id, 'create_tasks')
        if (!canCreate) {
            return corsJSON({ error: "You don't have permission to create tasks" }, { status: 403 })
        }

        const body = await request.json()

        if (!body.title?.trim()) {
            return corsJSON({ error: 'Title is required' }, { status: 400 })
        }

        const admin = createAdminClient()

        const { data: task, error } = await admin
            .from('tasks')
            .insert({
                organization_id: profile.organization_id,
                title:           body.title.trim(),
                description:     body.description  || null,
                due_date:        body.due_date      || null,
                due_time:        body.due_time      || null,
                priority:        body.priority      || 'medium',
                status:          'pending',
                assigned_to:     body.assigned_to   || null,
                lead_id:         body.lead_id        || null,
                project_id:      body.project_id     || null,
                unit_id:         body.unit_id        || null,
                created_by:      user.id,
            })
            .select('*')
            .single()

        if (error) {
            console.error('[Tasks API] Insert error:', error)
            return corsJSON({ error: error.message }, { status: 500 })
        }

        const { data: creatorProfile } = await admin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

        await logAudit(null, user.id, creatorProfile?.full_name || user.email, 'task_created', 'task', task.id, {
            title:      task.title,
            lead_id:    task.lead_id,
            project_id: task.project_id,
            priority:   task.priority,
        })

        return corsJSON({ task }, { status: 201 })
    } catch (e) {
        console.error('[Tasks API] POST error:', e)
        return corsJSON({ error: e.message || 'Internal server error' }, { status: 500 })
    }
})

// ─── Shared helper ────────────────────────────────────────────────────────────

export async function enrichTasksWithProfiles(admin, tasks) {
    const userIds = [...new Set([
        ...tasks.map(t => t.assigned_to).filter(Boolean),
        ...tasks.map(t => t.created_by).filter(Boolean),
        ...tasks.map(t => t.updated_by).filter(Boolean),
    ])]

    let profileMap = {}
    if (userIds.length > 0) {
        const { data: profiles } = await admin
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds)
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
    }

    return tasks.map(t => ({
        ...t,
        assignee: t.assigned_to ? (profileMap[t.assigned_to] ?? null) : null,
        creator:  t.created_by  ? (profileMap[t.created_by]  ?? null) : null,
        updater:  t.updated_by  ? (profileMap[t.updated_by]  ?? null) : null,
    }))
}
