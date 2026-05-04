'use client'

import { useEffect } from 'react'

/**
 * Custom hook to dynamically update the browser tab title.
 * @param {string} title - The title to set.
 * @param {boolean} preserveBase - Whether to preserve the Quinite Vantage suffix.
 */
export function useDynamicTitle(title, preserveBase = true) {
    useEffect(() => {
        if (!title) return

        const baseTitle = 'Quinite Vantage'
        const fullTitle = preserveBase ? `${title} | ${baseTitle}` : title
        
        const previousTitle = document.title
        document.title = fullTitle

        // Optional: restore title on unmount if it's a modal/temporary view
        return () => {
            // Only restore if we're not navigating away (which would set a new title anyway)
            // But for simple page-level usage, this is usually fine to omit or keep.
        }
    }, [title, preserveBase])
}
