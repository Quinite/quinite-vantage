'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function ReactQueryProvider({ children }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000, // 30 seconds fresh
                gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes unused
                retry: 1,
                refetchOnWindowFocus: true, // Auto-update when user clicks back to browser tab
                refetchOnMount: true,       // Auto-update when user navigates back to page
            },

            mutations: {
                retry: 0,
            }
        }
    }))

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* DevTools will be tree-shaken in production automatically by the package */}
            <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
        </QueryClientProvider>
    )
}
