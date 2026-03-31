import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { withAuth } from '@/lib/middleware/withAuth'
import { LeadService } from '@/services/lead.service'

/**
 * GET /api/leads/[id]
 * Get a single lead by ID
 */
export const GET = withAuth(async (request, { params, user, profile }) => {
    try {
        const { id } = await params

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get lead using service
        const lead = await LeadService.getLeadById(id, profile.organization_id)

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        return NextResponse.json({ lead })
    } catch (error) {
        console.error('Error fetching lead:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})


// Helper to check edit scope
async function canEditLead(userId, lead) {
    const canEditAll = await hasDashboardPermission(userId, 'edit_all_leads')
    const canEditTeam = await hasDashboardPermission(userId, 'edit_team_leads')
    const canEditOwn = await hasDashboardPermission(userId, 'edit_own_leads')

    if (canEditAll || canEditTeam) return true
    if (canEditOwn && lead.assigned_to === userId) return true

    return false
}

export async function PUT(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        // Validate ID
        if (!id || id === 'undefined' || id === 'null') {
            return NextResponse.json({ error: 'Invalid Lead ID' }, { status: 400 })
        }

        let body
        try {
            body = await request.json()
        } catch (e) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        // Get user profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Fetch existing lead to check ownership
        const { data: existingLead, error: fetchError } = await supabase
            .from('leads')
            .select('assigned_to, organization_id')
            .eq('id', id)
            .maybeSingle()

        if (fetchError || !existingLead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        // 2. Check Permissions
        const allowed = await canEditLead(user.id, existingLead)
        if (!allowed) {
            return NextResponse.json({
                success: false,
                message: 'You don\'t have permission to edit this lead'
            }, { status: 200 })
        }

        // Prepare update data
        const updateData = {}

        // [Permission Check] Assign Leads
        if (body.assignedTo !== undefined) {
            const canAssign = await hasDashboardPermission(user.id, 'assign_leads')
            if (!canAssign) {
                return NextResponse.json({
                    success: false,
                    message: 'You don\'t have permission to assign leads'
                }, { status: 200 })
            }
            updateData.assigned_to = body.assignedTo
        }

        // [Permission Check] Manage Deals
        if (body.dealValue !== undefined) {
            const canManageDeals = await hasDashboardPermission(user.id, 'manage_deals')
            if (!canManageDeals) {
                return NextResponse.json({
                    success: false,
                    message: 'You don\'t have permission to manage deals'
                }, { status: 200 })
            }
        }

        // Allow updating specific fields
        if (body.name !== undefined) updateData.name = body.name
        if (body.email !== undefined) updateData.email = body.email
        if (body.phone !== undefined) updateData.phone = body.phone
        if (body.stageId !== undefined) updateData.stage_id = body.stageId
        if (body.projectId !== undefined) updateData.project_id = body.projectId
        if (body.call_status !== undefined) updateData.call_status = body.call_status
        if (body.notes !== undefined) updateData.notes = body.notes
        if (body.mobile !== undefined) updateData.mobile = body.mobile
        if (body.title !== undefined) updateData.title = body.title
        if (body.department !== undefined) updateData.department = body.department
        if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url

        // Update lead
        const { data, error } = await supabase
            .from('leads')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .maybeSingle()

        if (error) {
            console.error('Error updating lead:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ error: 'Lead row not found after update' }, { status: 404 })
        }

        // [Inventory Automation] If Lead is WON, mark linked unit as SOLD
        const isWon = body.status === 'won' ||
            body.stage === 'won' ||
            (body.stageId && ['won', 'closed-won'].includes(body.stageId))

        if (isWon && data.unit_id) {
            const adminClient = createAdminClient()
            await adminClient
                .from('units')
                .update({ status: 'sold' })
                .eq('id', data.unit_id)

            console.log(`[Inventory] Auto-sold unit ${data.unit_id} for lead ${id}`)
        }

        // [Schema Alignment] Update Deal if value is provided
        if (body.dealValue !== undefined) {
            // We already checked permission above
            const amount = parseFloat(body.dealValue)
            if (!isNaN(amount)) {
                // Check if deal exists
                const { data: existingDeal } = await supabase
                    .from('deals')
                    .select('id')
                    .eq('lead_id', id)
                    .maybeSingle()

                if (existingDeal) {
                    await supabase
                        .from('deals')
                        .update({ amount })
                        .eq('id', existingDeal.id)
                } else {
                    // Get user profile for organization_id
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('organization_id')
                        .eq('id', user.id)
                        .maybeSingle()

                    if (profile?.organization_id) {
                        await supabase
                            .from('deals')
                            .insert({
                                lead_id: id,
                                amount,
                                status: 'active',
                                organization_id: profile.organization_id
                            })
                    }
                }
            }
        }

        return NextResponse.json({ lead: data })
    } catch (error) {
        console.error('Error updating lead:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        // Get user profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const canDelete = await hasDashboardPermission(user.id, 'delete_leads')
        if (!canDelete) {
            return NextResponse.json({
                success: false,
                message: 'You don\'t have permission to delete leads'
            }, { status: 200 })
        }

        // Delete dependent records manually (Cascade)

        // 1. Delete call-related data (depend on call_logs and lead)
        await Promise.all([
            supabase.from('conversation_insights').delete().eq('lead_id', id),
            supabase.from('agent_calls').delete().eq('lead_id', id),
            supabase.from('call_attempts').delete().eq('lead_id', id)
        ])

        // 2. Delete call logs (depends on lead)
        await supabase.from('call_logs').delete().eq('lead_id', id)

        // 3. Delete deals (depends on lead)
        await supabase.from('deals').delete().eq('lead_id', id)

        // 4. Delete lead
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting lead:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error('Error deleting lead:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
