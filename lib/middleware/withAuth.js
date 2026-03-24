import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/utils/user'

/**
 * Authentication middleware for API routes
 * Validates user authentication and attaches user + profile to request
 * 
 * @param {Function} handler - The API route handler
 * @returns {Function} Wrapped handler with auth
 * 
 * @example
 * export const GET = withAuth(async (request, context) => {
 *   const { user, profile } = context
 *   // user and profile are guaranteed to exist
 *   return NextResponse.json({ data: 'protected' })
 * })
 */
export function withAuth(handler) {
    return async (request, context = {}) => {
        try {
            const supabase = await createServerSupabaseClient()
            let user = null
            
            // Check if middleware already verified the user (Performance optimization)
            const headerUserId = request.headers.get('x-user-id')
            const headerUserEmail = request.headers.get('x-user-email')

            if (headerUserId) {
                // If ID is in header, we trust the middleware verified it.
                // Reconstructing a minimal user object saves a network call to Supabase.
                user = { id: headerUserId, email: headerUserEmail }
            } else {
                // Fallback for routes not specifically handled by middleware
                const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()
                if (authError || !supabaseUser) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
                }
                user = supabaseUser
            }

            // Fetch user profile (optimized by internal cache in getUserProfile)
            const profile = await getUserProfile(user.id)

            if (!profile) {
                return NextResponse.json(
                    { error: 'Profile not found', message: 'User exists but profile is missing in database' },
                    { status: 404 }
                )
            }

            // Attach user and profile to context
            const enhancedContext = {
                ...context,
                user,
                profile,
                supabase
            }


            // Call the actual handler
            return await handler(request, enhancedContext)
        } catch (error) {
            console.error('withAuth error:', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    }
}

/**
 * Authentication middleware with organization check
 * Ensures user belongs to an organization (not platform admin)
 */
export function withOrgAuth(handler) {
    return withAuth(async (request, context) => {
        const { profile } = context

        if (!profile.organization_id) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 400 }
            )
        }

        return handler(request, context)
    })
}

/**
 * Authentication middleware with permission check
 * 
 * @param {string|string[]} permissions - Required permission(s)
 * @param {Function} handler - The API route handler
 * 
 * @example
 * export const POST = withPermission('create_leads', async (request, context) => {
 *   // User is guaranteed to have 'create_leads' permission
 * })
 */
export function withPermission(permissions, handler) {
    return withAuth(async (request, context) => {
        const { hasDashboardPermission } = await import('@/lib/dashboardPermissions')
        const { user } = context

        const permsArray = Array.isArray(permissions) ? permissions : [permissions]

        // Check if user has at least one of the required permissions
        const hasPermission = await Promise.all(
            permsArray.map(perm => hasDashboardPermission(user.id, perm))
        ).then(results => results.some(result => result))

        if (!hasPermission) {
            return NextResponse.json(
                {
                    error: 'Forbidden',
                    message: `You don't have permission to perform this action. Required: ${permsArray.join(' or ')}`
                },
                { status: 403 }
            )
        }

        return handler(request, context)
    })
}
