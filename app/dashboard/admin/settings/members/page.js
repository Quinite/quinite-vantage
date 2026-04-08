'use client'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import CredentialsModal from '@/components/dashboard/CredentialsModal'
import { Pencil, Trash2, Plus, Shield } from 'lucide-react'
import PermissionManager from '@/components/admin/PermissionManager'
import { PhoneInput } from '@/components/ui/phone-input'
import { usePermission } from '@/contexts/PermissionContext'
import PermissionTooltip from '@/components/permissions/PermissionTooltip'

export default function MembersPage() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCredentials, setShowCredentials] = useState(false)
    const [newCredentials, setNewCredentials] = useState(null)
    const [editingUser, setEditingUser] = useState(null)
    const [managingPermissions, setManagingPermissions] = useState(null)

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

    async function handleDeleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return

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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Team Members</h1>
                        <p className="text-muted-foreground text-slate-500 mt-1">Manage your team members, roles, and access permissions.</p>
                    </div>
                    <PermissionTooltip
                        hasPermission={canInvite}
                        message="You need 'Create Users' permission to add new users."
                    >
                        <button
                            onClick={() => { setEditingUser(null); setShowModal(true) }}
                            disabled={!canInvite}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add New User
                        </button>
                    </PermissionTooltip>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {users.map((user) => (
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
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                                {user.role?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString()}
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
                                                        onClick={() => { if (!canManageUsers) return; handleDeleteUser(user.id) }}
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

                    {users.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No users found</p>
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
                        <PermissionManager
                            userId={managingPermissions.id}
                            userRole={managingPermissions.role}
                            onClose={() => setManagingPermissions(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

function UserModal({ user, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        email:    user?.email     || '',
        phone:    user?.phone     || '',
        fullName: user?.full_name || '',
        role:     user?.role      || 'employee',
    })

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

            toast.success(user ? 'User updated successfully!' : 'User added successfully!')
            onSuccess(data.user)
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{user ? 'Edit User' : 'Add New User'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                            type="email" required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="user@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                        <PhoneInput
                            required
                            value={formData.phone}
                            onChange={(value) => setFormData({ ...formData, phone: value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+91 98765 43210"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                            type="text" required
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="super_admin">Super Admin</option>
                        </select>
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
            </div>
        </div>
    )
}
