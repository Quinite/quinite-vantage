import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

import { hasPermission, logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { getDefaultAvatar } from '@/lib/avatar-utils'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { withAuth } from '@/lib/middleware/withAuth'
import { LeadService } from '@/services/lead.service'
import { checkLeadLimit } from '@/lib/middleware/feature-limits'
import { requireActiveSubscription } from '@/lib/middleware/subscription'

console.log('[Leads API] Avatar utility loaded:', typeof getDefaultAvatar)

/**
 * GET /api/leads
 * Returns leads for the organization with permission-based filtering
 */
export const GET = withAuth(async (request, context) => {
    try {
        const { user, profile } = context

        // Check Permissions
        const canViewAll = await hasDashboardPermission(user.id, 'view_all_leads')
        const canViewTeam = await hasDashboardPermission(user.id, 'view_team_leads')
        const canViewOwn = await hasDashboardPermission(user.id, 'view_own_leads')

        if (!canViewAll && !canViewTeam && !canViewOwn) {
            return corsJSON({
                success: false,
                message: 'You don\'t have permission to view leads',
                data: []
            }, { status: 403 })
        }

        // Platform admins can see all leads
        const isPlatformAdmin = profile?.role === 'platform_admin'

        if (!profile?.organization_id && !isPlatformAdmin) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        // Get query parameters for filtering
        const { searchParams } = new URL(request.url)
        const filters = {
            projectId: searchParams.get('project_id'),
            projectIds: searchParams.get('project_ids')?.split(',').filter(Boolean),
            stageId: searchParams.get('stage_id'),
            stageIds: searchParams.get('stage_ids')?.split(',').filter(Boolean),
            assignedTo: searchParams.get('assigned_to'),
            assignedToIds: searchParams.get('assigned_to_ids')?.split(',').filter(Boolean),
            interestLevels: searchParams.get('interest_levels')?.split(',').filter(Boolean),
            sources: searchParams.get('sources')?.split(',').filter(Boolean),
            scoreMin: searchParams.get('score_min') ? parseInt(searchParams.get('score_min')) : undefined,
            scoreMax: searchParams.get('score_max') ? parseInt(searchParams.get('score_max')) : undefined,
            search: searchParams.get('search'),
            status: searchParams.get('status'),
            viewMode: searchParams.get('view_mode') || 'active',
            page: searchParams.get('page') || 1,
            limit: searchParams.get('limit') || 20,
            sortBy: searchParams.get('sortBy'),
            sortOrder: searchParams.get('sortOrder'),
            campaignId: searchParams.get('campaign_id') || undefined,
        }

        // Fetch leads using service layer
        const { leads, metadata } = await LeadService.getLeadsForUser(
            user.id,
            profile.organization_id,
            { canViewAll, canViewTeam, canViewOwn },
            filters
        )

        // Compute fields that were removed from the leads table schema
        const now = Date.now()
        const enrichedLeads = (leads || []).map(lead => {
            const callLogs = lead.call_logs || []
            const totalCalls = callLogs.length
            const endedLogs = callLogs.filter(c => c.ended_at).sort((a, b) => new Date(b.ended_at) - new Date(a.ended_at))
            const lastContactedAt = endedLogs[0]?.ended_at || null
            const lastSentimentScore = endedLogs[0]?.sentiment_score ?? null

            // Compute days in current stage from last stage_transition entry
            const lastTransition = Array.isArray(lead.last_transition) ? lead.last_transition[0] : null
            const transitionAt = lastTransition?.created_at ? new Date(lastTransition.created_at).getTime() : new Date(lead.created_at).getTime()
            const daysInCurrentStage = Math.floor((now - transitionAt) / (1000 * 60 * 60 * 24))

            return {
                ...lead,
                call_logs: undefined,
                last_transition: undefined,
                total_calls: totalCalls,
                last_contacted_at: lastContactedAt,
                last_sentiment_score: lastSentimentScore,
                days_in_current_stage: daysInCurrentStage,
            }
        })

        console.log('✅ [Leads GET] Fetched', enrichedLeads.length, 'leads (Page', filters.page, ')')

        return corsJSON({ leads: enrichedLeads, metadata })
    } catch (e) {
        console.error('leads GET error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
})

/**
 * POST /api/leads
 * Create a new lead
 */
export async function POST(request) {
    try {
        console.log('📝 [Leads POST] Starting lead creation...')

        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.log('❌ [Leads POST] Unauthorized')
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        const canCreate = await hasDashboardPermission(user.id, 'create_leads')
        if (!canCreate) {
            return corsJSON({
                success: false,
                message: 'You don\'t have permission to create leads'
            }, { status: 200 })
        }

        console.log('✅ [Leads POST] User authenticated:', user.email)

        // Get user's profile with admin client
        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
            .from('profiles')
            .select('organization_id, role, full_name') // Added full_name back for audit log
            .eq('id', user.id)
            .single()

        const isPlatformAdmin = profile?.role === 'platform_admin'

        if (!profile?.organization_id && !isPlatformAdmin) {
            console.log('❌ [Leads POST] No organization found')
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        console.log('✅ [Leads POST] Organization ID:', profile.organization_id)

        // Check subscription is active
        if (profile.organization_id) {
            const subError = await requireActiveSubscription(profile.organization_id)
            if (subError) return corsJSON(subError, { status: 402 })
        }

        // Check lead limit
        if (profile.organization_id) {
            const limitCheck = await checkLeadLimit(profile.organization_id)
            if (!limitCheck.allowed) {
                return corsJSON({
                    error: 'limit_reached',
                    resource: 'leads',
                    current: limitCheck.current,
                    limit: limitCheck.limit,
                    message: 'You have reached your lead limit. Contact us to upgrade.'
                }, { status: 403 })
            }
        }

        const body = await request.json()
        const { name, email, phone, projectId, notes, stageId, dealValue, assignedTo } = body

        console.log('📋 [Leads POST] Lead data:', { name, email, phone, projectId, stageId, dealValue, assignedTo })

        // Validation
        if (!name || name.trim() === '') {
            console.log('❌ [Leads POST] Name is required')
            return corsJSON({ error: 'Name is required' }, { status: 400 })
        }

        // [Logic] Determine Assignee
        // Default to creator (user.id) so they can see it (view_own_leads)
        let finalAssignedTo = user.id

        // If user has 'assign_leads' permission, they can override this (e.g. to null or another user)
        const canAssign = await hasDashboardPermission(user.id, 'assign_leads')
        if (canAssign && assignedTo !== undefined) {
            finalAssignedTo = assignedTo
        }


        let finalStageId = stageId || null
        if (profile.organization_id && !finalStageId) {
            try {
                // 1. Get default pipeline
                const { data: pipelines } = await adminClient
                    .from('pipelines')
                    .select('id')
                    .eq('organization_id', profile.organization_id)
                    .eq('is_default', true)
                    .limit(1)

                let pipelineId = pipelines?.[0]?.id

                // Fallback: If no default, just take the first one
                if (!pipelineId) {
                    const { data: allPipelines } = await adminClient
                        .from('pipelines')
                        .select('id')
                        .eq('organization_id', profile.organization_id)
                        .limit(1)
                    pipelineId = allPipelines?.[0]?.id
                }

                if (pipelineId) {
                    // 2. Get first stage of that pipeline
                    // Note: User schema says 'order_index', not 'position'
                    const { data: stages } = await adminClient
                        .from('pipeline_stages')
                        .select('id')
                        .eq('pipeline_id', pipelineId)
                        .order('order_index', { ascending: true })
                        .limit(1)

                    if (stages && stages.length > 0) {
                        finalStageId = stages[0].id
                        console.log('✅ [Leads POST] Auto-assigned to first stage:', finalStageId)
                    }
                }
            } catch (err) {
                console.warn('⚠️ [Leads POST] Could not fetch default stage:', err)
            }
        }

        // Create the lead with auto-assigned avatar
        const { data: lead, error } = await adminClient
            .from('leads')
            .insert({
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                project_id: projectId || null,
                stage_id: finalStageId, // Use provided or auto-assigned stage
                notes: notes?.trim() || null,
                organization_id: profile.organization_id,
                created_by: user.id,
                assigned_to: finalAssignedTo, // [FIX] Assign to default (creator) or specified user
                source: 'manual',
                avatar_url: getDefaultAvatar(email || name) // Auto-assign avatar based on email or name
            })
            .select()
            .single()

        if (error) {
            console.error('❌ [Leads POST] Database error:', error)
            
            // 23505 is the Postgres code for unique_violation
            if (error.code === '23505') {
                return corsJSON(
                    { error: 'A lead with this phone number already exists in this project.', code: error.code },
                    { status: 409 }
                )
            }

            return corsJSON(
                { error: error.message || error.details || 'Database error while creating lead', code: error.code },
                { status: 500 }
            )
        }

        console.log('✅ [Leads POST] Lead created successfully:', lead.id)

        // [Schema Alignment] Create Deal if value is provided
        if (dealValue && !isNaN(parseFloat(dealValue))) {
            const { error: dealError } = await adminClient
                .from('deals')
                .insert({
                    lead_id: lead.id,
                    amount: parseFloat(dealValue),
                    status: 'active', // Default status
                    organization_id: profile.organization_id,
                    // Optional: sync stage name if available, but staying minimal for now
                })

            if (dealError) {
                console.error('⚠️ [Leads POST] Failed to create deal:', dealError)
                // Don't fail the whole request, but log it
            } else {
                console.log('💰 [Leads POST] Deal created with value:', dealValue)
            }
        }

        // Audit log
        try {
            await logAudit(
                supabase,
                user.id,
                profile.full_name || user.email,
                'lead.create',
                'lead',
                lead.id,
                { lead_name: lead.name, value: dealValue }
            )
        } catch (auditError) {
            console.error('Audit log error:', auditError)
        }

        return corsJSON({ lead }, { status: 201 })
    } catch (e) {
        console.error('leads POST error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
