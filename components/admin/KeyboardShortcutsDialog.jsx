'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Keyboard, Search, Move, X, Plus } from 'lucide-react'

export function KeyboardShortcutsDialog({ open, onOpenChange }) {
    const shortcuts = [
        { icon: Search, label: 'Global Search', keys: ['/'] },
        { icon: Move, label: 'Navigation', keys: ['Tab'] },
        { icon: Plus, label: 'Add Lead', keys: ['Alt', 'N'] },
        { icon: X, label: 'Close Dialogs', keys: ['Esc'] },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="w-5 h-5 text-muted-foreground" />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Quickly navigate the application with these shortcuts.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {shortcuts.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-secondary/30 text-muted-foreground">
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-foreground">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {item.keys.map((key, kIndex) => (
                                    <kbd key={kIndex} className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100 min-w-[24px] justify-center">
                                        {key}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
