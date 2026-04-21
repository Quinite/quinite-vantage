import { BaseRepository } from '@/lib/repositories/base.repository'

export interface Lead {
    id: string
    organization_id: string
    project_id?: string
    stage_id?: string
    name: string
    email?: string
    phone?: string
    // status removed
    assigned_to?: string
    created_at: string
    // Add other fields as necessary
}

export class LeadRepository extends BaseRepository<Lead> {
    constructor() {
        super('leads')
    }

    async findWithRelations(id: string, organizationId: string): Promise<any> {
        const { data, error } = await this.client
            .from(this.tableName)
            .select(`
        *,
        project:projects(id, name, image_url, address),
        stage:pipeline_stages(id, name, color, pipeline_id),
        deals(id, amount, status),
        unit:units!properties_lead_id_fkey(id, unit_number, base_price, total_price, project:projects(id, name)),
        call_logs(*),
        assigned_to_user:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)
      `)
            .eq('id', id)
            .eq('organization_id', organizationId)
            .maybeSingle()

        if (error) throw error

        // units FK is on units.lead_id (one-to-many) so PostgREST returns an array — normalise to single object
        if (data && Array.isArray(data.unit)) {
            data.unit = data.unit[0] ?? null
        }

        return data
    }

    findLeadsWithRelations(organizationId: string, filters: any = {}): any {
        let query = this.client
            .from(this.tableName)
            .select(`
        *,
        project:projects(id, name),
        stage:pipeline_stages(id, name, color, pipeline_id, stale_days),
        deals(id, amount, status),
        assigned_to_user:profiles!leads_assigned_to_fkey(id, full_name, avatar_url),
        call_logs!call_logs_lead_id_fkey(id, ended_at, sentiment_score, call_status, created_at),
        last_transition:pipeline_stage_transitions(created_at)
      `)
            .eq('organization_id', organizationId)
            .order('created_at', { referencedTable: 'pipeline_stage_transitions', ascending: false })
            .limit(1, { referencedTable: 'pipeline_stage_transitions' })

        // Order Results
        const sortBy = filters.sortBy || 'created_at'
        const sortOrder = filters.sortOrder || 'desc'
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })

        // Apply filters
        if (filters.projectId) {
            query = query.eq('project_id', filters.projectId)
        }

        if (filters.stageId && filters.stageId !== 'all') {
            query = query.eq('stage_id', filters.stageId)
        }

        if (filters.search) {
            query = query.or(
                `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
            )
        }

        if (filters.assignedTo) {
            query = query.eq('assigned_to', filters.assignedTo)
        }

        // Campaign filter: only leads enrolled in this campaign (IDs pre-fetched by service layer)
        if (filters.campaignLeadIds) {
            query = filters.campaignLeadIds.length
                ? query.in('id', filters.campaignLeadIds)
                : query.eq('id', '00000000-0000-0000-0000-000000000000') // no results
        }

        // Archive Filtering
        if (filters.viewMode === 'archived') {
            query = query.not('archived_at', 'is', null)
        } else {
            query = query.is('archived_at', null)
        }

        return query
    }
}
