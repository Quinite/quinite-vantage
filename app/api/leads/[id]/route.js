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
        const supabase = createAdminClient()

        const { data: lead, error } = await supabase
            .from('leads')
            .select(`
                *,
                project:projects(id, name, image_url, address),
                stage:pipeline_stages(id, name, color, pipeline_id),
                deals(id, name, amount, status, created_at, unit:units(id, unit_number, floor_number, carpet_area, built_up_area, base_price, total_price, status, bedrooms, facing, transaction_type), project:projects(id, name)),
                unit:units!properties_lead_id_fkey(id, unit_number, base_price, total_price),
                call_logs!call_logs_lead_id_fkey(id, duration, created_at, direction, notes, call_status, summary, recording_url, conversation_transcript, sentiment_score, interest_level, disconnect_reason),
                assigned_to_user:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)
            `)
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .maybeSingle()

        if (error) {
            console.error('Lead fetch error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        // units FK is on units.lead_id (one-to-many) — normalise to single object
        if (Array.isArray(lead.unit)) {
            lead.unit = lead.unit[0] ?? null
        }

        // Compute fields that were removed from the leads table (now derived from call_logs)
        const callLogs = lead.call_logs || []
        const endedLogs = callLogs.filter(c => c.ended_at).sort((a, b) => new Date(b.ended_at) - new Date(a.ended_at))
        lead.total_calls = callLogs.length
        lead.last_contacted_at = endedLogs[0]?.ended_at || null
        lead.last_sentiment_score = endedLogs[0]?.sentiment_score ?? null
        // transferred: check if any call_log has transferred=true
        lead.transferred_to_human = callLogs.some(c => c.transferred === true)

        return NextResponse.json({ lead })
    } catch (error) {
        console.error('Error fetching lead:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
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
        if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url

        // Profile fields (formerly in lead_profiles, now on leads)
        if (body.company !== undefined) updateData.company = body.company
        if (body.job_title !== undefined) updateData.job_title = body.job_title
        if (body.industry !== undefined) updateData.industry = body.industry
        if (body.department !== undefined) updateData.department = body.department
        if (body.mailing_street !== undefined) updateData.mailing_street = body.mailing_street
        if (body.mailing_city !== undefined) updateData.mailing_city = body.mailing_city
        if (body.mailing_state !== undefined) updateData.mailing_state = body.mailing_state
        if (body.mailing_zip !== undefined) updateData.mailing_zip = body.mailing_zip
        if (body.mailing_country !== undefined) updateData.mailing_country = body.mailing_country

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

        // Platform Admin Hard-Delete Guard Check
        const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        
        if (userProfile?.role !== 'platform_admin') {
            return NextResponse.json({
                success: false,
                message: 'Permanent deletion is locked. Only Platform Admins can hard delete leads. Please use the Archive function instead.'
            }, { status: 403 })
        }

        const canDelete = await hasDashboardPermission(user.id, 'delete_leads')
        if (!canDelete) {
            return NextResponse.json({
                success: false,
                message: 'You don\'t have permission to delete leads'
            }, { status: 200 })
        }

        const adminClient = createAdminClient()
        const now = new Date().toISOString()

        // Clean up campaign enrollment: remove from call_queue and mark campaign_leads archived
        const { data: activeCampaignLeads } = await adminClient
            .from('campaign_leads')
            .select('id, campaign_id')
            .eq('lead_id', id)
            .in('status', ['enrolled', 'queued'])

        if (activeCampaignLeads?.length > 0) {
            const campaignIds = [...new Set(activeCampaignLeads.map(cl => cl.campaign_id))]
            await Promise.all([
                adminClient.from('call_queue').delete().eq('lead_id', id).in('campaign_id', campaignIds).eq('status', 'queued'),
                adminClient.from('campaign_leads')
                    .update({ status: 'archived', skip_reason: 'lead_archived', updated_at: now })
                    .in('id', activeCampaignLeads.map(cl => cl.id))
            ])
        }

        // Delete dependent records manually (Cascade)

        // 1. Delete call-related data (depend on call_logs and lead)
        await Promise.all([
            supabase.from('conversation_insights').delete().eq('lead_id', id),
            supabase.from('agent_calls').delete().eq('lead_id', id)
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
