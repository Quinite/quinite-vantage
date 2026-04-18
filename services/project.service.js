import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Project Service
 * Centralized business logic for project operations
 */
export class ProjectService {
    /**
     * Get projects for organization
     */
    static async getProjects(organizationId, filters = {}) {
        const adminClient = createAdminClient()

        let query = adminClient
            .from('projects')
            .select(`
                *,
                leads:leads(count),
                campaigns:campaigns(count)
            `, { count: 'exact' })
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (filters.status) {
            query = query.eq('status', filters.status)
        }


        // Pagination
        const page = filters.page ? parseInt(filters.page) : 1
        const limit = filters.limit ? parseInt(filters.limit) : 20
        const from = (page - 1) * limit
        const to = from + limit - 1

        query = query.range(from, to)

        const { data: projects, error, count } = await query

        if (error) throw error

        return {
            projects: projects || [],
            metadata: {
                total: count || 0,
                page,
                limit,
                hasMore: (from + limit) < (count || 0)
            }
        }
    }

    /**
     * Get single project by ID
     */
    static async getProjectById(projectId, organizationId) {
        const adminClient = createAdminClient()

        const { data: project, error } = await adminClient
            .from('projects')
            .select(`
                *,
                leads:leads(count),
                campaigns:campaigns(count),
                units:units(count),
                unit_configs:unit_configs(*)
            `)
            .eq('id', projectId)
            .eq('organization_id', organizationId)
            .single()

        if (error) throw error

        return project
    }

    /**
     * Create a new project
     */
    static async createProject(projectData, organizationId, createdBy) {
        const adminClient = createAdminClient()

        const insertData = {
            ...projectData,
            organization_id: organizationId,
            created_by: createdBy,
            status: 'active',
            created_at: new Date().toISOString()
        }

        const { data: project, error } = await adminClient
            .from('projects')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error

        return project
    }

    /**
     * Update a project
     */
    static async updateProject(projectId, updates, organizationId) {
        const adminClient = createAdminClient()

        const { data: project, error } = await adminClient
            .from('projects')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId)
            .eq('organization_id', organizationId)
            .select()
            .single()

        if (error) throw error

        return project
    }

    /**
     * Delete a project
     */
    static async deleteProject(projectId, organizationId) {
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('projects')
            .delete()
            .eq('id', projectId)
            .eq('organization_id', organizationId)

        if (error) throw error

        return true
    }

    /**
     * Get project statistics
     */
    static async getProjectStats(projectId, organizationId) {
        const adminClient = createAdminClient()

        // Get leads count
        const { count: leadsCount } = await adminClient
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)

        // Get campaigns count
        const { count: campaignsCount } = await adminClient
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)

        // Get units count
        const { count: unitsCount } = await adminClient
            .from('units')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)

        return {
            leadsCount: leadsCount || 0,
            campaignsCount: campaignsCount || 0,
            unitsCount: unitsCount || 0
        }
    }

    /**
     * Sync legacy unit_types JSON to unit_configs table
     */
    static async syncUnitConfigs(projectId, organizationId, unitTypes, userId) {
        if (!unitTypes || !Array.isArray(unitTypes)) return

        const adminClient = createAdminClient()

        // 1. Map legacy unit_types to unit_configs schema
        const configs = unitTypes.map(ut => ({
            id: ut.id && ut.id.length === 36 ? ut.id : undefined, // Keep ID if valid UUID
            project_id: projectId,
            organization_id: organizationId,
            category: ut.category || 'residential',
            property_type: ut.property_type || ut.type || 'Apartment',
            config_name: ut.configuration || ut.config_name || 'Standard',
            carpet_area: Number(ut.carpet_area) || 0,
            built_up_area: Number(ut.built_up_area) || Number(ut.builtup_area) || 0,
            super_built_up_area: Number(ut.super_built_up_area) || Number(ut.super_builtup_area) || 0,
            plot_area: Number(ut.plot_area) || 0,
            transaction_type: ut.transaction_type || 'sell',
            base_price: Number(ut.price) || Number(ut.base_price) || 0,
            amenities: Array.isArray(ut.amenities) ? ut.amenities : [],
            updated_at: new Date().toISOString(),
            updated_by: userId,
        }))

        // 2. Perform upsert
        for (const config of configs) {
            if (config.id) {
                await adminClient.from('unit_configs').upsert(config)
            } else {
                // If no ID, check by config_name to avoid duplicates
                const { data: existing } = await adminClient
                    .from('unit_configs')
                    .select('id')
                    .eq('project_id', projectId)
                    .eq('config_name', config.config_name)
                    .maybeSingle()
                
                if (existing) {
                    await adminClient.from('unit_configs').update(config).eq('id', existing.id)
                } else {
                    await adminClient.from('unit_configs').insert({ ...config, created_at: new Date().toISOString(), created_by: userId })
                }
            }
        }
    }
}
