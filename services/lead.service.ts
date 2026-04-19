import { LeadRepository, Lead } from '@/lib/repositories/lead.repository'

export interface FilterOptions {
    projectId?: string
    stageId?: string
    search?: string
    status?: string
    page?: number | string
    limit?: number | string
    assignedTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    viewMode?: 'active' | 'archived'
}

export interface PermissionOptions {
    canViewAll: boolean
    canViewTeam: boolean
    canViewOwn: boolean
}

/**
 * Lead Service
 * Centralized business logic for lead operations
 */
export class LeadService {
    /**
     * Get leads with filters
     */
    static async getLeads(organizationId: string, filters: FilterOptions = {}) {
        const repo = new LeadRepository()

        const page = filters.page ? parseInt(String(filters.page)) : 1
        const limit = filters.limit ? parseInt(String(filters.limit)) : 50
        const from = (page - 1) * limit
        const to = from + limit - 1

        const query = repo.findLeadsWithRelations(organizationId, filters)

        // Get total count
        const countQuery = repo.client
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)

        if (filters.viewMode === 'archived') {
            countQuery.not('archived_at', 'is', null)
        } else {
            countQuery.is('archived_at', null)
        }

        const { count, error: countError } = await countQuery

        if (countError) console.error('Error counting leads:', countError)

        const { data: leads, error } = await query.range(from, to)

        if (error) throw error

        return {
            leads: leads || [],
            metadata: {
                total: count || 0,
                page,
                limit,
                hasMore: (from + limit) < (count || 0)
            }
        }
    }

    /**
     * Get leads for a specific user (scope-based)
     */
    static async getLeadsForUser(userId: string, organizationId: string, permissions: PermissionOptions, filters: FilterOptions = {}) {
        const { canViewAll, canViewTeam, canViewOwn } = permissions

        if (!canViewAll && !canViewTeam && !canViewOwn) {
            return { leads: [], metadata: { total: 0, page: 1, limit: 50, hasMore: false } }
        }

        const repo = new LeadRepository()

        const filterOverrides = { ...filters }
        if (!canViewAll && !canViewTeam && canViewOwn) {
            filterOverrides.assignedTo = userId
        }

        const query = repo.findLeadsWithRelations(organizationId, filterOverrides)

        const page = filters.page ? parseInt(String(filters.page)) : 1
        const limit = filters.limit ? parseInt(String(filters.limit)) : 50
        const from = (page - 1) * limit
        const to = from + limit - 1

        const countQuery = repo.client
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)

        if (filters.viewMode === 'archived') {
            countQuery.not('archived_at', 'is', null)
        } else {
            countQuery.is('archived_at', null)
        }

        // Apply permission scoping to count if applicable
        if (!canViewAll && !canViewTeam && canViewOwn) {
            countQuery.eq('assigned_to', userId)
        }

        const { count, error: countError } = await countQuery

        const { data: scopedLeads, error: scopedError } = await query.range(from, to)

        if (scopedError) throw scopedError

        return {
            leads: scopedLeads || [],
            metadata: {
                total: count || 0,
                page,
                limit,
                hasMore: (from + limit) < (count || 0)
            }
        }
    }

    /**
     * Get single lead by ID
     */
    static async getLeadById(leadId: string, organizationId: string) {
        const repo = new LeadRepository()
        return await repo.findWithRelations(leadId, organizationId)
    }

    /**
     * Create a new lead
     */
    static async createLead(leadData: Partial<Lead>, organizationId: string, createdBy: string) {
        const repo = new LeadRepository()
        const insertData = {
            ...leadData,
            organization_id: organizationId,
            created_by: createdBy,
            created_at: new Date().toISOString()
        }
        return await repo.create(insertData)
    }

    /**
     * Update a lead
     */
    static async updateLead(leadId: string, updates: Partial<Lead>, organizationId: string) {
        const repo = new LeadRepository()
        const { data, error } = await repo.client
            .from('leads')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId)
            .eq('organization_id', organizationId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    /**
     * Delete a lead
     */
    static async deleteLead(leadId: string, organizationId: string) {
        const repo = new LeadRepository()
        const { error } = await repo.client
            .from('leads')
            .delete()
            .eq('id', leadId)
            .eq('organization_id', organizationId)

        if (error) throw error
        return true
    }

    /**
     * Bulk delete leads
     */
    static async bulkDeleteLeads(leadIds: string[], organizationId: string) {
        const repo = new LeadRepository()
        const { error } = await repo.client
            .from('leads')
            .delete()
            .in('id', leadIds)
            .eq('organization_id', organizationId)

        if (error) throw error
        return true
    }

    /**
     * Update lead stage
     */
    static async updateLeadStage(leadId: string, stageId: string, organizationId: string) {
        return this.updateLead(leadId, { stage_id: stageId }, organizationId)
    }

    static async assignLead(leadId: string, userId: string, organizationId: string) {
        return this.updateLead(leadId, { assigned_to: userId }, organizationId)
    }
}
