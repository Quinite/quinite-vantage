import { corsJSON } from '@/lib/cors'
import { withAuth } from '@/lib/middleware/withAuth'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/tasks
 * Returns tasks across all leads the current user has access to.
 * Scoped by permission level:
 *   - view_all_leads  → all org tasks
 *   - view_team_leads → tasks on leads assigned to user + tasks assigned to user
 *   - view_own_leads  → tasks directly assigned to user
 *
 * Query params:
 *   status    : 'pending' | 'completed' | 'all'  (default: all)
 *   priority  : 'high' | 'medium' | 'low'
 *   due_before: ISO date string
 *   due_after : ISO date string
 */
export const GET = withAuth(async (request, context) => {
    try {
        const { user, profile } = context

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        // Check permission level in parallel
        const [canViewAll, canViewTeam, canViewOwn] = await Promise.all([
            hasDashboardPermission(user.id, 'view_all_leads'),
            hasDashboardPermission(user.id, 'view_team_leads'),
            hasDashboardPermission(user.id, 'view_own_leads'),
        ])

        if (!canViewAll && !canViewTeam && !canViewOwn) {
            return corsJSON(
                { success: false, message: "You don't have permission to view tasks" },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const statusFilter = searchParams.get('status')    // 'pending' | 'completed' | 'all'
        const priority     = searchParams.get('priority')  // 'high' | 'medium' | 'low'
        const dueBefore    = searchParams.get('due_before')
        const dueAfter     = searchParams.get('due_after')

        const admin = createAdminClient()

        let query = admin
            .from('lead_tasks')
            .select(`
                id,
                lead_id,
                title,
                description,
                due_date,
                due_time,
                priority,
                status,
                assigned_to,
                created_by,
                completed_at,
                created_at,
                lead:leads!lead_tasks_lead_id_fkey(
                    id,
                    name,
                    email,
                    phone,
                    mobile,
                    score,
                    interest_level,
                    budget_range,
                    assigned_to,
                    stage:pipeline_stages!leads_stage_id_fkey(id, name, color)
                )
            `)
            .eq('organization_id', profile.organization_id)

        // Apply permission scope
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
                        `assigned_to.eq.${user.id},lead_id.in.(${myLeadIds.join(',')})`
                    )
                } else {
                    query = query.eq('assigned_to', user.id)
                }
            } else {
                // view_own_leads only: tasks directly assigned to me
                query = query.eq('assigned_to', user.id)
            }
        }

        // Optional filters
        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }
        if (priority) {
            query = query.eq('priority', priority)
        }
        if (dueBefore) {
            query = query.lte('due_date', dueBefore)
        }
        if (dueAfter) {
            query = query.gte('due_date', dueAfter)
        }

        query = query.order('due_date', { ascending: true, nullsFirst: false })

        const { data: tasks, error } = await query

        if (error) {
            console.error('[Tasks API] Query error:', error)
            return corsJSON({ error: error.message }, { status: 500 })
        }

        // Batch-fetch profiles for assigned_to / created_by
        const userIds = [...new Set([
            ...(tasks || []).map(t => t.assigned_to).filter(Boolean),
            ...(tasks || []).map(t => t.created_by).filter(Boolean),
        ])]

        let profileMap = {}
        if (userIds.length > 0) {
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

        return corsJSON({ tasks: enriched })
    } catch (e) {
        console.error('[Tasks API] Unexpected error:', e)
        return corsJSON({ error: e.message || 'Internal server error' }, { status: 500 })
    }
})
