import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    KanbanSquare,
    Users,
    Megaphone,
    LayoutDashboard,
    FolderKanban,
    BarChart3,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight,
    Phone,
    TrendingUp,
    Clock,
    CheckSquare,
    LogOut
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from 'react-hot-toast'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePermissions } from '@/contexts/PermissionContext'
import { createClient as createClientSupabaseClient } from '@/lib/supabase/client'

export default function CrmSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const { hasPermission, hasAnyPermission, loading } = usePermissions()

    const handleSignOut = async () => {
        try {
            const supabase = createClientSupabaseClient()
            await supabase.auth.signOut()
            router.push('/')
        } catch (error) {
            toast.error('Failed to sign out. Please try again.')
            console.error('Sign out error:', error)
        }
    }

    if (loading) return null

    // Grouped navigation structure with permissions
    const navigationSections = [
        {
            title: 'My Work',
            items: [
                { label: 'Dashboard', href: '/dashboard/admin/crm/dashboard', icon: LayoutDashboard, permission: null },
                { label: 'Tasks', href: '/dashboard/admin/crm/tasks', icon: CheckSquare, permission: ['view_own_leads', 'view_team_leads', 'view_all_leads'] },
            ]
        },
        {
            title: 'Sales',
            items: [
                { label: 'Leads', href: '/dashboard/admin/crm/leads', icon: Users, permission: ['view_own_leads', 'view_team_leads', 'view_all_leads'] },
                { label: 'Pipeline', href: '/dashboard/admin/crm?tab=pipeline', icon: KanbanSquare, permission: ['view_own_leads', 'view_team_leads', 'view_all_leads'] },
                { label: 'Projects', href: '/dashboard/admin/crm/projects', icon: FolderKanban, permission: 'view_projects' },
                { label: 'Campaigns', href: '/dashboard/admin/crm/campaigns', icon: Megaphone, permission: 'view_campaigns' },
            ]
        },
        {
            title: 'Calls',
            items: [
                { label: 'Live Calls', href: '/dashboard/admin/crm/calls/live', icon: Phone, permission: ['view_live_calls'] },
                { label: 'Call History', href: '/dashboard/admin/crm/calls/history', icon: Clock, permission: ['view_call_history'] },
                { label: 'Insights', href: '/dashboard/admin/crm/insights', icon: TrendingUp, permission: ['view_crm_insights'] },
            ]
        },
        {
            title: 'Reports',
            items: [
                { label: 'Analytics', href: '/dashboard/admin/crm/analytics', icon: BarChart3, permission: ['view_own_analytics', 'view_team_analytics', 'view_org_analytics'] },
            ]
        },
        {
            title: 'Admin',
            items: [
                { label: 'Audit Log', href: '/dashboard/admin/crm/auditlog', icon: FileText, permission: 'view_audit_logs' },
            ]
        }
    ]

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    "bg-white border-r border-border h-full hidden md:flex flex-col transition-all duration-300 relative",
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
                    <nav className="space-y-4 px-2">
                        {navigationSections.map((section, sectionIndex) => {
                            // Pre-compute which items this user can actually access
                            const visibleItems = section.items.filter(item => {
                                if (!item.permission) return true
                                if (Array.isArray(item.permission)) return hasAnyPermission(item.permission)
                                return hasPermission(item.permission)
                            })

                            // Skip the entire section if nothing is accessible
                            if (visibleItems.length === 0) return null

                            return (
                                <div key={section.title}>
                                    {/* Section Header */}
                                    {!isCollapsed && (
                                        <div className="px-4 mb-2 animate-in fade-in duration-300">
                                            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                                                {section.title}
                                            </h3>
                                        </div>
                                    )}
                                    {isCollapsed && sectionIndex > 0 && <div className="h-px bg-border my-2 mx-2" />}

                                    {/* Section Items — only visible items */}
                                    <div className="space-y-1">
                                        {visibleItems.map((item) => {
                                            const isActive =
                                                pathname === item.href ||
                                                (pathname.startsWith(item.href) && item.href !== '/dashboard/admin/crm' && !item.href.includes('?')) ||
                                                (item.label === 'Pipeline' && pathname === '/dashboard/admin/crm')
                                            const Icon = item.icon

                                            const LinkContent = (
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group relative overflow-hidden",
                                                        isActive
                                                            ? "bg-blue-50 text-blue-700 shadow-sm"
                                                            : "text-muted-foreground hover:bg-slate-50 hover:text-foreground",
                                                        isCollapsed && "justify-center px-2 py-3"
                                                    )}
                                                >
                                                    <Icon className={cn(
                                                        "w-5 h-5 transition-colors",
                                                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                                                    )} />
                                                    {!isCollapsed && (
                                                        <span className="animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap flex-1">
                                                            {item.label}
                                                        </span>
                                                    )}
                                                    {isActive && !isCollapsed && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                                                    )}
                                                </Link>
                                            )

                                            return (
                                                <div key={item.href}>
                                                    {isCollapsed ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div>{LinkContent}</div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="font-medium bg-slate-900 text-white border-slate-800">
                                                                {item.label}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        LinkContent
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </nav>
                </div>

                {/* Footer: Logout + Collapse */}
                <div className="border-t border-border mt-auto">
                    {/* Logout Button */}
                    {isCollapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleSignOut}
                                    className="w-full h-10 hover:bg-red-50 hover:text-red-600 text-muted-foreground rounded-none"
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-medium bg-slate-900 text-white border-slate-800">
                                Log Out
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 w-full px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors group"
                        >
                            <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-600 transition-colors" />
                            <span>Log Out</span>
                        </button>
                    )}

                    {/* Collapse Toggle */}
                    <div className="p-2 border-t border-border">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full h-8 hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                        >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </aside>
        </TooltipProvider >
    )
}
