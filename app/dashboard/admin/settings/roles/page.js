'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function RolePermissionsPage() {
    const [loading, setLoading] = useState(true)
    const [features, setFeatures] = useState({})
    const [rolePermissions, setRolePermissions] = useState({})
    const [roles, setRoles] = useState([])
    const [selectedRole, setSelectedRole] = useState('employee')
    const [savingKey, setSavingKey] = useState(null)

    useEffect(() => {
        fetchPermissions()
    }, [])

    const fetchPermissions = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/permissions/roles')
            if (response.ok) {
                const data = await response.json()
                setFeatures(data.features || {})
                setRolePermissions(data.rolePermissions || {})
                setRoles(data.roles || [])
            } else {
                toast.error('Failed to fetch role permissions')
            }
        } catch (error) {
            console.error('Error fetching permissions:', error)
            toast.error('An error occurred while fetching permissions')
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = async (role, featureKey, currentValue) => {
        const newValue = !currentValue
        const key = `${role}:${featureKey}`
        setSavingKey(key)

        setRolePermissions(prev => ({
            ...prev,
            [role]: { ...prev[role], [featureKey]: newValue }
        }))

        try {
            const res = await fetch(`/api/permissions/roles/${role}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature_key: featureKey, is_enabled: newValue })
            })
            if (!res.ok) {
                setRolePermissions(prev => ({
                    ...prev,
                    [role]: { ...prev[role], [featureKey]: currentValue }
                }))
                toast.error('Failed to save permission')
            }
        } catch {
            setRolePermissions(prev => ({
                ...prev,
                [role]: { ...prev[role], [featureKey]: currentValue }
            }))
            toast.error('Failed to save permission')
        } finally {
            setSavingKey(null)
        }
    }

    const getCategoryIcon = (category) => {
        const icons = {
            leads: '👥', campaigns: '📢', projects: '📁', calls: '📞',
            analytics: '📊', users: '👤', settings: '⚙️', audit: '📋',
            inventory: '🏢', crm: '🎯'
        }
        return icons[category] || '📌'
    }

    const getRoleBadgeColor = (role) => {
        const colors = {
            employee: 'bg-blue-100 text-blue-800',
            manager: 'bg-purple-100 text-purple-800',
            super_admin: 'bg-green-100 text-green-800'
        }
        return colors[role] || 'bg-gray-100 text-gray-800'
    }

    const getActiveCount = (role) => {
        if (!rolePermissions[role]) return 0
        return Object.values(rolePermissions[role]).filter(Boolean).length
    }

    const getTotalCount = () => {
        return Object.values(features).reduce((sum, arr) => sum + arr.length, 0)
    }

    if (loading) {
        return (
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-12 w-full" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    const total = getTotalCount()

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50/30 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Shield className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Role Permissions</h1>
                        <p className="text-sm md:text-base text-slate-500 mt-1">
                            Changes save automatically. Affects all users with this role.
                        </p>
                    </div>
                </div>
            </div>

            {/* Role Tabs */}
            <Tabs value={selectedRole} onValueChange={setSelectedRole}>
                <TabsList className="grid w-full grid-cols-3">
                    {roles.map(role => {
                        const active = getActiveCount(role)
                        return (
                            <TabsTrigger key={role} value={role} className="gap-2">
                                <Badge className={getRoleBadgeColor(role)}>
                                    {role.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{active}/{total}</span>
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                {roles.map(role => (
                    <TabsContent key={role} value={role} className="space-y-4 mt-6">
                        {Object.entries(features).map(([category, categoryFeatures]) => {
                            const activeInCategory = categoryFeatures.filter(f => rolePermissions[role]?.[f.feature_key]).length
                            return (
                                <Card key={category}>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <span className="text-2xl">{getCategoryIcon(category)}</span>
                                            <span className="capitalize">{category}</span>
                                            <Badge variant="outline" className="ml-auto">
                                                {activeInCategory} / {categoryFeatures.length}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {categoryFeatures.map(feature => {
                                                const isEnabled = rolePermissions[role]?.[feature.feature_key] || false
                                                const key = `${role}:${feature.feature_key}`
                                                const isSaving = savingKey === key

                                                return (
                                                    <div
                                                        key={feature.feature_key}
                                                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="flex-1">
                                                            <h4 className="font-medium">{feature.feature_name}</h4>
                                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                                {feature.description}
                                                            </p>
                                                            <code className="text-xs text-gray-400 mt-1 block">
                                                                {feature.feature_key}
                                                            </code>
                                                        </div>
                                                        <div className="flex items-center gap-3 ml-4">
                                                            {isSaving ? (
                                                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                                            ) : isEnabled ? (
                                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                            ) : (
                                                                <XCircle className="w-5 h-5 text-gray-400" />
                                                            )}
                                                            <Switch
                                                                checked={isEnabled}
                                                                disabled={isSaving}
                                                                onCheckedChange={() => handleToggle(role, feature.feature_key, isEnabled)}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
