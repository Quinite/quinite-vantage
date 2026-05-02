import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

const supabase = createClient()

/**
 * Hook to fetch projects specifically enabled for Inventory
 */
export function useInventoryProjects() {
    return useQuery({
        queryKey: ['inventory-projects'],
        queryFn: async () => {
            const res = await fetch('/api/inventory/projects')
            if (!res.ok) throw new Error('Failed to fetch inventory projects')
            const data = await res.json()
            return data.projects || []
        },
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook to fetch all units for the inventory
 */
export function useInventoryUnits(projectId = null) {
    return useQuery({
        queryKey: ['inventory-units', projectId],
        queryFn: async () => {
            const url = projectId
                ? `/api/inventory/units?project_id=${projectId}`
                : '/api/inventory/units'
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to fetch units')
            const data = await res.json()
            return data.units || []
        },
        staleTime: 2 * 60 * 1000, // Units change more frequently
    })
}

/**
 * Hook to fetch unit configurations for a project
 */
export function useUnitConfigs(projectId) {
    return useQuery({
        queryKey: ['unit-configs', projectId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('unit_configs')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: true })
            if (error) throw new Error(error.message)
            return data || []
        },
        enabled: !!projectId,
    })
}

/**
 * Hook to fetch specific project details from inventory perspective
 */
export function useInventoryProject(projectId) {
    return useQuery({
        queryKey: ['inventory-project', projectId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}`)
            if (!res.ok) throw new Error('Failed to fetch project')
            const data = await res.json()
            return data.project || null
        },
        enabled: !!projectId,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook to fetch inventory-specific analytics
 */
export function useInventoryAnalytics() {
    return useQuery({
        queryKey: ['inventory-analytics'],
        queryFn: async () => {
            const res = await fetch('/api/inventory/analytics')
            if (!res.ok) throw new Error('Failed to fetch inventory analytics')
            return res.json()
        },
        staleTime: 10 * 60 * 1000,
    })
}

/**
 * Comprehensive hook for inventory management (Towers + Units)
 */
export function useInventory({ projectId, organizationId }) {
    const queryClient = useQueryClient()

    const { data: towers = [], isLoading: towersLoading, refetch: refetchTowers } = useQuery({
        queryKey: ['inventory-towers', projectId, organizationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('towers')
                .select('*')
                .eq('project_id', projectId)
                .eq('organization_id', organizationId)
                .order('order_index')
            if (error) throw new Error(error.message)
            return data || []
        },
        enabled: !!projectId && !!organizationId,
    })

    const { data: units = {}, isLoading: unitsLoading, refetch: refetchUnits } = useQuery({
        queryKey: ['inventory-units-grouped', projectId, organizationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('units')
                .select('*, config:unit_configs(*)')
                .eq('project_id', projectId)
                .eq('organization_id', organizationId)
                .order('floor_number', { ascending: false })
                .order('created_at', { ascending: true })
            if (error) throw new Error(error.message)

            // Return as object keyed by tower_id
            return (data || []).reduce((acc, unit) => {
                const towerId = unit.tower_id || 'unassigned'
                if (!acc[towerId]) acc[towerId] = []
                acc[towerId].push(unit)
                return acc
            }, {})
        },
        enabled: !!projectId && !!organizationId,
    })

    const isLoading = towersLoading || unitsLoading

    // Mutations
    const addTower = async (towerData) => {
        const { data, error } = await supabase
            .from('towers')
            .insert({ ...towerData, project_id: projectId, organization_id: organizationId })
            .select().single()

        if (error) {
            toast.error('Failed to add tower')
            throw new Error(error.message)
        }
        await refetchTowers()
        return data
    }

    const updateTower = async (towerId, updates) => {
        const { data, error } = await supabase
            .from('towers')
            .update(updates)
            .eq('id', towerId)
            .eq('organization_id', organizationId)
            .select().single()

        if (error) {
            toast.error('Failed to update tower')
            throw new Error(error.message)
        }
        await refetchTowers()
        return data
    }

    const deleteTower = async (towerId) => {
        await supabase.from('units').delete().eq('tower_id', towerId).eq('organization_id', organizationId)
        const { error } = await supabase.from('towers').delete().eq('id', towerId).eq('organization_id', organizationId)

        if (error) {
            toast.error('Failed to delete tower')
            throw new Error(error.message)
        }
        await refetchTowers()
        await refetchUnits()
    }

    const addUnit = async (unitData) => {
        const { data, error } = await supabase
            .from('units')
            .insert({ ...unitData, project_id: projectId, organization_id: organizationId })
            .select().single()

        if (error) {
            toast.error('Failed to add unit')
            throw new Error(error.message)
        }
        await refetchUnits()
        return data
    }

    const updateUnit = async (unitId, updates) => {
        const { data, error } = await supabase
            .from('units')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', unitId)
            .eq('organization_id', organizationId)
            .select().single()

        if (error) {
            toast.error('Failed to update unit')
            throw new Error(error.message)
        }
        await refetchUnits()
        return data
    }

    const deleteUnit = async (unitId) => {
        const { error } = await supabase.from('units').delete().eq('id', unitId).eq('organization_id', organizationId)
        if (error) {
            toast.error('Failed to delete unit')
            throw new Error(error.message)
        }
        await refetchUnits()
    }

    const updateUnitStatus = async (unitId, newStatus) => {
        return updateUnit(unitId, { status: newStatus })
    }

    const updateUnitPrice = async (unitId, priceData) => {
        return updateUnit(unitId, priceData)
    }

    const saveUnitConfig = async (configData) => {
        const method = configData.id ? 'PUT' : 'POST'
        const url = configData.id ? `/api/inventory/units/configs/${configData.id}` : '/api/inventory/units/configs'

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...configData, project_id: projectId })
        })

        if (!response.ok) {
            const data = await response.json()
            toast.error(data.error || 'Failed to save configuration')
            throw new Error(data.error || 'Failed to save configuration')
        }

        queryClient.invalidateQueries({ queryKey: ['unit-configs', projectId] })
        return response.json()
    }

    const deleteUnitConfig = async (configId) => {
        const response = await fetch(`/api/inventory/units/configs/${configId}`, {
            method: 'DELETE'
        })

        if (!response.ok) {
            const data = await response.json()
            toast.error(data.error || 'Failed to delete configuration')
            throw new Error(data.error || 'Failed to delete configuration')
        }

        queryClient.invalidateQueries({ queryKey: ['unit-configs', projectId] })
        toast.success('Unit configuration removed')
        return response.json()
    }

    return {
        towers,
        units,
        isLoading,
        addTower,
        updateTower,
        deleteTower,
        addUnit,
        updateUnit,
        deleteUnit,
        updateUnitStatus,
        updateUnitPrice,
        saveUnitConfig,
        deleteUnitConfig,
        refetch: () => { refetchTowers(); refetchUnits(); },
    }
}
