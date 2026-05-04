'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Shield,
  Building2,
  FileText,
  Users2,
  LogOut,
  Menu,
  X,
  AlertCircle,
  CreditCard,
  Megaphone
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import PlatformSidebar from '@/components/platform/PlatformSidebar'

export default function PlatformLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [impersonating, setImpersonating] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/admin-login')
        return
      }

      // Get user data
      const response = await fetch('/api/auth/user')
      const data = await response.json()

      if (!data.user) {
        router.push('/admin-login')
        return
      }

      // CRITICAL: Verify Platform Admin access
      if (data.user.profile?.role !== 'platform_admin') {
        router.push('/dashboard') // Redirect org users to their dashboard
        return
      }

      setUser(data.user)
      setProfile(data.user.profile)
      setLoading(false)

      // Check for active impersonation
      checkImpersonation()
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/admin-login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkImpersonation = async () => {
    try {
      const response = await fetch('/api/platform/impersonations')
      const data = await response.json()
      const active = data.sessions?.find(s => s.is_active)
      setImpersonating(active || null)
    } catch (error) {
      console.error('Error checking impersonation:', error)
    }
  }

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    await supabase.auth.signOut()
    router.push('/admin-login')
  }



  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <PlatformSidebar 
          user={user} 
          handleSignOut={handleSignOut} 
          setSidebarOpen={setSidebarOpen} 
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Impersonation Banner */}
        {impersonating && (
          <Alert className="rounded-none border-l-0 border-r-0 border-t-0 bg-orange-50 border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Impersonating:</strong> Organization User
              <Button
                size="sm"
                variant="outline"
                className="ml-4"
                onClick={async () => {
                  await fetch('/api/platform/end-impersonation', { method: 'POST' })
                  setImpersonating(null)
                  checkImpersonation()
                }}
              >
                End Impersonation
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">Platform Admin</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}