import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Custom hook for fetching leads with React Query
 * Provides automatic caching, background refetching, and loading states
 * 
 * @param {Object} filters - Filter options
 * @returns {Object} Query result with data, loading, error states
 */
export function useLeads(filters = {}) {
    return useQuery({
        queryKey: ['leads', filters],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters.projectId) params.append('project_id', filters.projectId)
            if (filters.stageId) params.append('stage_id', filters.stageId)
            if (filters.search) params.append('search', filters.search)
            if (filters.status) params.append('status', filters.status)
            if (filters.assignedTo) params.append('assigned_to', filters.assignedTo)
            if (filters.page) params.append('page', filters.page)
            if (filters.limit) params.append('limit', filters.limit)
            if (filters.sortBy) params.append('sortBy', filters.sortBy)
            if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

            const response = await fetch(`/api/leads?${params.toString()}`)
            if (!response.ok) throw new Error('Failed to fetch leads')
            const data = await response.json()
            // Return full object if we need metadata, but React Query often expects just data.
            // Best practice: return { leads: [], metadata: {} } and handle in component.
            return data
        },
        // Only fetch if we have necessary context
        enabled: true,
        placeholderData: (previousData) => previousData // v5 replacement for keepPreviousData
    })
}


/**
 * Custom hook for fetching a single lead
 */
export function useLead(leadId) {
    return useQuery({
        queryKey: ['lead', leadId],
        queryFn: async () => {
            const response = await fetch(`/api/leads/${leadId}`)
            if (!response.ok) throw new Error('Failed to fetch lead')
            const data = await response.json()
            return data.lead || null
        },
        enabled: !!leadId,
    })
}

/**
 * Custom hook for creating a lead
 */
export function useCreateLead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (leadData) => {
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadData)
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create lead')
            }
            return response.json()
        },
        onSuccess: (data) => {
            // Invalidate and refetch leads list
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            // Optionally add the new lead to cache
            queryClient.setQueryData(['lead', data.lead.id], data.lead)
        }
    })
}

/**
 * Custom hook for updating a lead
 */
export function useUpdateLead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ leadId, updates }) => {
            const response = await fetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update lead')
            }
            return response.json()
        },
        onSuccess: (data, variables) => {
            // Update the specific lead in cache
            queryClient.setQueryData(['lead', variables.leadId], data.lead)
            // Invalidate leads list to refetch
            queryClient.invalidateQueries({ queryKey: ['leads'] })
        }
    })
}

/**
 * Custom hook for deleting a lead
 */
export function useDeleteLead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (leadId) => {
            const response = await fetch(`/api/leads/${leadId}`, {
                method: 'DELETE'
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete lead')
            }
            return response.json()
        },
        onSuccess: (data, leadId) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: ['lead', leadId] })
            // Invalidate leads list
            queryClient.invalidateQueries({ queryKey: ['leads'] })
        }
    })
}

/**
 * Custom hook for bulk deleting leads
 */
export function useBulkDeleteLeads() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (leadIds) => {
            const response = await fetch('/api/leads/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds })
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete leads')
            }
            return response.json()
        },
        onSuccess: (data, leadIds) => {
            // Remove all deleted leads from cache
            leadIds.forEach(id => {
                queryClient.removeQueries({ queryKey: ['lead', id] })
            })
            // Invalidate leads list
            queryClient.invalidateQueries({ queryKey: ['leads'] })
        }
    })
}
/**
 * Custom hook for bulk updating leads
 */
export function useBulkUpdateLeads() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ leadIds, updates }) => {
            const response = await fetch('/api/leads/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds, updates })
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update leads')
            }
            return response.json()
        },
        onSuccess: (data, { leadIds }) => {
            // Remove all updated leads from cache to force refresh
            leadIds.forEach(id => {
                queryClient.removeQueries({ queryKey: ['lead', id] })
            })
            // Invalidate leads list
            queryClient.invalidateQueries({ queryKey: ['leads'] })
        }
    })
}
