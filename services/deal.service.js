import { createAdminClient } from '@/lib/supabase/admin'

const DEAL_SELECT = `
    *,
    lead:leads(
        id, name, email, phone, avatar_url, source, 
        project:projects(id, name),
        stage:pipeline_stages(id, name, color),
        assigned_to_user:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)
    ),
    unit:units(id, unit_number, floor_number, bedrooms, carpet_area, facing, status, base_price, total_price, tower:towers(name), project:projects(id, name)),
    project:projects(id, name)
`

const STATUS_ORDER = { reserved: 0, negotiation: 1, interested: 2, won: 3, lost: 4 }

function sortDealsByStatus(deals) {
    return [...deals].sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))
}

export class DealService {
    static async getDeals(organizationId, filters = {}) {
        const adminClient = createAdminClient()

        let query = adminClient
            .from('deals')
            .select(DEAL_SELECT)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (filters.status)    query = query.eq('status', filters.status)
        if (filters.leadId)    query = query.eq('lead_id', filters.leadId)
        if (filters.unitId)    query = query.eq('unit_id', filters.unitId)
        if (filters.projectId) query = query.eq('project_id', filters.projectId)

        const { data, error } = await query
        if (error) throw error
        return sortDealsByStatus(data || [])
    }

    static async getDealsByLead(leadId, organizationId) {
        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('deals')
            .select(DEAL_SELECT)
            .eq('lead_id', leadId)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return sortDealsByStatus(data || [])
    }

    static async getDealsByUnit(unitId, organizationId) {
        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('deals')
            .select(DEAL_SELECT)
            .eq('unit_id', unitId)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return sortDealsByStatus(data || [])
    }

    static async getDealById(dealId, organizationId) {
        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('deals')
            .select(DEAL_SELECT)
            .eq('id', dealId)
            .eq('organization_id', organizationId)
            .single()
        if (error) throw error
        return data
    }

    static async createDeal(dealData, organizationId, createdBy) {
        const adminClient = createAdminClient()

        const insertData = {
            organization_id: organizationId,
            created_by: createdBy,
            updated_by: null,
            lead_id: dealData.lead_id,
            unit_id: dealData.unit_id || null,
            project_id: dealData.project_id || null,
            name: dealData.name,
            amount: dealData.amount || null,
            status: dealData.status || 'interested',
            interest_source: dealData.interest_source || 'manual',
            site_visit_id: dealData.site_visit_id || null,
            notes: dealData.notes || null,
        }

        const { data, error } = await adminClient
            .from('deals')
            .insert(insertData)
            .select(DEAL_SELECT)
            .single()
        if (error) throw error
        return data
    }

    static async updateDeal(dealId, updates, organizationId, updatedBy) {
        const adminClient = createAdminClient()

        const statusTimestamps = {}
        if (updates.status === 'reserved') statusTimestamps.reserved_at = new Date().toISOString()
        if (updates.status === 'won')      statusTimestamps.won_at      = new Date().toISOString()
        if (updates.status === 'lost')     statusTimestamps.lost_at     = new Date().toISOString()

        const { data, error } = await adminClient
            .from('deals')
            .update({
                ...updates,
                ...statusTimestamps,
                updated_by: updatedBy || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', dealId)
            .eq('organization_id', organizationId)
            .select(DEAL_SELECT)
            .single()
        if (error) throw error
        return data
    }

    static async deleteDeal(dealId, organizationId) {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('deals')
            .delete()
            .eq('id', dealId)
            .eq('organization_id', organizationId)
        if (error) throw error
        return true
    }

    /**
     * Idempotent — only creates if no deal exists for this lead+unit pair.
     * Called automatically when a site visit with a unit is booked.
     */
    static async autoCreateFromSiteVisit(leadId, unitId, siteVisitId, organizationId, createdBy) {
        const adminClient = createAdminClient()

        const { data: existing } = await adminClient
            .from('deals')
            .select('id')
            .eq('lead_id', leadId)
            .eq('unit_id', unitId)
            .eq('organization_id', organizationId)
            .maybeSingle()

        if (existing) return null

        const { data: unit } = await adminClient
            .from('units')
            .select('unit_number, project:projects(name)')
            .eq('id', unitId)
            .single()

        const leadName = await adminClient
            .from('leads')
            .select('name')
            .eq('id', leadId)
            .single()
            .then(r => r.data?.name || 'Lead')

        const name = `${leadName} — ${unit?.unit_number || 'Unit'}`

        return this.createDeal(
            { lead_id: leadId, unit_id: unitId, site_visit_id: siteVisitId, interest_source: 'site_visit', name, status: 'interested' },
            organizationId,
            createdBy
        )
    }

    static async getDealStats(organizationId) {
        const adminClient = createAdminClient()
        const { data: deals, error } = await adminClient
            .from('deals')
            .select('status, amount')
            .eq('organization_id', organizationId)
        if (error) throw error

        return {
            total:        deals?.length || 0,
            interested:   deals?.filter(d => d.status === 'interested').length || 0,
            negotiation:  deals?.filter(d => d.status === 'negotiation').length || 0,
            reserved:     deals?.filter(d => d.status === 'reserved').length || 0,
            won:          deals?.filter(d => d.status === 'won').length || 0,
            lost:         deals?.filter(d => d.status === 'lost').length || 0,
            totalValue:   deals?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0,
            wonValue:     deals?.filter(d => d.status === 'won').reduce((sum, d) => sum + (d.amount || 0), 0) || 0,
            activeValue:  deals?.filter(d => !['lost','won'].includes(d.status)).reduce((sum, d) => sum + (d.amount || 0), 0) || 0,
        }
    }
}
