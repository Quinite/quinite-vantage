import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { withAuth } from '@/lib/middleware/withAuth'

/**
 * POST /api/leads/bulk-restore
 * Restores multiple archived leads
 */
export const POST = withAuth(async (request, { user }) => {
    try {
        const { leadIds } = await request.json()
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 })
        }

        const supabase = await createServerSupabaseClient()
        const adminClient = createAdminClient()
        const now = new Date().toISOString()

        // 1. Check permissions
        const canEditAll = await hasDashboardPermission(user.id, 'edit_all_leads')
        const canEditTeam = await hasDashboardPermission(user.id, 'edit_team_leads')
        const canEditOwn = await hasDashboardPermission(user.id, 'edit_own_leads')

        // Fetch targets to check ownership
        const { data: leads, error: fetchErr } = await supabase
            .from('leads')
            .select('id, assigned_to')
            .in('id', leadIds)

        if (fetchErr || !leads) return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })

        // Filter leads the user is allowed to edit
        const authorizedLeadIds = leads
            .filter(lead => canEditAll || canEditTeam || (canEditOwn && lead.assigned_to === user.id))
            .map(lead => lead.id)

        if (authorizedLeadIds.length === 0) {
            return NextResponse.json({ success: false, message: "You don't have permission to restore these leads" }, { status: 403 })
        }

        // 2. Perform bulk restore
        const { error: restoreErr } = await adminClient
            .from('leads')
            .update({ 
                archived_at: null, 
                archived_by: null,
                updated_at: now
            })
            .in('id', authorizedLeadIds)

        if (restoreErr) throw restoreErr

        return NextResponse.json({ 
            success: true, 
            message: `${authorizedLeadIds.length} leads successfully restored`,
            count: authorizedLeadIds.length
        }, { status: 200 })
    } catch (error) {
        console.error('Error in bulk restore:', error)
        return NextResponse.json({ error: 'Internal server error while bulk restoring' }, { status: 500 })
    }
})
