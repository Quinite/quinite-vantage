'use client'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import CredentialsModal from '@/components/dashboard/CredentialsModal'
import { Pencil, Trash2, Plus, Shield, Loader2, ChevronDown, Search, ArrowUpDown, AlertCircle, Building2, User2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import PermissionManager from '@/components/admin/PermissionManager'
import { PhoneInput } from '@/components/ui/phone-input'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function MembersPage() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCredentials, setShowCredentials] = useState(false)
    const [newCredentials, setNewCredentials] = useState(null)
    const [editingUser, setEditingUser] = useState(null)
    const [managingPermissions, setManagingPermissions] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' })
    
    // Deletion states
    const [userToDelete, setUserToDelete] = useState(null)
    const [associations, setAssociations] = useState(null)
    const [checkingAssociations, setCheckingAssociations] = useState(false)

    const canInvite = usePermission('create_users')
    const canManageUsers = usePermission('manage_users')
    const canManagePermissions = usePermission('manage_permissions')

    useEffect(() => {
        fetchUsers()
    }, [])

    async function fetchUsers() {
        try {
            const profileResponse = await fetch('/api/auth/user')
            const profileData = await profileResponse.json()

            if (!profileResponse.ok || !profileData.user?.profile) {
                throw new Error('Failed to fetch profile')
            }

            const organizationId = profileData.user.profile.organization_id
            if (!organizationId) throw new Error('No organization found')

            const response = await fetch('/api/admin/users')
            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Failed to fetch users')
            setUsers(data.users || [])
        } catch (error) {
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    async function checkAssociations(userId) {
        setCheckingAssociations(true)
        setAssociations(null)
        try {
            const supabase = createClient()
            
            const [
                { count: leadCount },
                { count: taskCount },
                { count: projectCount }
            ] = await Promise.all([
                supabase.from('leads').select('*', { count: 'exact', head: true }).or(`assigned_to.eq.${userId},created_by.eq.${userId}`),
                supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', userId),
                supabase.from('projects').select('*', { count: 'exact', head: true }).eq('created_by', userId)
            ])

            setAssociations({
                leads: leadCount || 0,
                tasks: taskCount || 0,
                projects: projectCount || 0,
                total: (leadCount || 0) + (taskCount || 0) + (projectCount || 0)
            })
        } catch (error) {
            console.error('Failed to check associations:', error)
        } finally {
            setCheckingAssociations(false)
        }
    }

    async function handleDeleteUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })

            if (!response.ok) {
                const text = await response.text()
                let errorMessage = 'Failed to delete user'
                try {
                    const data = JSON.parse(text)
                    if (data.error) errorMessage = data.error
                } catch (e) {
                    if (response.status === 404) errorMessage = 'User not found'
                    else if (response.status === 403) errorMessage = 'Unauthorized'
                    else if (text) errorMessage = text
                }
                throw new Error(errorMessage)
            }

            toast.success('User deleted successfully')
            setUserToDelete(null)
            setAssociations(null)
            fetchUsers()
        } catch (error) {
            toast.error(error.message)
        }
    }

    function getRoleBadgeColor(role) {
        const colors = {
            super_admin:    'bg-purple-100 text-purple-800',
            manager:        'bg-blue-100 text-blue-800',
            employee:       'bg-gray-100 text-gray-800',
            platform_admin: 'bg-red-100 text-red-800',
        }
        return colors[role] || 'bg-gray-100 text-gray-800'
    }

    const filteredUsers = users.filter(user => {
        const searchStr = searchTerm.toLowerCase()
        return (
            user.full_name?.toLowerCase().includes(searchStr) ||
            user.email?.toLowerCase().includes(searchStr) ||
            user.phone?.toLowerCase().includes(searchStr) ||
            user.role?.toLowerCase().includes(searchStr)
        )
    })

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortConfig.key) return 0
        const aVal = a[sortConfig.key] || ''
        const bVal = b[sortConfig.key] || ''
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    if (loading) {
        return (
            <div className="h-full bg-gray-50/50 overflow-y-auto">
                <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-32" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200">
                            <Skeleton className="h-10 w-64" />
                        </div>
                        <div className="divide-y divide-slate-100">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-48" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Skeleton className="h-8 w-20" />
                                        <Skeleton className="h-8 w-8" />
                                        <Skeleton className="h-8 w-8" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full bg-gray-50/50 overflow-y-auto">
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Team Management</h1>
                        <p className="text-sm md:text-base text-slate-500 mt-1">Manage your team members, roles, and access permissions.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <PermissionTooltip
                            hasPermission={canInvite}
                            message="You need 'Create Users' permission to add new users."
                        >
                            <Button
                                onClick={() => { setEditingUser(null); setShowModal(true) }}
                                disabled={!canInvite}
                                className="w-full md:w-auto h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all duration-200"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add New User
                            </Button>
                        </PermissionTooltip>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white border-slate-200"
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleSort('full_name')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Name
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleSort('email')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Email
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleSort('role')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Role
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleSort('created_at')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Joined
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {sortedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">{user.full_name || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-muted-foreground">{user.phone || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {canManageUsers ? (
                                                <RoleSelect
                                                    userId={user.id}
                                                    currentRole={user.role}
                                                    onSuccess={fetchUsers}
                                                />
                                            ) : (
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                                    {user.role?.replace('_', ' ')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help hover:text-slate-900 transition-colors">
                                                            {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs font-medium">
                                                            {new Date(user.created_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at {new Date(user.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                <PermissionTooltip
                                                    hasPermission={canManagePermissions}
                                                    message="You need 'Manage Permissions' permission to manage user permissions."
                                                >
                                                    <button
                                                        onClick={() => { if (!canManagePermissions) return; setManagingPermissions(user) }}
                                                        disabled={!canManagePermissions}
                                                        className="relative p-1.5 text-purple-600 hover:bg-purple-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={canManagePermissions ? 'Manage Permissions' : 'Permission Required'}
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                    </button>
                                                </PermissionTooltip>
                                                <PermissionTooltip
                                                    hasPermission={canManageUsers}
                                                    message="You need 'Manage Users' permission to edit user details."
                                                >
                                                    <button
                                                        onClick={() => { if (!canManageUsers) return; setEditingUser(user); setShowModal(true) }}
                                                        disabled={!canManageUsers}
                                                        className="relative p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={canManageUsers ? 'Edit User' : 'Permission Required'}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </PermissionTooltip>
                                                <PermissionTooltip
                                                    hasPermission={canManageUsers}
                                                    message="You need 'Manage Users' permission to delete users."
                                                >
                                                    <button
                                                        onClick={() => { 
                                                            if (!canManageUsers) return; 
                                                            setUserToDelete(user);
                                                            checkAssociations(user.id);
                                                        }}
                                                        disabled={!canManageUsers}
                                                        className="relative p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={canManageUsers ? 'Delete User' : 'Permission Required'}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </PermissionTooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {sortedUsers.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">
                                {searchTerm ? `No users matching "${searchTerm}"` : 'No users found'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <UserModal
                    user={editingUser}
                    onClose={() => { setShowModal(false); setEditingUser(null) }}
                    onSuccess={(credentials) => {
                        setShowModal(false)
                        setEditingUser(null)
                        fetchUsers()
                        if (credentials?.tempPassword) {
                            setNewCredentials(credentials)
                            setShowCredentials(true)
                        }
                    }}
                />
            )}

            <CredentialsModal
                open={showCredentials}
                onOpenChange={setShowCredentials}
                credentials={newCredentials}
            />

            {managingPermissions && (
                <div className="fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setManagingPermissions(null)}
                    />
                    <div className="relative ml-auto w-full max-w-2xl bg-white h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-300">
                        <PermissionManager
                            userId={managingPermissions.id}
                            userRole={managingPermissions.role}
                            user={managingPermissions}
                            onClose={() => setManagingPermissions(null)}
                        />
                    </div>
                </div>
            )}

            {/* Deletion Dialog */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            Confirm Deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-2">
                            {checkingAssociations ? (
                                <div className="space-y-3 py-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-20 w-full rounded-xl" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-8 w-20" />
                                        <Skeleton className="h-8 w-20 ml-auto" />
                                    </div>
                                </div>
                            ) : associations?.total > 0 ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
                                        <p className="font-bold mb-2">Cannot delete member yet</p>
                                        <p>This user is currently associated with:</p>
                                        <ul className="list-disc list-inside mt-2 space-y-1 font-medium">
                                            {associations.leads > 0 && <li>{associations.leads} Leads</li>}
                                            {associations.tasks > 0 && <li>{associations.tasks} Tasks</li>}
                                            {associations.projects > 0 && <li>{associations.projects} Projects</li>}
                                        </ul>
                                        <p className="mt-3 text-amber-800 italic">
                                            Please reassign or delete these records before removing this member.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p>Are you sure you want to delete <span className="font-bold text-slate-900">{userToDelete?.full_name}</span>?</p>
                                    <p className="text-xs text-slate-500">This action cannot be undone. All access for this user will be revoked immediately.</p>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        {(!checkingAssociations && associations?.total === 0) && (
                            <AlertDialogAction
                                onClick={() => handleDeleteUser(userToDelete.id)}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            >
                                {loading ? 'Deleting...' : 'Delete Member'}
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

const ROLES = [
    { value: 'employee',    label: 'Employee',  color: 'bg-gray-100 text-gray-700' },
    { value: 'manager',     label: 'Manager',   color: 'bg-blue-100 text-blue-700' },
    { value: 'super_admin', label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
]

function RoleSelect({ userId, currentRole, onSuccess }) {
    const [saving, setSaving] = useState(false)
    const current = ROLES.find(r => r.value === currentRole) || ROLES[0]

    async function handleRoleChange(newRole) {
        if (newRole === currentRole) return
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            })
            if (!res.ok) throw new Error()
            toast.success('Role updated')
            onSuccess()
        } catch {
            toast.error('Failed to update role')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Select
                value={currentRole}
                onValueChange={handleRoleChange}
                disabled={saving}
            >
                <SelectTrigger className={`h-8 w-[140px] border-none shadow-none focus:ring-0 ${current.color} hover:opacity-80 transition-opacity`}>
                    <SelectValue>
                        {current.label}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>
                            {r.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {saving && <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />}
        </div>
    )
}

function UserModal({ user, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false)
    // Normalize phone to E.164 — PhoneInput requires a + prefix
    const normalizePhone = (p) => {
        if (!p) return ''
        const trimmed = p.trim()
        return trimmed.startsWith('+') ? trimmed : `+${trimmed}`
    }

    const [formData, setFormData] = useState({
        email:    user?.email     || '',
        phone:    normalizePhone(user?.phone),
        fullName: user?.full_name || '',
        role:     user?.role      || 'employee',
    })
    const [error, setError] = useState(null)

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            const url    = user ? `/api/admin/users/${user.id}` : '/api/admin/users/invite'
            const method = user ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })
            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Operation failed')

            toast.success(user ? 'User updated' : 'User added successfully')
            onSuccess(data.user)
        } catch (error) {
            setError(error.message)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                            type="email" required
                            value={formData.email}
                            onChange={(e) => {
                                setFormData({ ...formData, email: e.target.value })
                                if (error) setError(null)
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                                error?.toLowerCase().includes('email') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="user@example.com"
                        />
                        {error?.toLowerCase().includes('email') && (
                            <p className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {error}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                        <PhoneInput
                            required
                            value={formData.phone}
                            onChange={(value) => setFormData({ ...formData, phone: value })}
                            className="w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+91 98765 43210"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                            type="text" required
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 outline-none rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                        <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData({ ...formData, role: value })}
                        >
                            <SelectTrigger className="w-full bg-white border-gray-300 rounded-lg">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLES.map(r => (
                                    <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Saving...' : (user ? 'Update User' : 'Add User')}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
