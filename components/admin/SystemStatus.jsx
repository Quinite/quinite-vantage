'use client'

import React from 'react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from '@/components/ui/button'
import { Zap, CheckCircle2, Phone, Database, HardDrive, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from "@/lib/utils"
import { createClient } from '@/lib/supabase/client'

export function SystemStatus() {
    const [isMounted, setIsMounted] = React.useState(false)
    const [loading, setLoading] = React.useState(true)
    const [lastUpdated, setLastUpdated] = React.useState(new Date())
    const [statuses, setStatuses] = React.useState({
        api: 'checking',
        database: 'checking',
        storage: 'checking'
    })

    const checkSystems = React.useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const newStatuses = { ...statuses }

        try {
            // 1. Check API Server
            const apiPromise = fetch(`${process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL}/health`)
                .then(res => res.ok ? 'operational' : 'degraded')
                .catch(() => 'offline')

            // 2. Check Database
            const dbPromise = supabase.from('profiles').select('id', { count: 'exact', head: true })
                .then(({ error }) => error ? 'degraded' : 'operational')
                .catch(() => 'offline')

            // 3. Check Storage
            const storagePromise = supabase.storage.listBuckets()
                .then(({ error }) => error ? 'degraded' : 'operational')
                .catch(() => 'offline')

            const [api, db, storage] = await Promise.all([apiPromise, dbPromise, storagePromise])
            
            setStatuses({ api, database: db, storage })
            setLastUpdated(new Date())
        } catch (error) {
            console.error('System check failed:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        setIsMounted(true)
        checkSystems()
        // Auto-refresh every 5 minutes
        const timer = setInterval(checkSystems, 5 * 60 * 1000)
        return () => clearInterval(timer)
    }, [checkSystems])

    const systems = [
        { id: 'api', name: 'AI Calling', status: statuses.api, icon: Phone },
        { id: 'database', name: 'Database', status: statuses.database, icon: Database },
        { id: 'storage', name: 'Storage', status: statuses.storage, icon: HardDrive },
    ]

    const getStatusColor = (status) => {
        switch (status) {
            case 'operational': return 'bg-green-500'
            case 'degraded': return 'bg-amber-500'
            case 'offline': return 'bg-red-500'
            default: return 'bg-slate-300'
        }
    }

    const getStatusLabel = (status) => {
        switch (status) {
            case 'operational': return { text: 'Online', color: 'text-green-600', icon: CheckCircle2 }
            case 'degraded': return { text: 'Degraded', color: 'text-amber-600', icon: AlertCircle }
            case 'offline': return { text: 'Offline', color: 'text-red-600', icon: AlertCircle }
            default: return { text: 'Checking...', color: 'text-slate-400', icon: Loader2 }
        }
    }

    const allOperational = Object.values(statuses).every(s => s === 'operational')

    if (!isMounted) {
        return (
            <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 w-8 h-8 rounded relative">
                <Zap className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-white"></span>
            </Button>
        )
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 w-8 h-8 rounded relative">
                    <Zap className={cn("w-4 h-4", loading && "animate-pulse")} />
                    <span className={cn(
                        "absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border border-white transition-colors duration-500",
                        allOperational ? "bg-green-500" : Object.values(statuses).some(s => s === 'offline') ? "bg-red-500" : "bg-amber-500"
                    )}></span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 max-w-[calc(100vw-32px)] p-0 shadow-2xl border-slate-200" align="end" collisionPadding={16}>
                <div className="py-2 px-4 border-b bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h4 className="font-bold text-sm text-slate-900">System Status</h4>
                        <p className={cn(
                            "text-[10px] font-medium mt-0.5",
                            allOperational ? "text-green-600" : "text-amber-600"
                        )}>
                            {allOperational ? 'All systems operational' : 'Some systems experiencing issues'}
                        </p>
                    </div>
                    <button 
                        onClick={(e) => { e.preventDefault(); checkSystems(); }}
                        disabled={loading}
                        className="p-1 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", loading && "animate-spin")} />
                    </button>
                </div>
                <div className="p-1 bg-white">
                    {systems.map((sys) => {
                        const label = getStatusLabel(sys.status)
                        return (
                            <div key={sys.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        sys.status === 'operational' ? "bg-green-50 text-green-600" : 
                                        sys.status === 'offline' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                                    )}>
                                        <sys.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">{sys.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", label.color)}>
                                        {label.text}
                                    </span>
                                    <label.icon className={cn("w-3.5 h-3.5", label.color, sys.status === 'checking' && "animate-spin")} />
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="p-2.5 border-t bg-slate-50/50 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">
                        Last updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    )
}
