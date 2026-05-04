'use client'

import React from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { HelpCircle, ExternalLink, LifeBuoy, Keyboard, Info, MessageCircle, Mail } from 'lucide-react'
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog'

export function HelpMenu() {
    const [showShortcuts, setShowShortcuts] = React.useState(false)
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return (
            <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 w-8 h-8 rounded hidden sm:flex">
                <HelpCircle className="w-4 h-4" />
            </Button>
        )
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 w-8 h-8 rounded hidden sm:flex">
                        <HelpCircle className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Help & Support</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <a href="mailto:support@quinite.co" className="cursor-pointer">
                            <Mail className="mr-2 h-4 w-4" />
                            <span>Email Support</span>
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <a href="https://wa.me/918866066069" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-green-600 focus:text-green-600 focus:bg-green-50">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            <span>WhatsApp Support</span>
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem className='cursor-pointer' onSelect={(e) => {
                        e.preventDefault()
                        setShowShortcuts(true)
                    }}>
                        <Keyboard className="mr-2 h-4 w-4" />
                        <span>Keyboard Shortcuts</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-[10px] text-muted-foreground/60 font-medium tracking-tight">
                        v1.0.0
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
        </>
    )
}
