'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({
    user: null,
    profile: null,
    loading: true,
    profileLoading: true,
    signOut: async () => { },
    refreshProfile: async () => { }
})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [profileLoading, setProfileLoading] = useState(true)
    const router = useRouter()
    const initialized = useRef(false)
    
    // Store supabase client in state to prevent recreating it on every render
    const [supabase] = useState(() => createClient())

    const fetchProfile = useCallback(async (userId) => {
        if (!userId) return null
        
        try {
            setProfileLoading(true)
            console.log(`[AuthContext] Fetching profile for ${userId}...`)
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('[AuthContext] fetchProfile error:', error)
                setProfile(null)
                return null
            }
            
            if (data) {
                console.log('[AuthContext] Profile fetched successfully')
                setProfile(data)
                return data
            }
        } catch (err) {
            console.error('[AuthContext] Error in fetchProfile:', err)
        } finally {
            setProfileLoading(false)
        }
        return null
    }, [supabase])

    useEffect(() => {
        if (initialized.current) return
        initialized.current = true

        let mounted = true

        const handleAuthChange = async (event, session) => {
            if (!mounted) return
            
            console.log(`[AuthContext] Auth event: ${event}`, session ? 'User present' : 'No session')
            
            const currentUser = session?.user || null
            setUser(currentUser)

            if (currentUser) {
                // Fetch profile but don't necessarily stay in loading state forever if it's slow
                // However, for the initial load, we want to know the profile
                await fetchProfile(currentUser.id)
            } else {
                setProfile(null)
                setProfileLoading(false)
            }

            // Always resolve initial loading once we've processed the first event or session check
            if (loading) {
                setLoading(false)
            }
        }

        // 1. Check initial session immediately
        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                await handleAuthChange('INITIAL_CHECK', session)
            } catch (err) {
                console.error('[AuthContext] Initial check failed:', err)
                if (mounted) setLoading(false)
            }
        }

        init()

        // 2. Listen for subsequent changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Skip INITIAL_SESSION as we handled it with getSession or it will be redundant
                if (event === 'INITIAL_SESSION') return
                await handleAuthChange(event, session)
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [supabase, fetchProfile, loading])

    const signOut = async () => {
        try {
            await supabase.auth.signOut()
            setUser(null)
            setProfile(null)
            router.push('/')
        } catch (err) {
            console.error('[AuthContext] Sign out error:', err)
            // Force local cleanup anyway
            setUser(null)
            setProfile(null)
            router.push('/')
        }
    }

    const refreshProfile = useCallback(async () => {
        if (user) await fetchProfile(user.id)
    }, [user, fetchProfile])

    return (
        <AuthContext.Provider value={{ 
            user, 
            profile, 
            loading, 
            profileLoading,
            signOut, 
            refreshProfile 
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
    return context
}

