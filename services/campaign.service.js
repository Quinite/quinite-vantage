import { createAdminClient } from '@/lib/supabase/admin'

// ─── Phone helpers ────────────────────────────────────────────────────────────
const INDIAN_PHONE_RE = /^\+91[6-9]\d{9}$/

export function validateAndNormalizePhone(raw) {
    if (!raw) return { valid: false, normalized: null }
    const cleaned = String(raw).replace(/[\s\-().]/g, '')
    let normalized = cleaned
    if (/^\d{10}$/.test(cleaned)) normalized = `+91${cleaned}`
    else if (/^91\d{10}$/.test(cleaned)) normalized = `+${cleaned}`
    const valid = INDIAN_PHONE_RE.test(normalized)
    return { valid, normalized: valid ? normalized : null }
}

/**
 * Campaign Service
 * Centralized business logic for campaign operations
 */
export class CampaignService {
    /**
     * Get campaigns for organization
     */
    static async getCampaigns(organizationId, filters = {}) {
        const adminClient = createAdminClient()

        let query = adminClient
            .from('campaigns')
            .select(`
                *,
                project:projects!campaigns_project_id_fkey(id, name),
                campaign_projects(project_id, project:projects(id, name, description, city, locality, project_status, possession_date))
            `, { count: 'exact' })
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (filters.status) {
            const statuses = filters.status.split(',').map(s => s.trim()).filter(Boolean)
            if (statuses.length === 1) query = query.eq('status', statuses[0])
            else query = query.in('status', statuses)
        }

        if (filters.projectId) {
            query = query.contains('project_ids', [filters.projectId])
        }

        // Pagination
        const page = filters.page ? parseInt(filters.page) : 1
        const limit = filters.limit ? parseInt(filters.limit) : 20
        const from = (page - 1) * limit
        const to = from + limit - 1

        query = query.range(from, to)

        const { data: campaigns, error, count } = await query

        if (error) throw error

        const normalized = (campaigns || []).map(c => ({
            ...c,
            projects: c.campaign_projects?.map(cp => cp.project).filter(Boolean)
                || (c.project ? [c.project] : [])
        }))

        return {
            campaigns: normalized,
            metadata: {
                total: count || 0,
                page,
                limit,
                hasMore: (from + limit) < (count || 0)
            }
        }
    }

    /**
     * Get single campaign by ID
     */
    static async getCampaignById(campaignId, organizationId) {
        const adminClient = createAdminClient()

        const { data: campaign, error } = await adminClient
            .from('campaigns')
            .select(`
                *,
                project:projects!campaigns_project_id_fkey(id, name),
                campaign_projects(project_id, project:projects(id, name, description, city, locality, project_status, possession_date)),
                call_logs(id, call_status, duration, transferred)
            `)
            .eq('id', campaignId)
            .eq('organization_id', organizationId)
            .single()

        if (error) throw error

        return {
            ...campaign,
            projects: campaign.campaign_projects?.map(cp => cp.project).filter(Boolean)
                || (campaign.project ? [campaign.project] : [])
        }
    }

    /**
     * Create a new campaign
     */
    static async createCampaign(campaignData, organizationId, createdBy) {
        const adminClient = createAdminClient()

        const insertData = {
            ...campaignData,
            organization_id: organizationId,
            created_by: createdBy,
            status: 'draft',
            total_calls: 0,
            answered_calls: 0,
            transferred_calls: 0,
            created_at: new Date().toISOString()
        }

        const { data: campaign, error } = await adminClient
            .from('campaigns')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error

        return campaign
    }

    /**
     * Update a campaign
     */
    static async updateCampaign(campaignId, updates, organizationId) {
        const adminClient = createAdminClient()

        const { data: campaign, error } = await adminClient
            .from('campaigns')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId)
            .eq('organization_id', organizationId)
            .select()
            .single()

        if (error) throw error

        return campaign
    }

    /**
     * Delete a campaign
     */
    static async deleteCampaign(campaignId, organizationId) {
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('campaigns')
            .delete()
            .eq('id', campaignId)
            .eq('organization_id', organizationId)

        if (error) throw error

        return true
    }

    /**
     * Update campaign status
     */
    static async updateCampaignStatus(campaignId, status, organizationId) {
        return this.updateCampaign(campaignId, { status }, organizationId)
    }

    /**
     * Get campaign statistics
     */
    static async getCampaignStats(campaignId, organizationId) {
        const adminClient = createAdminClient()

        // Get call logs for this campaign
        const { data: callLogs, error } = await adminClient
            .from('call_logs')
            .select('call_status, transferred, duration')
            .eq('campaign_id', campaignId)

        if (error) throw error

        const stats = {
            totalCalls: callLogs?.length || 0,
            transferred: callLogs?.filter(log => log.transferred).length || 0,
            completed: callLogs?.filter(log => log.call_status === 'completed').length || 0,
            noAnswer: callLogs?.filter(log => log.call_status === 'no_answer').length || 0,
            failed: callLogs?.filter(log => log.call_status === 'failed').length || 0,
            avgDuration: callLogs?.length > 0
                ? callLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / callLogs.length
                : 0,
            conversionRate: callLogs?.length > 0
                ? (callLogs.filter(log => log.transferred).length / callLogs.length) * 100
                : 0
        }

        return stats
    }

    /**
     * Get leads for campaign (via project) — legacy, kept for backward compat
     */
    static async getCampaignLeads(campaignId, organizationId) {
        const adminClient = createAdminClient()

        const { data: campaign } = await adminClient
            .from('campaigns')
            .select('project_id')
            .eq('id', campaignId)
            .eq('organization_id', organizationId)
            .single()

        if (!campaign?.project_id) return []

        const { data: leads, error } = await adminClient
            .from('leads')
            .select('*')
            .eq('project_id', campaign.project_id)
            .eq('organization_id', organizationId)
            .is('archived_at', null)

        if (error) throw error
        return leads || []
    }

    // ─── Enrollment ────────────────────────────────────────────────────────────

    /**
     * Enroll leads into a campaign.
     * Accepts explicit lead_ids array OR a filters object to select leads dynamically.
     * Returns a summary of what was enrolled vs skipped.
     */
    static async enrollLeads(campaignId, organizationId, enrolledBy, { lead_ids, filters } = {}) {
        const adminClient = createAdminClient()

        let leadsQuery = adminClient
            .from('leads')
            .select('id, phone, archived_at, do_not_call, project_id, stage:pipeline_stages(name), deals:deals(status), project:projects(archived_at)')
            .eq('organization_id', organizationId)

        if (lead_ids?.length > 0) {
            leadsQuery = leadsQuery.in('id', lead_ids)
        } else if (filters) {
            if (filters.stage_ids?.length > 0) leadsQuery = leadsQuery.in('stage_id', filters.stage_ids)
            if (filters.interest_level) leadsQuery = leadsQuery.eq('interest_level', filters.interest_level)
            if (filters.source) leadsQuery = leadsQuery.eq('source', filters.source)
            if (filters.assigned_to) leadsQuery = leadsQuery.eq('assigned_to', filters.assigned_to)
            if (filters.score_min != null) leadsQuery = leadsQuery.gte('score', filters.score_min)
            if (filters.score_max != null) leadsQuery = leadsQuery.lte('score', filters.score_max)
            if (filters.project_ids?.length > 0) leadsQuery = leadsQuery.in('project_id', filters.project_ids)
            else if (filters.project_id) leadsQuery = leadsQuery.eq('project_id', filters.project_id)
        } else {
            throw new Error('Must provide lead_ids or filters')
        }

        const { data: leads, error } = await leadsQuery
        if (error) throw error
        if (!leads?.length) return { enrolled: 0, skipped: 0, skip_details: {}, already_enrolled: 0 }

        const toEnroll = []
        const skipDetails = {}

        for (const lead of leads) {
            if (lead.archived_at) {
                skipDetails.lead_archived = (skipDetails.lead_archived || 0) + 1
                toEnroll.push({ campaign_id: campaignId, lead_id: lead.id, organization_id: organizationId, enrolled_by: enrolledBy, status: 'skipped', skip_reason: 'lead_archived' })
                continue
            }
            if (lead.do_not_call) {
                skipDetails.do_not_call = (skipDetails.do_not_call || 0) + 1
                toEnroll.push({ campaign_id: campaignId, lead_id: lead.id, organization_id: organizationId, enrolled_by: enrolledBy, status: 'skipped', skip_reason: 'do_not_call' })
                continue
            }
            if (lead.project?.archived_at) {
                skipDetails.project_archived = (skipDetails.project_archived || 0) + 1
                toEnroll.push({ campaign_id: campaignId, lead_id: lead.id, organization_id: organizationId, enrolled_by: enrolledBy, status: 'skipped', skip_reason: 'project_archived' })
                continue
            }
            const { valid } = validateAndNormalizePhone(lead.phone)
            if (!valid) {
                skipDetails.invalid_phone = (skipDetails.invalid_phone || 0) + 1
                toEnroll.push({ campaign_id: campaignId, lead_id: lead.id, organization_id: organizationId, enrolled_by: enrolledBy, status: 'skipped', skip_reason: 'invalid_phone' })
                continue
            }
            const stageName = lead.stage?.name?.toLowerCase()
            if (stageName === 'won' || stageName === 'lost') {
                skipDetails.stage_won_or_lost = (skipDetails.stage_won_or_lost || 0) + 1
                toEnroll.push({ campaign_id: campaignId, lead_id: lead.id, organization_id: organizationId, enrolled_by: enrolledBy, status: 'skipped', skip_reason: 'stage_won_or_lost' })
                continue
            }
            const hasClosedDeal = lead.deals?.some(d => d.status === 'reserved' || d.status === 'won')
            if (hasClosedDeal) {
                skipDetails.deal_reserved_or_won = (skipDetails.deal_reserved_or_won || 0) + 1
                toEnroll.push({ campaign_id: campaignId, lead_id: lead.id, organization_id: organizationId, enrolled_by: enrolledBy, status: 'skipped', skip_reason: 'deal_reserved_or_won' })
                continue
            }
            toEnroll.push({ campaign_id: campaignId, lead_id: lead.id, organization_id: organizationId, enrolled_by: enrolledBy, status: 'enrolled' })
        }

        if (!toEnroll.length) {
            return { enrolled: 0, skipped: leads.length, skip_details: skipDetails, already_enrolled: 0 }
        }

        const { data: inserted, error: insertErr } = await adminClient
            .from('campaign_leads')
            .upsert(toEnroll, { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true })
            .select('id, status')

        if (insertErr) throw insertErr

        const newlyInserted = inserted || []
        const enrolled = newlyInserted.filter(r => r.status === 'enrolled').length
        const skipped = newlyInserted.filter(r => r.status === 'skipped').length
        const alreadyEnrolled = toEnroll.length - newlyInserted.length

        if (enrolled > 0) {
            // Update timestamp
            await adminClient
                .from('campaigns')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', campaignId)

            // Increment total_enrolled via RPC or fallback to full recount
            try {
                const { error: rpcError } = await adminClient.rpc('increment_campaign_total_enrolled', { 
                    p_campaign_id: campaignId, 
                    p_amount: enrolled 
                })
                if (rpcError) throw rpcError
            } catch (err) {
                // Fallback: Recalculate total enrolled count from campaign_leads
                const { count } = await adminClient
                    .from('campaign_leads')
                    .select('id', { count: 'exact', head: true })
                    .eq('campaign_id', campaignId)

                await adminClient
                    .from('campaigns')
                    .update({ total_enrolled: count || 0 })
                    .eq('id', campaignId)
            }
        }

        return { enrolled, skipped, skip_details: skipDetails, already_enrolled: alreadyEnrolled }
    }

    /**
     * Get enrolled leads for a campaign with pagination.
     */
    static async getEnrolledLeads(campaignId, organizationId, { status, page = 1, limit = 50, search } = {}) {
        const adminClient = createAdminClient()
        const from = (page - 1) * limit

        let query = adminClient
            .from('campaign_leads')
            .select(`
                *,
                lead:leads(id, name, phone, email, score, interest_level, do_not_call, archived_at),
                call_log:call_logs(call_status, duration, sentiment_score, summary)
            `, { count: 'exact' })
            .eq('campaign_id', campaignId)
            .eq('organization_id', organizationId)
            .order('enrolled_at', { ascending: false })
            .range(from, from + limit - 1)

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        const { data, error, count } = await query
        if (error) throw error

        // Status counts for tab badges
        const { data: countRows } = await adminClient
            .from('campaign_leads')
            .select('status')
            .eq('campaign_id', campaignId)
            .eq('organization_id', organizationId)

        const statusCounts = {}
        for (const row of countRows || []) {
            statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
        }

        // Apply search client-side (small result sets) or use DB if large
        let rows = data || []
        if (search) {
            const s = search.toLowerCase()
            rows = rows.filter(r => r.lead?.name?.toLowerCase().includes(s) || r.lead?.phone?.includes(s))
        }

        return {
            leads: rows,
            metadata: { total: count || 0, page, limit, status_counts: statusCounts }
        }
    }

    /**
     * Remove a lead from a campaign.
     * Cleans call_queue if queued; marks campaign_leads as skipped.
     */
    static async removeLeadFromCampaign(campaignId, leadId, organizationId) {
        const adminClient = createAdminClient()

        const { data: cl, error } = await adminClient
            .from('campaign_leads')
            .select('id, status')
            .eq('campaign_id', campaignId)
            .eq('lead_id', leadId)
            .eq('organization_id', organizationId)
            .single()

        if (error || !cl) throw new Error('Enrollment not found')

        const prevStatus = cl.status

        // Remove from call_queue if queued
        if (prevStatus === 'queued' || prevStatus === 'enrolled') {
            await adminClient.from('call_queue')
                .delete()
                .eq('campaign_id', campaignId)
                .eq('lead_id', leadId)
                .eq('status', 'queued')
        }

        await adminClient.from('campaign_leads')
            .update({ status: 'skipped', skip_reason: 'manually_removed', updated_at: new Date().toISOString() })
            .eq('id', cl.id)

        return { previous_status: prevStatus, action: prevStatus === 'calling' ? 'noted_active_call' : 'removed' }
    }

    /**
     * Opt-out a lead from a campaign.
     * If global_dnc=true, sets leads.do_not_call and opts out of all other campaigns.
     */
    static async optOutLead(campaignId, leadId, organizationId, reason, globalDnc = false) {
        const adminClient = createAdminClient()
        const now = new Date().toISOString()

        // Remove from call_queue
        await adminClient.from('call_queue')
            .delete()
            .eq('campaign_id', campaignId)
            .eq('lead_id', leadId)
            .eq('status', 'queued')

        // Update this campaign_leads row
        await adminClient.from('campaign_leads')
            .update({ status: 'opted_out', opted_out_at: now, opted_out_reason: reason || null, updated_at: now })
            .eq('campaign_id', campaignId)
            .eq('lead_id', leadId)

        if (globalDnc) {
            await adminClient.from('leads')
                .update({ do_not_call: true, opted_out_at: now, opted_out_reason: reason || null })
                .eq('id', leadId)
                .eq('organization_id', organizationId)

            // Opt out of all other active campaigns
            await adminClient.from('campaign_leads')
                .update({ status: 'opted_out', opted_out_at: now, opted_out_reason: reason || null, updated_at: now })
                .eq('lead_id', leadId)
                .neq('campaign_id', campaignId)
                .in('status', ['enrolled', 'queued'])

            // Remove from call_queue for other campaigns too
            await adminClient.from('call_queue')
                .delete()
                .eq('lead_id', leadId)
                .neq('campaign_id', campaignId)
                .eq('status', 'queued')
        }
    }

    /**
     * Queue all enrolled leads: validate, insert into call_queue, update campaign_leads.
     * Returns { queued, skipped, skip_reasons }.
     */
    static async queueEnrolledLeads(campaignId, organizationId, creditCapRemaining = Infinity) {
        const adminClient = createAdminClient()

        const { data: enrolledRows, error } = await adminClient
            .from('campaign_leads')
            .select('id, lead_id, lead:leads(phone, archived_at, do_not_call, project:projects(archived_at))')
            .eq('campaign_id', campaignId)
            .eq('organization_id', organizationId)
            .eq('status', 'enrolled')

        if (error) throw error
        if (!enrolledRows?.length) return { queued: 0, skipped: 0, skip_reasons: {} }

        const queueInserts = []
        const clUpdatesQueued = []
        const clUpdatesSkipped = []
        const skipReasons = {}
        let queuedSoFar = 0

        for (const row of enrolledRows) {
            const lead = row.lead
            const skipUpdate = (reason) => {
                skipReasons[reason] = (skipReasons[reason] || 0) + 1
                clUpdatesSkipped.push({ id: row.id, skip_reason: reason })
            }

            if (lead?.archived_at) { skipUpdate('lead_archived'); continue }
            if (lead?.do_not_call) { skipUpdate('do_not_call'); continue }
            if (lead?.project?.archived_at) { skipUpdate('project_archived'); continue }

            const { valid, normalized } = validateAndNormalizePhone(lead?.phone)
            if (!valid) { skipUpdate('invalid_phone'); continue }

            if (queuedSoFar >= creditCapRemaining) { skipUpdate('credit_limit'); continue }

            queueInserts.push({ campaign_id: campaignId, lead_id: row.lead_id, organization_id: organizationId, status: 'queued' })
            clUpdatesQueued.push(row.id)
            queuedSoFar++
        }

        // Batch insert into call_queue
        if (queueInserts.length > 0) {
            const chunkSize = 100
            for (let i = 0; i < queueInserts.length; i += chunkSize) {
                await adminClient.from('call_queue')
                    .upsert(queueInserts.slice(i, i + chunkSize), { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true })
            }
            await adminClient.from('campaign_leads')
                .update({ status: 'queued', updated_at: new Date().toISOString() })
                .in('id', clUpdatesQueued)
        }

        // Batch update skipped
        for (const { id, skip_reason } of clUpdatesSkipped) {
            await adminClient.from('campaign_leads')
                .update({ status: 'skipped', skip_reason, updated_at: new Date().toISOString() })
                .eq('id', id)
        }

        return { queued: queuedSoFar, skipped: clUpdatesSkipped.length, skip_reasons: skipReasons }
    }

    /**
     * Auto-enroll all eligible leads from a project into a campaign.
     * Used as backward-compat fallback when no campaign_leads rows exist.
     */
    static async autoEnrollFromProject(campaignId, projectId, organizationId, enrolledBy) {
        const adminClient = createAdminClient()

        const { data: leads, error } = await adminClient
            .from('leads')
            .select('id, phone, archived_at, do_not_call')
            .eq('project_id', projectId)
            .eq('organization_id', organizationId)
            .is('archived_at', null)
            .eq('do_not_call', false)

        if (error) throw error
        if (!leads?.length) return { enrolled: 0 }

        const toInsert = leads
            .filter(l => validateAndNormalizePhone(l.phone).valid)
            .map(l => ({ campaign_id: campaignId, lead_id: l.id, organization_id: organizationId, enrolled_by: enrolledBy, status: 'enrolled' }))

        if (!toInsert.length) return { enrolled: 0 }

        await adminClient.from('campaign_leads')
            .upsert(toInsert, { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true })

        await adminClient.from('campaigns')
            .update({ total_enrolled: toInsert.length, updated_at: new Date().toISOString() })
            .eq('id', campaignId)

        return { enrolled: toInsert.length }
    }

    /**
     * Finalize campaign stats from call_logs.
     */
    static async finalizeStats(campaignId) {
        const adminClient = createAdminClient()
        const { data: logs } = await adminClient
            .from('call_logs')
            .select('call_status, transferred, sentiment_score')
            .eq('campaign_id', campaignId)

        const totalCalls = logs?.length || 0
        const answeredCalls = logs?.filter(l => ['called', 'completed'].includes(l.call_status)).length || 0
        const transferredCalls = logs?.filter(l => l.transferred).length || 0
        const sentimentScores = logs?.map(l => l.sentiment_score).filter(s => s != null) || []
        const avgSentimentScore = sentimentScores.length
            ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
            : null

        await adminClient.from('campaigns').update({
            total_calls: totalCalls,
            answered_calls: answeredCalls,
            transferred_calls: transferredCalls,
            avg_sentiment_score: avgSentimentScore,
            updated_at: new Date().toISOString()
        }).eq('id', campaignId)
    }
}
