import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

// Fetch units
const fetchUnits = async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.projectId) params.append('project_id', filters.projectId)
    if (filters.type) params.append('type', filters.type)

    const res = await fetch(`/api/inventory/units?${params.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch units')
    const data = await res.json()
    return data.units
}

// Fetch single unit
const fetchUnit = async (id) => {
    const res = await fetch(`/api/inventory/units/${id}`)
    if (!res.ok) throw new Error('Failed to fetch unit')
    const data = await res.json()
    return data.unit
}

// Create unit
const createUnit = async (data) => {
    const res = await fetch('/api/inventory/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Failed to create unit')
    return res.json()
}

// Update unit
const updateUnit = async ({ id, ...updates }) => {
    const res = await fetch(`/api/inventory/units/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    })
    if (!res.ok) throw new Error('Failed to update unit')
    return res.json()
}

// Delete unit
const deleteUnit = async (id) => {
    const res = await fetch(`/api/inventory/units/${id}`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete unit')
    return true
}

export function useUnits(filters) {
    return useQuery({
        queryKey: ['units', filters],
        queryFn: () => fetchUnits(filters)
    })
}

export function useUnit(id) {
    return useQuery({
        queryKey: ['unit', id],
        queryFn: () => fetchUnit(id),
        enabled: !!id
    })
}

export function useCreateUnit() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] })
            toast.success('Unit created successfully')
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}

export function useUpdateUnit() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: updateUnit,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['units'] })
            queryClient.invalidateQueries({ queryKey: ['unit', data.id] })
            toast.success('Unit updated successfully')
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}

export function useDeleteUnit() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] })
            toast.success('Unit deleted successfully')
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}
