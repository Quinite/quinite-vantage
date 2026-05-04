'use client'

import { useState, useEffect } from 'react'
import LeadSourceDialog from './LeadSourceDialog'
import { useProjects } from '@/hooks/useProjects'
import { useUsers } from '@/hooks/usePipelines'
import { useAuth } from '@/contexts/AuthContext'
import { usePermission } from '@/contexts/PermissionContext'
import { useSubscription } from '@/contexts/SubscriptionContext'

export default function GlobalAddLead() {
    const [open, setOpen] = useState(false)
    const { user } = useAuth()
    const canCreate = usePermission('create_leads')
    const { isExpired: subExpired } = useSubscription()
    
    // Fetch projects and users once when needed or keep it minimal
    // Since this is global, we only fetch when open is true to save resources
    const { data: projects = [] } = useProjects({ status: 'active' }, { enabled: open })
    const { data: users = [] } = useUsers({ enabled: open })

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Shortcut: Alt + N (New Lead)
            if (e.altKey && e.key.toLowerCase() === 'n') {
                if (!user || !canCreate || subExpired) return
                
                // Don't trigger if user is typing in an input/textarea
                const activeElement = document.activeElement
                const isTyping = activeElement.tagName === 'INPUT' || 
                               activeElement.tagName === 'TEXTAREA' || 
                               activeElement.isContentEditable
                
                if (isTyping) return

                e.preventDefault()
                setOpen(true)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [user, canCreate, subExpired])

    if (!user || !canCreate) return null

    return (
        <LeadSourceDialog
            open={open}
            onOpenChange={setOpen}
            projects={projects}
            users={users}
            singleEntryOnly={true}
        />
    )
}
