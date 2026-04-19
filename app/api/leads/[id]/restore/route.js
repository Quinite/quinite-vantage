import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { withAuth } from '@/lib/middleware/withAuth'

/**
 * POST /api/leads/[id]/restore
 * Restores an archived lead by clearing the archived_at timestamp
 */
export const POST = withAuth(async (request, { params, user }) => {
    try {
        const { id } = await params
        const supabase = await createServerSupabaseClient()

        // 1. Check permissions
        const canEditAll = await hasDashboardPermission(user.id, 'edit_all_leads')
        const canEditTeam = await hasDashboardPermission(user.id, 'edit_team_leads')
        const canEditOwn = await hasDashboardPermission(user.id, 'edit_own_leads')

        const { data: lead, error: fetchErr } = await supabase
            .from('leads')
            .select('assigned_to, organization_id')
            .eq('id', id)
            .maybeSingle()

        if (fetchErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

        const canEdit = canEditAll || canEditTeam || (canEditOwn && lead.assigned_to === user.id)
        if (!canEdit) {
            return NextResponse.json({ success: false, message: "You don't have permission to restore this lead" }, { status: 403 })
        }

        const adminClient = createAdminClient()

        // 2. Clear archive metadata
        // We intentionally DO NOT revive tasks or deals to prevent accidental triggers.
        const { error: restoreErr } = await adminClient
            .from('leads')
            .update({ 
                archived_at: null, 
                archived_by: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (restoreErr) throw restoreErr

        return NextResponse.json({ success: true, message: 'Lead successfully restored' }, { status: 200 })
    } catch (error) {
        console.error('Error restoring lead:', error)
        return NextResponse.json({ error: 'Internal server error while restoring lead' }, { status: 500 })
    }
})
