'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building, LayoutDashboard, BarChart3, ChevronLeft, ChevronRight, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePermissions } from '@/contexts/PermissionContext'

export default function InventorySidebar() {
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const { hasPermission, loading } = usePermissions()

    if (loading) return null

    const navigationSections = [
        {
            title: 'Inventory',
            items: [
                { label: 'Overview', href: '/dashboard/admin/inventory', icon: LayoutDashboard, permission: 'view_inventory', exactMatch: true },
                { label: 'Projects', href: '/dashboard/admin/inventory/projects', icon: FolderKanban, permission: 'view_inventory' },
                { label: 'Units', href: '/dashboard/admin/inventory/units', icon: Building, permission: 'view_inventory' },
            ]
        },
        {
            title: 'Reports',
            items: [
                { label: 'Analytics', href: '/dashboard/admin/inventory/analytics', icon: BarChart3, permission: 'view_inventory_analytics' },
            ]
        }
    ]

    const visibleSections = navigationSections.map(section => ({
        ...section,
        items: section.items.filter(item => {
            if (!item.permission) return true
            return hasPermission(item.permission)
        })
    })).filter(section => section.items.length > 0)

    if (visibleSections.length === 0) return null

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
                        {visibleSections.map((section, sectionIndex) => (
                            <div key={section.title}>
                                {!isCollapsed && (
                                    <div className="px-4 mb-2 animate-in fade-in duration-300">
                                        <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                                            {section.title}
                                        </h3>
                                    </div>
                                )}
                                {isCollapsed && sectionIndex > 0 && <div className="h-px bg-border my-2 mx-2" />}

                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = item.exactMatch
                                            ? pathname === item.href
                                            : pathname === item.href || pathname.startsWith(item.href + '/')
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
                        ))}
                    </nav>
                </div>

                {/* Footer: Collapse toggle */}
                <div className="border-t border-border p-2 mt-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full h-8 hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </Button>
                </div>
            </aside>
        </TooltipProvider>
    )
}
