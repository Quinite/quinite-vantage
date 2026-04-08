'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { createClient as createClientSupabaseClient } from '@/lib/supabase/client'
import {
    Building2,
    LogOut,
    LayoutDashboard,
    KanbanSquare,
    Building,
    Settings,
    User,
    BarChart3,
    FileText,
    Users,
    Menu,
    FolderKanban, // [NEW]
    Megaphone,
    Search,
    Zap,
    HelpCircle,
    Phone,
    Clock,
    TrendingUp,
    CheckSquare
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet" // [NEW]
import { Button } from '@/components/ui/button'
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GlobalSearch } from './GlobalSearch'
import { NotificationBell } from './NotificationBell'
import { SystemStatus } from './SystemStatus'
import { HelpMenu } from './HelpMenu'

import { usePermissions } from '@/contexts/PermissionContext' // [NEW]
import { useQueryClient } from '@tanstack/react-query'


export default function AdminHeader({ user, profile }) {
    const router = useRouter()
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)
    const [isMounted, setIsMounted] = React.useState(false)

    // [NEW] Get permissions
    const { hasPermission, hasAnyPermission, loading: permissionsLoading } = usePermissions()

    // [NEW] Query Client for prefetching
    const queryClient = useQueryClient()

    
    // Efficiently prefetch dashboard stats on hover
    const prefetchDashboard = () => {
        if (!queryClient) return
        queryClient.prefetchQuery({
            queryKey: ['crm-dashboard', 'this_month'],
            queryFn: () => fetch('/api/crm/dashboard?range=this_month').then(res => res.json()),
            staleTime: 5 * 60 * 1000
        })
    }



    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleSignOut = async () => {
        const supabase = createClientSupabaseClient()
        await supabase.auth.signOut()
        router.push('/')
    }

    // [NEW] Define permissions for main nav items (optional, but good for future)
    const navItems = [
        { label: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard }, // Public to dashboard users
        { label: 'CRM', href: '/dashboard/admin/crm/dashboard', icon: KanbanSquare }, // Could gate, but sub-items are gated
        { label: 'Inventory', href: '/dashboard/admin/inventory', icon: Building, permission: 'view_inventory' },
    ]

    // [NEW] Define permissions for CRM nav items
    const crmNavItems = [
        { label: 'Dashboard', href: '/dashboard/admin/crm/dashboard', icon: LayoutDashboard },
        { label: 'Tasks', href: '/dashboard/admin/crm/tasks', icon: CheckSquare, permission: ['view_own_leads', 'view_team_leads', 'view_all_leads'] },
        { label: 'Projects', href: '/dashboard/admin/crm/projects', icon: FolderKanban, permission: 'view_projects' },
        { label: 'Campaigns', href: '/dashboard/admin/crm/campaigns', icon: Megaphone, permission: 'view_campaigns' },
        { label: 'Leads', href: '/dashboard/admin/crm/leads', icon: Users, permission: ['view_own_leads', 'view_team_leads', 'view_all_leads'] },
        { label: 'Pipeline', href: '/dashboard/admin/crm?tab=pipeline', icon: KanbanSquare, permission: ['view_own_leads', 'view_team_leads', 'view_all_leads'] },
        { label: 'Live Calls', href: '/dashboard/admin/crm/calls/live', icon: Phone, permission: 'view_live_calls' },
        { label: 'Call History', href: '/dashboard/admin/crm/calls/history', icon: Clock, permission: 'view_call_history' },
        { label: 'Insights', href: '/dashboard/admin/crm/insights', icon: TrendingUp, permission: 'view_crm_insights' },
        { label: 'Analytics', href: '/dashboard/admin/crm/analytics', icon: BarChart3, permission: ['view_own_analytics', 'view_team_analytics', 'view_org_analytics'] },
        { label: 'Audit Log', href: '/dashboard/admin/crm/auditlog', icon: FileText, permission: 'view_audit_logs' },
        { label: 'Settings', href: '/dashboard/admin/crm/settings', icon: Settings, permission: 'view_settings' },
    ]

    // [NEW] Define permissions for Inventory nav items
    const inventoryNavItems = [
        { label: 'Overview', href: '/dashboard/admin/inventory', icon: LayoutDashboard, permission: 'view_inventory' },
        { label: 'Units', href: '/dashboard/admin/inventory/units', icon: Building, permission: 'view_inventory' },
        { label: 'Analytics', href: '/dashboard/admin/inventory/analytics', icon: BarChart3, permission: 'view_inventory' },
    ]

    // Helper to filter items
    const filterItems = (items) => {
        if (permissionsLoading) return [] // Hide during load or logic choice
        return items.filter(item => {
            if (!item.permission) return true
            if (Array.isArray(item.permission)) {
                return hasAnyPermission(item.permission)
            }
            return hasPermission(item.permission)
        })
    }

    const filteredNavItems = filterItems(navItems)
    const filteredCrmItems = filterItems(crmNavItems)
    const filteredInventoryItems = filterItems(inventoryNavItems)

    const isCrmModule = pathname?.startsWith('/dashboard/admin/crm')
    const isInventoryModule = pathname?.startsWith('/dashboard/admin/inventory')

    return (
        <header className="sticky top-0 z-30 w-full  border-border bg-white">
            <div className="w-full px-4 sm:px-6">
                <div className="flex justify-between h-14 items-center">
                    {/* Left Section: Logo & Nav */}
                    <div className="flex items-center gap-2 md:gap-6 h-full">
                        {/* Mobile Menu */}
                        <div className="md:hidden">
                            {isMounted ? (
                                <Sheet open={open} onOpenChange={setOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Menu className="h-6 w-6" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-[80%] sm:w-[300px] p-0 overflow-y-auto">
                                        <SheetHeader className="p-6 border-b border-border text-left">
                                            <SheetTitle className="flex items-center gap-2">
                                                <div className="relative w-32 h-12">
                                                    <Image
                                                        src="/assets/logo.svg"
                                                        alt="Quinite Vantage"
                                                        fill
                                                        className="object-contain object-left"
                                                    />
                                                </div>
                                            </SheetTitle>
                                        </SheetHeader>
                                        <div className="p-4 flex flex-col gap-1">
                                            {filteredNavItems.map((item) => {
                                                // Determine if this nav item is active based on the current path
                                                let isActive = false

                                                if (item.label === 'Overview') {
                                                    // Overview is active only on exact match
                                                    isActive = pathname === '/dashboard/admin'
                                                } else if (item.label === 'CRM') {
                                                    // CRM is active for any path starting with /dashboard/admin/crm
                                                    isActive = pathname?.startsWith('/dashboard/admin/crm')
                                                } else if (item.label === 'Inventory') {
                                                    // Inventory is active for any path starting with /dashboard/admin/inventory
                                                    isActive = pathname?.startsWith('/dashboard/admin/inventory')
                                                } else if (item.label === 'Analytics') {
                                                    // Analytics is active for exact match (not CRM or Inventory analytics)
                                                    isActive = pathname === '/dashboard/admin/analytics'
                                                }

                                                const Icon = item.icon
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setOpen(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                                            isActive
                                                                ? "bg-blue-50 text-blue-700"
                                                                : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                                                        )}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        {item.label}
                                                    </Link>
                                                )
                                            })}
                                            {/* CRM Module Sub-Navigation */}
                                            {isCrmModule && (
                                                <>
                                                    <div className="my-2 border-t border-border" />
                                                    <div className="px-3 py-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                                                        CRM Module
                                                    </div>
                                                    {filteredCrmItems.map((item) => {
                                                        const isActive = pathname === item.href || (item.label === 'Pipeline' && pathname === '/dashboard/admin/crm')
                                                        const Icon = item.icon
                                                        return (
                                                            <Link
                                                                key={item.href}
                                                                href={item.href}
                                                                onClick={() => setOpen(false)}
                                                                className={cn(
                                                                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                                                    isActive
                                                                        ? "bg-blue-50 text-blue-700"
                                                                        : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                                                                )}
                                                            >
                                                                <Icon className="w-4 h-4" />
                                                                {item.label}
                                                            </Link>
                                                        )
                                                    })}
                                                </>
                                            )}

                                            {/* Inventory Module Sub-Navigation */}
                                            {isInventoryModule && (
                                                <>
                                                    <div className="my-2 border-t border-border" />
                                                    <div className="px-3 py-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                                                        Inventory Module
                                                    </div>
                                                    {filteredInventoryItems.map((item) => {
                                                        const isActive = pathname === item.href
                                                        const Icon = item.icon
                                                        return (
                                                            <Link
                                                                key={item.href}
                                                                href={item.href}
                                                                onClick={() => setOpen(false)}
                                                                className={cn(
                                                                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                                                    isActive
                                                                        ? "bg-blue-50 text-blue-700"
                                                                        : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                                                                )}
                                                            >
                                                                <Icon className="w-4 h-4" />
                                                                {item.label}
                                                            </Link>
                                                        )
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            ) : (
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            )}
                        </div>

                        {/* Logo - Mobile & Desktop */}
                        <div className="flex-shrink-0 flex items-center gap-4 h-full">
                            {/* Desktop: Full Logo */}
                            <div className="relative w-32 h-8 hidden md:block">
                                <Image
                                    src="/assets/logo.svg"
                                    alt="Quinite Vantage"
                                    fill
                                    className="object-contain object-left"
                                    priority
                                />
                            </div>

                            {/* Mobile: Logo Icon Only */}
                            <div className="relative w-28 h-10 md:hidden">
                                <Image
                                    src="/assets/logo.svg"
                                    alt="Quinite Vantage"
                                    fill
                                    className="object-contain object-left"
                                    priority
                                />
                            </div>

                            {/* Vertical Separator */}
                            <div className="hidden md:block h-6 w-px bg-slate-200"></div>

                            {/* Desktop Nav */}
                            <nav className="hidden md:flex items-end h-full">
                                {filteredNavItems.map((item) => {
                                    // Determine if this nav item is active based on the current path
                                    let isActive = false

                                    if (item.label === 'Overview') {
                                        // Overview is active only on exact match
                                        isActive = pathname === '/dashboard/admin'
                                    } else if (item.label === 'CRM') {
                                        // CRM is active for any path starting with /dashboard/admin/crm
                                        isActive = pathname?.startsWith('/dashboard/admin/crm')
                                    } else if (item.label === 'Inventory') {
                                        // Inventory is active for any path starting with /dashboard/admin/inventory
                                        isActive = pathname?.startsWith('/dashboard/admin/inventory')
                                    } else if (item.label === 'Analytics') {
                                        // Analytics is active for exact match (not CRM or Inventory analytics)
                                        isActive = pathname === '/dashboard/admin/analytics'
                                    }

                                    const Icon = item.icon

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onMouseEnter={() => {
                                                if (item.label === 'CRM') prefetchDashboard()
                                            }}
                                            className={cn(
                                                "relative flex items-center gap-2 px-5 text-sm font-medium transition-all duration-300 rounded-t-lg", // Thinner font, smoother roundness
                                                /* Height calculation: Full height minus top margin. Natural feel = floating slightly off top */
                                                "h-[calc(100%-12px)] mb-0",
                                                isActive
                                                    ? "text-blue-600 bg-[#f5f8fb]" // Clean, no shadow, no border. Just color.
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50 h-[calc(100%-18px)] mb-1.5 rounded-md"
                                            )}
                                        >

                                            {/* Top Gradient Border */}
                                            {isActive && (
                                                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg" />
                                            )}

                                            <Icon className={cn(
                                                "w-4 h-4 mb-0.5",
                                                isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                                            )} />
                                            {item.label}
                                        </Link>
                                    )
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Right Section: Search & Actions */}
                    <div className="flex items-center gap-3">
                        {/* Global Search */}
                        <div className="hidden lg:block">
                            <GlobalSearch />
                        </div>

                        <div className="flex items-center gap-1">
                            {/* System Status */}
                            <SystemStatus />

                            {/* Notifications */}
                            <NotificationBell />

                            {/* Help */}
                            <HelpMenu />

                            {/* Settings — direct icon, no popover */}
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => router.push('/dashboard/admin/settings')}
                                            className={cn(
                                                "h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors",
                                                pathname?.startsWith('/dashboard/admin/settings') && "bg-slate-100 text-slate-900"
                                            )}
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="font-medium bg-slate-900 text-white border-slate-800">
                                        Settings
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {/* Vertical separator */}
                        <div className="h-5 w-px bg-slate-200" />

                        {/* User Profile */}
                        {isMounted ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="relative flex items-center gap-2 h-8 px-1.5 rounded-lg hover:bg-slate-100 focus:ring-0 transition-colors"
                                        suppressHydrationWarning
                                    >
                                        <Avatar className="h-7 w-7 border border-slate-200 shrink-0">
                                            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                                                {profile?.full_name?.[0] || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[100px] truncate">
                                            {profile?.full_name?.split(' ')[0] || 'Account'}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-60" align="end" forceMount>
                                    {/* Profile header */}
                                    <div className="flex items-center gap-3 px-3 py-3">
                                        <Avatar className="h-9 w-9 border border-slate-200 shrink-0">
                                            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                                            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
                                                {profile?.full_name?.[0] || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                            {profile?.role && (
                                                <span className="mt-1 inline-flex w-fit items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 capitalize">
                                                    {profile.role.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push('/dashboard/admin/profile')} className="gap-2 py-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span>My Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleSignOut}
                                        className="gap-2 py-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center gap-2 h-8 px-1.5">
                                <Avatar className="h-7 w-7 border border-slate-200">
                                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                                        {profile?.full_name?.[0] || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
