'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ─── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchCampaigns(filters = {}) {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.projectId) params.append('project_id', filters.projectId)
    if (filters.page) params.append('page', filters.page)
    if (filters.limit) params.append('limit', filters.limit)
    const res = await fetch(`/api/campaigns?${params.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch campaigns')
    return res.json()
}

async function fetchCampaign(id) {
    const res = await fetch(`/api/campaigns/${id}`)
    if (!res.ok) throw new Error('Failed to fetch campaign')
    return res.json()
}

async function fetchCampaignLeads(campaignId, { status, page = 1, limit = 50, search } = {}) {
    const params = new URLSearchParams({ page, limit })
    if (status && status !== 'all') params.append('status', status)
    if (search) params.append('search', search)
    const res = await fetch(`/api/campaigns/${campaignId}/leads?${params}`)
    if (!res.ok) throw new Error('Failed to fetch campaign leads')
    return res.json()
}

async function fetchCampaignProgress(campaignId) {
    const res = await fetch(`/api/campaigns/${campaignId}/progress`)
    if (!res.ok) throw new Error('Failed to fetch progress')
    return res.json()
}

// ─── Queries ───────────────────────────────────────────────────────────────────

export function useCampaigns(filters = {}) {
    return useQuery({
        queryKey: ['campaigns', filters],
        queryFn: () => fetchCampaigns(filters),
        staleTime: 30_000
    })
}

export function useCampaign(id) {
    return useQuery({
        queryKey: ['campaign', id],
        queryFn: () => fetchCampaign(id),
        enabled: !!id,
        staleTime: 30_000
    })
}

export function useCampaignLeads(campaignId, filters = {}) {
    return useQuery({
        queryKey: ['campaign-leads', campaignId, filters],
        queryFn: () => fetchCampaignLeads(campaignId, filters),
        enabled: !!campaignId,
        staleTime: 15_000
    })
}

export function useCampaignProgress(campaignId, isRunning = false) {
    return useQuery({
        queryKey: ['campaign-progress', campaignId],
        queryFn: () => fetchCampaignProgress(campaignId),
        enabled: !!campaignId,
        refetchInterval: isRunning ? 4000 : false,
        staleTime: 0
    })
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

function invalidateCampaign(qc, id) {
    qc.invalidateQueries({ queryKey: ['campaigns'] })
    if (id) qc.invalidateQueries({ queryKey: ['campaign', id] })
}

export function useCreateCampaign() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (body) => {
            const res = await fetch('/api/campaigns', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create campaign')
            return data
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign created') },
        onError: (e) => toast.error(e.message)
    })
}

export function useUpdateCampaign(id) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (body) => {
            const res = await fetch(`/api/campaigns/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || data.error || 'Update failed')
            return data
        },
        onSuccess: () => { invalidateCampaign(qc, id); toast.success('Campaign updated') },
        onError: (e) => toast.error(e.message)
    })
}

export function useDeleteCampaign() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Delete failed')
            return data
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['campaigns'] })
            toast.success(data.archived ? 'Campaign archived (data preserved)' : 'Campaign deleted')
        },
        onError: (e) => toast.error(e.message)
    })
}

export function useStartCampaign() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/campaigns/${id}/start`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || data.error || 'Failed to start')
            return data
        },
        onSuccess: (data, id) => { invalidateCampaign(qc, id); toast.success(`Campaign started — ${data.summary?.queued || 0} calls queued`) },
        onError: (e) => toast.error(e.message)
    })
}

export function usePauseCampaign() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to pause')
            return data
        },
        onSuccess: (_, id) => { invalidateCampaign(qc, id); toast.success('Campaign paused') },
        onError: (e) => toast.error(e.message)
    })
}

export function useResumeCampaign() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/campaigns/${id}/resume`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || data.error || 'Failed to resume')
            return data
        },
        onSuccess: (_, id) => { invalidateCampaign(qc, id); toast.success('Campaign resumed') },
        onError: (e) => toast.error(e.message)
    })
}

export function useCancelCampaign() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/campaigns/${id}/cancel`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to cancel')
            return data
        },
        onSuccess: (_, id) => { invalidateCampaign(qc, id); toast.success('Campaign cancelled') },
        onError: (e) => toast.error(e.message)
    })
}

export function useCompleteCampaign() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, force = false }) => {
            const res = await fetch(`/api/campaigns/${id}/complete`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || data.error || 'Failed to complete')
            return data
        },
        onSuccess: (_, { id }) => { invalidateCampaign(qc, id); toast.success('Campaign marked as completed') },
        onError: (e) => toast.error(e.message)
    })
}

export function useArchiveCampaign() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/campaigns/${id}/archive`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to archive')
            return data
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign archived') },
        onError: (e) => toast.error(e.message)
    })
}


export function useEnrollLeads(campaignId) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (body) => {
            const res = await fetch(`/api/campaigns/${campaignId}/leads`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Enrollment failed')
            return data
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['campaign-leads', campaignId] })
            qc.invalidateQueries({ queryKey: ['campaign', campaignId] })
            toast.success(`Enrolled ${data.enrolled} lead${data.enrolled !== 1 ? 's' : ''}${data.skipped > 0 ? ` (${data.skipped} skipped)` : ''}`)
        },
        onError: (e) => toast.error(e.message)
    })
}

export function useRemoveLeadFromCampaign(campaignId) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (leadId) => {
            const res = await fetch(`/api/campaigns/${campaignId}/leads/${leadId}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Remove failed')
            return data
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['campaign-leads', campaignId] })
            toast.success('Lead removed from campaign')
        },
        onError: (e) => toast.error(e.message)
    })
}

export function useOptOutLead(campaignId) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ leadId, reason, globalDnc = false }) => {
            const res = await fetch(`/api/campaigns/${campaignId}/leads/${leadId}/opt-out`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, global_dnc: globalDnc })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Opt-out failed')
            return data
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['campaign-leads', campaignId] })
            toast.success('Lead opted out')
        },
        onError: (e) => toast.error(e.message)
    })
}

export function useCampaignCallLogs(campaignId, filters = {}) {
    return useQuery({
        queryKey: ['campaign-call-logs', campaignId, filters],
        queryFn: async () => {
            const params = new URLSearchParams({ page: filters.page || 1, limit: filters.limit || 20 })
            if (filters.status) params.set('status', filters.status)
            if (filters.transferred) params.set('transferred', 'true')
            const res = await fetch(`/api/campaigns/${campaignId}/logs?${params}`)
            if (!res.ok) throw new Error('Failed to fetch call logs')
            return res.json()
        },
        enabled: !!campaignId,
        staleTime: 30 * 1000,
    })
}

export function useCampaignAnalytics(campaignId) {
    return useQuery({
        queryKey: ['campaign-analytics', campaignId],
        queryFn: async () => {
            const res = await fetch(`/api/campaigns/${campaignId}/logs?limit=1000`)
            if (!res.ok) throw new Error('Failed to fetch logs for analytics')
            const data = await res.json()
            const logs = data.logs || []

            const byDate = {}
            for (const log of logs) {
                const date = log.created_at?.slice(0, 10)
                if (!date) continue
                if (!byDate[date]) byDate[date] = { date, total: 0, answered: 0, transferred: 0, sentimentSum: 0, sentimentCount: 0 }
                byDate[date].total++
                if (['called', 'completed'].includes(log.call_status)) byDate[date].answered++
                if (log.transferred) byDate[date].transferred++
                if (log.sentiment_score != null) { byDate[date].sentimentSum += log.sentiment_score; byDate[date].sentimentCount++ }
            }

            const dailyData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
                ...d,
                avgSentiment: d.sentimentCount > 0 ? +(d.sentimentSum / d.sentimentCount).toFixed(2) : null,
                transferRate: d.total > 0 ? +(d.transferred / d.total * 100).toFixed(1) : 0,
            }))

            const interestCounts = { high: 0, medium: 0, low: 0, none: 0 }
            for (const log of logs) {
                const lvl = log.interest_level?.toLowerCase()
                if (lvl && interestCounts[lvl] !== undefined) interestCounts[lvl]++
                else interestCounts.none++
            }

            const outcomeCounts = { answered: 0, no_answer: 0, failed: 0 }
            for (const log of logs) {
                if (['called', 'completed'].includes(log.call_status)) outcomeCounts.answered++
                else if (log.call_status === 'no_answer') outcomeCounts.no_answer++
                else outcomeCounts.failed++
            }

            return { dailyData, interestCounts, outcomeCounts, totalLogs: logs.length }
        },
        enabled: !!campaignId,
        staleTime: 2 * 60 * 1000,
    })
}

export function useCampaignPipelineMovement(campaignId) {
    return useQuery({
        queryKey: ['campaign-pipeline-movement', campaignId],
        queryFn: async () => {
            const res = await fetch(`/api/campaigns/${campaignId}/logs?limit=500`)
            if (!res.ok) throw new Error('Failed to fetch logs')
            const data = await res.json()
            const logs = data.logs || []
            return logs
                .filter(l => l.interest_level && l.lead)
                .map(l => ({
                    leadId: l.lead_id,
                    leadName: l.lead?.name,
                    leadScore: l.lead?.score,
                    interestLevel: l.interest_level,
                    sentimentScore: l.sentiment_score,
                    callDate: l.created_at,
                    callDuration: l.duration,
                }))
        },
        enabled: !!campaignId,
        staleTime: 60 * 1000,
    })
}
