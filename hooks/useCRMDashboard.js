import { useQuery } from '@tanstack/react-query'

/**
 * Hook to fetch CRM Dashboard statistics and data
 * Provides caching and automatic background updates
 */
export function useCRMDashboard(dateRange = 'this_month') {
    return useQuery({
        queryKey: ['crm-dashboard', dateRange],
        queryFn: async () => {
            const res = await fetch(`/api/crm/dashboard?range=${dateRange}`)
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to fetch dashboard data')
            }
            return res.json()
        },
        staleTime: 5 * 60 * 1000, // 5 minutes fresh
        gcTime: 30 * 60 * 1000,    // Keep in cache for 30 minutes
        retry: 2,
        refetchOnWindowFocus: false, // Don't refetch just because user tabbed away
    })
}
