'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Shield,
    Building2,
    FileText,
    Users2,
    CreditCard,
    Megaphone,
    LayoutDashboard,
    Lock,
    Bell,
    Settings,
    LogOut,
    Menu,
    X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export default function PlatformSidebar({ user, handleSignOut, setSidebarOpen }) {
    const pathname = usePathname()

    const sections = [
        {
            title: 'Overview',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/platform/dashboard', exact: true },
            ]
        },
        {
            title: 'Management',
            items: [
                { icon: Building2, label: 'Organizations', href: '/dashboard/platform/organizations' },
                { icon: CreditCard, label: 'Subscriptions', href: '/dashboard/platform/subscriptions' },
                { icon: Megaphone, label: 'Broadcasts', href: '/dashboard/platform/notifications' },
            ]
        },
        {
            title: 'Security & Logs',
            items: [
                { icon: Lock, label: 'Permissions', href: '/dashboard/platform/permissions' },
                { icon: FileText, label: 'Audit Logs', href: '/dashboard/platform/audit' },
            ]
        },
        {
            title: 'Account',
            items: [
                { icon: Users2, label: 'Profile', href: '/dashboard/platform/profile' },
            ]
        }
    ]

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-200">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-900 tracking-tight">Platform</h1>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-600">Control Plane</p>
                        </div>
                    </div>
                    {setSidebarOpen && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-slate-500 hover:bg-slate-100"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-4 py-6">
                <div className="space-y-8">
                    {sections.map((section, idx) => (
                        <div key={idx} className="space-y-2">
                            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-3">
                                {section.title}
                            </h2>
                            <nav className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon
                                    const isActive = item.exact 
                                        ? pathname === item.href 
                                        : pathname.startsWith(item.href)
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setSidebarOpen && setSidebarOpen(false)}
                                            className={`
                                                flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300
                                                ${isActive
                                                    ? 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 shadow-sm border border-purple-100/50'
                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1 group'}
                                            `}
                                        >
                                            <div className={`
                                                p-1.5 rounded-lg transition-colors
                                                ${isActive ? 'bg-white shadow-sm text-purple-600' : 'text-slate-400 group-hover:text-slate-600'}
                                            `}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="flex-1">{item.label}</span>
                                            {item.label === 'Broadcasts' && (
                                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-md border border-amber-200 animate-pulse">
                                                    NEW
                                                </span>
                                            )}

                                        </Link>
                                    )
                                })}
                            </nav>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* User info & logout */}
            <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 p-2 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border border-white shadow-sm flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                        {user?.email?.substring(0, 2) || 'PA'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">Platform Admin</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                </div>
                
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-slate-200 bg-white text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-300 shadow-sm rounded-xl py-5"
                    onClick={handleSignOut}
                >
                    <LogOut className="w-4 h-4" />
                    <span className="font-semibold">Sign Out</span>
                </Button>
            </div>
        </div>
    )
}
