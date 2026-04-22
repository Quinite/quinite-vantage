import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ── Lead-scoped hooks ──────────────────────────────────────────────────────

export function useSiteVisits(leadId) {
    return useQuery({
        queryKey: ['site-visits', leadId],
        queryFn: async () => {
            const res = await fetch(`/api/leads/${leadId}/site-visits`)
            if (!res.ok) throw new Error('Failed to fetch site visits')
            const data = await res.json()
            return data.visits ?? []
        },
        enabled: !!leadId,
        staleTime: 30 * 1000,
    })
}

export function useCreateSiteVisit(leadId) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (payload) => {
            const res = await fetch(`/api/leads/${leadId}/site-visits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to create site visit')
            }
            return res.json()
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['site-visits', leadId] })
            qc.invalidateQueries({ queryKey: ['all-site-visits'] })
        },
    })
}

export function useUpdateSiteVisit(leadId) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ visitId, ...updates }) => {
            const res = await fetch(`/api/leads/${leadId}/site-visits/${visitId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to update site visit')
            }
            return res.json()
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['site-visits', leadId] })
            qc.invalidateQueries({ queryKey: ['all-site-visits'] })
        },
    })
}

export function useDeleteSiteVisit(leadId) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (visitId) => {
            const res = await fetch(`/api/leads/${leadId}/site-visits/${visitId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Failed to delete site visit')
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['site-visits', leadId] })
            qc.invalidateQueries({ queryKey: ['all-site-visits'] })
        },
    })
}

// ── Org-wide hook (calendar) ───────────────────────────────────────────────

export function useAllSiteVisits({ from, to, agentId, projectId } = {}) {
    const params = new URLSearchParams()
    if (from)      params.set('from', from)
    if (to)        params.set('to', to)
    if (agentId)   params.set('agent_id', agentId)
    if (projectId) params.set('project_id', projectId)

    return useQuery({
        queryKey: ['all-site-visits', { from, to, agentId, projectId }],
        queryFn: async () => {
            const res = await fetch(`/api/crm/site-visits?${params}`)
            if (!res.ok) throw new Error('Failed to fetch site visits')
            const data = await res.json()
            return data.visits ?? []
        },
        staleTime: 60 * 1000,
    })
}
