'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/contexts/PermissionContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function SettingsPage() {
    const router = useRouter()
    const { hasPermission, loading } = usePermissions()

    useEffect(() => {
        if (loading) return

        if (hasPermission('view_settings')) {
            router.replace('/dashboard/admin/settings/organization')
        } else if (hasPermission('view_users')) {
            router.replace('/dashboard/admin/settings/members')
        } else if (hasPermission('manage_permissions')) {
            router.replace('/dashboard/admin/settings/roles')
        } else if (hasPermission('manage_crm_settings')) {
            router.replace('/dashboard/admin/crm/settings')
        } else if (hasPermission('view_billing')) {
            router.replace('/dashboard/admin/settings/subscription')
        } else {
            router.replace('/dashboard/admin')
        }
    }, [loading, hasPermission])

    return (
        <div className="h-full flex items-center justify-center">
            <LoadingSpinner className="w-6 h-6 text-muted-foreground" />
        </div>
    )
}
