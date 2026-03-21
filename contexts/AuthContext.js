'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { }
})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    
    // Crucial fix: store supabase client in state to prevent recreating it on every render,
    // which caused excessive rerenders and loop conditions.
    const [supabase] = useState(() => createClient())

    const fetchProfile = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (!error && data) setProfile(data)
            else console.error('fetchProfile error:', error)
        } catch (err) {
            console.error('Error in fetchProfile:', err)
        }
    }, [supabase])

    useEffect(() => {
        let mounted = true

        // Reliable method to check initial session, ensuring loading is ALWAYS resolved
        const initializeAuth = async () => {
            try {
                // Ensure auth resolves and user state is synchronized
                const { data: { session } } = await supabase.auth.getSession()
                
                if (session?.user) {
                    setUser(session.user)
                    await fetchProfile(session.user.id)
                } else {
                    setUser(null)
                    setProfile(null)
                }
            } catch (error) {
                console.error('[AuthContext] Error getting initial session:', error)
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        initializeAuth()

        // Subscribe to auth events, but handle them gracefully
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return
                console.log('[AuthContext] Auth event:', event, session ? 'has session' : 'no session')

                // For INITIAL_SESSION, initializeAuth already handles it.
                // We only care about subsequent events.
                if (event === 'INITIAL_SESSION') return

                if (session?.user) {
                    setUser(session.user)
                    
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        // Don't block loading on subsequent events, just fetch profile
                        await fetchProfile(session.user.id)
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setProfile(null)
                    router.push('/')
                }
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [supabase, fetchProfile, router])

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        router.push('/')
    }

    const refreshProfile = useCallback(async () => {
        if (user) await fetchProfile(user.id)
    }, [user, fetchProfile])

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
    return context
}
