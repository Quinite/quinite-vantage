'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Trash2, ExternalLink, X, Info, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

export function NotificationBell() {
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [open, setOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications')
            if (res.ok) {
                const data = await res.json()
                const list = data.notifications || []
                setNotifications(list)
                setUnreadCount(list.filter(n => !n.is_read).length)
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error)
        }
    }

    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 60000)
        return () => clearInterval(interval)
    }, [])

    const handleMarkRead = async (id, link) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ))
            setUnreadCount(prev => Math.max(0, prev - 1))

            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })

            if (link) {
                setOpen(false)
                router.push(link)
            }
        } catch (error) {
            console.error('Failed to mark read', error)
        }
    }

    const handleMarkAllRead = async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)

            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mark_all_read: true })
            })
            toast.success('All marked as read')
        } catch (error) {
            console.error('Failed to mark all read', error)
        }
    }

    const handleDelete = async (e, id) => {
        e.stopPropagation() // Prevent triggering the read action
        try {
            setNotifications(prev => prev.filter(n => n.id !== id))
            const wasUnread = notifications.find(n => n.id === id)?.is_read === false
            if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1))

            await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
            toast.success('Notification cleared')
        } catch (error) {
            console.error('Failed to delete', error)
        }
    }

    const handleClearAll = async () => {
        try {
            setNotifications([])
            setUnreadCount(0)
            await fetch(`/api/notifications?all=true`, { method: 'DELETE' })
            toast.success('All notifications cleared')
        } catch (error) {
            console.error('Failed to clear all', error)
        }
    }

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-green-600" />
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
            case 'error': return <AlertOctagon className="h-4 w-4 text-red-600" />
            default: return <Info className="h-4 w-4 text-blue-600" />
        }
    }

    const getBgColor = (type) => {
        switch (type) {
            case 'success': return 'bg-green-50'
            case 'warning': return 'bg-yellow-50'
            case 'error': return 'bg-red-50'
            default: return 'bg-blue-50'
        }
    }

    if (!isMounted) {
        return (
            <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded w-8 h-8">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
                )}
            </Button>
        )
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded w-8 h-8" suppressHydrationWarning>
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 max-w-[calc(100vw-32px)] p-0 shadow-xl border-slate-100" align="end" collisionPadding={16}>
                <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                    <div>
                        <h4 className="font-semibold text-sm text-slate-800">Notifications</h4>
                        <p className="text-[10px] text-muted-foreground">{unreadCount} unread</p>
                    </div>
                    <div className="flex gap-1">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="xs"
                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="xs"
                                className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={handleClearAll}
                                title="Clear all"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-in fade-in-50">
                            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                <Bell className="h-6 w-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">All caught up!</p>
                            <p className="text-xs text-slate-400">No new notifications for you.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "group relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 cursor-pointer",
                                        !notification.is_read ? 'bg-blue-50/40' : 'bg-white'
                                    )}
                                    onClick={() => handleMarkRead(notification.id, notification.link)}
                                >
                                    <div className={cn("mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0", getBgColor(notification.type))}>
                                        {getIcon(notification.type)}
                                    </div>

                                    <div className="flex-1 space-y-1 pr-6">
                                        <div className="flex justify-between items-start">
                                            <p className={cn("text-sm leading-none", !notification.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>
                                                {notification.title}
                                            </p>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium pt-1">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                        </p>
                                    </div>

                                    {/* Delete Button (Visible on Hover) */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                        onClick={(e) => handleDelete(e, notification.id)}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>

                                    {!notification.is_read && (
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-50/40 group-hover:opacity-0 transition-opacity" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
