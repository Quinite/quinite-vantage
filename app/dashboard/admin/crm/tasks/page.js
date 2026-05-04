'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TasksPageView from '@/components/crm/TasksPageView'
import { usePermissions } from '@/contexts/PermissionContext'
import { useDynamicTitle } from '@/hooks/useDynamicTitle'

export default function TasksPage() {
    useDynamicTitle('Tasks')
    const router = useRouter()
    const { hasPermission, loading } = usePermissions()

    useEffect(() => {
        if (!loading && !hasPermission('view_tasks')) {
            router.replace('/dashboard/admin/crm/dashboard')
        }
    }, [loading, hasPermission])

    if (loading) return null

    return <TasksPageView />
}
