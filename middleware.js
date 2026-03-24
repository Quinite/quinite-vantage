import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Next.js Middleware for Security and Request Handling
 * 
 * This middleware runs on every request and adds:
 * - Security headers
 * - Request logging
 * - Basic rate limiting (in-memory)
 * - Supabase authentication error handling
 */

// Simple in-memory rate limiter
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100 // 100 requests per minute per IP

function rateLimit(ip) {
    const now = Date.now()
    const userRequests = rateLimitMap.get(ip) || []

    // Remove old requests outside the window
    const recentRequests = userRequests.filter(
        timestamp => now - timestamp < RATE_LIMIT_WINDOW
    )

    if (recentRequests.length >= MAX_REQUESTS) {
        return false // Rate limit exceeded
    }

    recentRequests.push(now)
    rateLimitMap.set(ip, recentRequests)

    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
        const cutoff = now - RATE_LIMIT_WINDOW
        for (const [key, timestamps] of rateLimitMap.entries()) {
            const filtered = timestamps.filter(t => t > cutoff)
            if (filtered.length === 0) {
                rateLimitMap.delete(key)
            } else {
                rateLimitMap.set(key, filtered)
            }
        }
    }

    return true
}

export async function middleware(request) {
    const { pathname } = request.nextUrl

    // Get client IP
    const ip = request.ip ||
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown'

    // Apply rate limiting to API routes
    if (pathname.startsWith('/api/')) {
        if (!rateLimit(ip)) {
            return new NextResponse(
                JSON.stringify({
                    error: {
                        message: 'Too many requests. Please try again later.',
                        code: 'RATE_LIMIT_ERROR',
                        statusCode: 429
                    }
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': '60'
                    }
                }
            )
        }
    }

    // Create response
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Handle Supabase authentication for protected routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
        try {
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    cookies: {
                        getAll() {
                            return request.cookies.getAll()
                        },
                        setAll(cookiesToSet) {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                request.cookies.set(name, value)
                                response.cookies.set(name, value, options)
                            })
                        },
                    },
                }
            )

            // Attempt to get user - this will throw if token is invalid
            const { data: { user }, error } = await supabase.auth.getUser()

            if (user) {
                // EXTREME PERFORMANCE GAIN: Pass user ID to downstream API routes
                // to avoid re-verifying session in every single route handler.
                request.headers.set('x-user-id', user.id)
                request.headers.set('x-user-email', user.email || '')
                
                // Set these on the NEXT request headers so our app can see them
                response = NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                })
            }


            // If there's an auth error (invalid/expired token), clear cookies and redirect
            if (error || !user) {
                // Only redirect dashboard routes, not API routes
                if (pathname.startsWith('/dashboard')) {
                    const redirectUrl = new URL('/', request.url)
                    redirectUrl.searchParams.set('redirectedFrom', pathname)

                    response = NextResponse.redirect(redirectUrl)

                    // Clear all Supabase auth cookies by identifying them dynamically
                    request.cookies.getAll().forEach(cookie => {
                        if (cookie.name.startsWith('sb-')) {
                            response.cookies.delete(cookie.name)
                        }
                    })


                    return response
                }
            }
        } catch (error) {
            // Log auth errors in development
            if (process.env.NODE_ENV === 'development') {
                console.error('[Auth Error]', error.message)
            }

            // Redirect to signin for dashboard routes
            if (pathname.startsWith('/dashboard')) {
                const redirectUrl = new URL('/', request.url)
                response = NextResponse.redirect(redirectUrl)
                return response
            }
        }
    }

    // Add security headers
    response.headers.set('X-DNS-Prefetch-Control', 'on')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    // Add HSTS in production
    if (process.env.NODE_ENV === 'production') {
        response.headers.set(
            'Strict-Transport-Security',
            'max-age=63072000; includeSubDomains; preload'
        )
    }

    // Add CSP header (adjust as needed for your app)
    const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://dlbxhbukzyygbabrujuv.supabase.co https://checkout.razorpay.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://dlbxhbukzyygbabrujuv.supabase.co https://images.unsplash.com https://placehold.co;
    font-src 'self' data:;
    frame-src 'self' https://api.razorpay.com;
    connect-src 'self' https://dlbxhbukzyygbabrujuv.supabase.co wss://dlbxhbukzyygbabrujuv.supabase.co https://api.postalpincode.in https://api.razorpay.com https://lumberjack.razorpay.com;
    frame-ancestors 'self';
  `.replace(/\s{2,}/g, ' ').trim()

    response.headers.set('Content-Security-Policy', cspHeader)

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] ${request.method} ${pathname} - ${ip}`)
    }

    return response
}

// Configure which routes the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - auth (authentication pages: /auth/signin, /auth/signup, etc.)
         * - api/auth (authentication API routes)
         */
        '/((?!_next/static|_next/image|favicon.ico|auth|api/auth|$).*)',
    ],
}
