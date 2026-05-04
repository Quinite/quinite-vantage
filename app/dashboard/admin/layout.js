'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import AdminHeader from '@/components/admin/AdminHeader'
import { AlertTriangle } from 'lucide-react'
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext'
import GlobalAddLead from '@/components/crm/GlobalAddLead'

function AdminLayoutInner({ children }) {
    const { user, profile, loading: authLoading, profileLoading } = useAuth()
    const { isExpired: subscriptionExpired } = useSubscription()
    const router = useRouter()
    const pathname = usePathname()
    const [authorized, setAuthorized] = useState(false)
    const [redirecting, setRedirecting] = useState(false)

    useEffect(() => {
        // Only run check when BOTH auth and profile loading are finished
        if (!authLoading && !profileLoading) {
            checkAccess()
        }
    }, [authLoading, profileLoading, user, profile])

    // Safety timeout: If still not authorized after 10s and not loading, something is wrong
    useEffect(() => {
        if (!authLoading && !profileLoading && !authorized && !redirecting) {
            const timer = setTimeout(() => {
                console.warn('⚠️ [AdminLayout] Stuck in loading, forcing check...')
                checkAccess()
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [authLoading, profileLoading, authorized, redirecting])

    function checkAccess() {
        if (redirecting) return

        console.log('[AdminLayout] Checking access...', { 
            hasUser: !!user, 
            hasProfile: !!profile,
            role: profile?.role 
        })

        // 1. No user -> Redirect
        if (!user) {
            console.log('➡️ [Admin] No user, redirecting to login')
            setRedirecting(true)
            router.push('/')
            return
        }

        // 2. No profile -> Redirect
        if (!profile) {
            // If auth is done loading but no profile, something is wrong
            console.error('❌ [Admin] User logged in but no profile found')
            setRedirecting(true)
            router.push('/')
            return
        }

        // 3. Check Role
        const allowedRoles = ['employee', 'manager', 'super_admin']
        if (!allowedRoles.includes(profile.role)) {
            console.log(`⛔ [Admin] Access denied - role: ${profile.role}`)
            toast.error('Access denied')
            setRedirecting(true)
            router.push('/')
            return
        }

        console.log('✅ [Admin] Authorized')
        setAuthorized(true)
    }

    if (authLoading || profileLoading || !authorized || redirecting) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <LoadingSpinner className="w-8 h-8 text-primary" />
            </div>
        )
    }


    const isFullScreenModule = pathname?.startsWith('/dashboard/admin/crm') ||
        pathname?.startsWith('/dashboard/admin/inventory') ||
        pathname?.startsWith('/dashboard/admin/settings')

    const isOnBillingPage = pathname?.startsWith('/dashboard/admin/settings/subscription') || pathname?.startsWith('/dashboard/admin/billing')

    return (
        <div className="h-screen bg-secondary/20 flex flex-col overflow-hidden">
            {/* Global Shortcut Components */}
            <GlobalAddLead />

            {/* Header - Fixed at top */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm border-b border-border/40 shrink-0">
                <AdminHeader user={user} profile={profile} />
            </div>

            {/* Subscription expired banner */}
            {subscriptionExpired && !isOnBillingPage && (
                <div className="shrink-0 bg-red-600 text-white text-sm px-4 py-2.5 flex items-center justify-between gap-4 z-30">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Your subscription has expired. Calls, campaigns, and new data creation are paused.</span>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/admin/settings/subscription')}
                        className="shrink-0 bg-white text-red-600 text-xs font-semibold px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
                    >
                        Renew Now
                    </button>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 w-full bg-background/50 relative flex flex-col min-h-0 overflow-hidden">
                {isFullScreenModule ? (
                    /* CRM/Inventory: Delegate scroll to children (CrmLayout) */
                    <div className="flex-1 h-full w-full overflow-hidden">
                        {children}
                    </div>
                ) : (
                    /* Other pages: Global scroll */
                    <div className="flex-1 h-full w-full overflow-y-auto scroll-smooth p-4">
                        {children}
                    </div>
                )}
            </main>
        </div>
    )
}

export default function AdminLayout({ children }) {
    return (
        <SubscriptionProvider>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </SubscriptionProvider>
    )
}
