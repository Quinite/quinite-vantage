'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
    Search,
    Building,
    Megaphone,
    Users,
    X,
    Loader2
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getDefaultAvatar } from '@/lib/avatar-utils'

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState('')
    const [results, setResults] = React.useState({ leads: [], projects: [], campaigns: [] })
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()
    const inputRef = React.useRef(null)
    const commandRef = React.useRef(null)

    React.useEffect(() => {
        const down = (e) => {
            if (e.key === '/' && (e.metaKey || e.ctrlKey || !['INPUT', 'TEXTAREA'].includes(e.target.tagName))) {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }

        const handleClickOutside = (e) => {
            if (commandRef.current && !commandRef.current.contains(e.target)) {
                setOpen(false)
            }
        }

        document.addEventListener('keydown', down)
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('keydown', down)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    React.useEffect(() => {
        if (!query) {
            setOpen(false)
            setResults({ leads: [], projects: [], campaigns: [] })
            return
        }

        setOpen(true)
        const timer = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
                const data = await res.json()
                if (data.results) {
                    setResults(data.results)
                }
            } catch (error) {
                console.error('Search failed:', error)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    const runCommand = React.useCallback((command) => {
        setOpen(false)
        setQuery('')
        command()
    }, [])

    return (
        <div ref={commandRef} className="relative w-full max-w-sm lg:w-96 z-50">
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (query) setOpen(true)
                    }}
                    placeholder="Search leads, projects, campaigns & more... (/)"
                    className="w-full h-9 pl-9 pr-8 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder:text-muted-foreground/80 text-ellipsis"
                />
                {query ? (
                    <button
                        onClick={() => {
                            setQuery('')
                            setOpen(false)
                            inputRef.current?.focus()
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                        <span className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400 font-medium select-none">/</span>
                    </div>
                )}
            </div>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-md border bg-white shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                    <Command className="border-none">
                        <CommandList className="max-h-[300px] overflow-y-auto p-1">
                            {loading && (
                                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Searching...
                                </div>
                            )}

                            {!loading && results.leads?.length === 0 && results.projects?.length === 0 && results.campaigns?.length === 0 && (
                                <CommandEmpty>No results found.</CommandEmpty>
                            )}

                            {!loading && results.leads?.length > 0 && (
                                <CommandGroup heading="Leads">
                                    {results.leads.map((lead) => (
                                        <CommandItem
                                            key={lead.id}
                                            onSelect={() => runCommand(() => router.push(`/dashboard/admin/crm/leads/${lead.id}`))}
                                            className="flex items-center gap-2"
                                        >
                                            <Avatar className="h-6 w-6 border border-slate-100">
                                                <AvatarImage src={lead.avatar_url || getDefaultAvatar(lead.email || lead.name)} />
                                                <AvatarFallback className="text-[10px] font-bold">
                                                    {lead.name?.charAt(0) || 'L'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="truncate">{lead.name}</span>
                                                {lead.email && <span className="text-[10px] text-muted-foreground truncate opacity-70">({lead.email})</span>}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {!loading && results.projects?.length > 0 && (
                                <>
                                    <CommandSeparator />
                                    <CommandGroup heading="Projects">
                                        {results.projects.map((project) => (
                                            <CommandItem
                                                key={project.id}
                                                onSelect={() => runCommand(() => router.push(`/dashboard/admin/crm/projects`))}
                                            >
                                                <Building className="mr-2 h-4 w-4" />
                                                <span>{project.name}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}

                            {!loading && results.campaigns?.length > 0 && (
                                <>
                                    <CommandSeparator />
                                    <CommandGroup heading="Campaigns">
                                        {results.campaigns.map((campaign) => (
                                            <CommandItem
                                                key={campaign.id}
                                                onSelect={() => runCommand(() => router.push(`/dashboard/admin/crm/campaigns`))}
                                            >
                                                <Megaphone className="mr-2 h-4 w-4" />
                                                <span>{campaign.name}</span>
                                                <span className="ml-2 text-xs text-muted-foreground capitalize">({campaign.status})</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </Command>
                </div>
            )}
        </div>
    )
}
