import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Unit Service
 * Centralized business logic for unit operations
 */
export class UnitService {
    /**
     * Get units for organization
     */
    static async getUnits(organizationId, filters = {}) {
        const adminClient = createAdminClient()

        let query = adminClient
            .from('units')
            .select(`
                *,
                project:projects(id, name, address),
                config:unit_configs(*),
                tower:towers(id, name),
                leads:leads(id, name, email, phone)
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (filters.projectId) {
            query = query.eq('project_id', filters.projectId)
        }

        if (filters.status) {
            query = query.eq('status', filters.status)
        }

        if (filters.category) {
            query = query.filter('config.category', 'eq', filters.category)
        }

        if (filters.search) {
            query = query.or(`unit_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`)
        }

        if (filters.limit) {
            query = query.limit(filters.limit)
        } else {
            query = query.limit(5000)
        }

        const { data: units, error } = await query

        if (error) throw error

        return units || []
    }

    /**
     * Get single unit by ID
     */
    static async getUnitById(unitId, organizationId) {
        const adminClient = createAdminClient()

        const { data: unit, error } = await adminClient
            .from('units')
            .select(`
                *,
                project:projects(id, name, address, image_url),
                config:unit_configs(*),
                tower:towers(id, name),
                leads:leads(id, name, email, phone)
            `)
            .eq('id', unitId)
            .eq('organization_id', organizationId)
            .single()

        if (error) throw error

        return unit
    }

    /**
     * Create a new unit
     */
    static async createUnit(unitData, organizationId, createdBy) {
        const adminClient = createAdminClient()

        const insertData = {
            ...unitData,
            organization_id: organizationId,
            created_by: createdBy,
            status: unitData.status || 'available',
            created_at: new Date().toISOString()
        }

        const { data: unit, error } = await adminClient
            .from('units')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error

        return unit
    }

    /**
     * Update a unit
     */
    static async updateUnit(unitId, updates, organizationId) {
        const adminClient = createAdminClient()

        const { data: unit, error } = await adminClient
            .from('units')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', unitId)
            .eq('organization_id', organizationId)
            .select()
            .single()

        if (error) throw error

        return unit
    }

    /**
     * Delete a unit
     */
    static async deleteUnit(unitId, organizationId) {
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('units')
            .delete()
            .eq('id', unitId)
            .eq('organization_id', organizationId)

        if (error) throw error

        return true
    }

    /**
     * Get unit configurations for project
     */
    static async getUnitConfigs(projectId, organizationId) {
        const adminClient = createAdminClient()

        const { data: configs, error } = await adminClient
            .from('unit_configs')
            .select('*')
            .eq('project_id', projectId)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: true })

        if (error) throw error

        return configs || []
    }

    /**
     * Create/Update unit configuration
     */
    static async saveUnitConfig(configData, organizationId, userId) {
        const adminClient = createAdminClient()
        
        const data = {
            ...configData,
            organization_id: organizationId,
            updated_at: new Date().toISOString(),
            updated_by: userId
        }

        if (!data.created_at) {
            data.created_at = new Date().toISOString()
            data.created_by = userId
        }

        let query
        if (data.id) {
            query = adminClient.from('unit_configs').update(data).eq('id', data.id)
        } else {
            query = adminClient.from('unit_configs').insert(data)
        }

        const { data: config, error } = await query.select().single()
        if (error) throw error
        return config
    }
}
