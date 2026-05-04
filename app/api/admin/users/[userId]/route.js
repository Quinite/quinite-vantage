import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/middleware/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ValidationError, NotFoundError, handleApiError } from '@/lib/errors'
import { corsJSON } from '@/lib/cors'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'

export async function GET(request, { params }) {
    try {
        const auth = await requireRole(request, ['super_admin'])
        if (auth instanceof NextResponse) return auth

        const { profile } = auth
        const { userId } = await params
        const admin = createAdminClient()

        // Get user details
        const { data: user, error } = await admin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .eq('organization_id', profile.organization_id)
            .single()

        if (error || !user) {
            throw new NotFoundError('User')
        }

        return corsJSON({ user })

    } catch (error) {
        const { status, body } = handleApiError(error)
        return corsJSON(body, { status })
    }
}

export async function PUT(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check permission
        const canManage = await hasDashboardPermission(user.id, 'manage_users')
        if (!canManage) {
            return corsJSON({ error: 'Forbidden - Missing "manage_users" permission' }, { status: 403 })
        }

        const { userId } = await params
        const body = await request.json()
        const admin = createAdminClient()

        // Get user's organization first
        const { data: profile } = await admin.from('profiles').select('organization_id, id, full_name').eq('id', user.id).single()

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 404 })
        }

        // Verify user belongs to same organization
        const { data: targetUser } = await admin
            .from('profiles')
            .select('organization_id, role')
            .eq('id', userId)
            .single()

        if (!targetUser || targetUser.organization_id !== profile.organization_id) {
            throw new NotFoundError('User')
        }

        // Only update fields that were explicitly sent in the body
        const updates = { updated_at: new Date().toISOString() }
        if (body.fullName !== undefined) updates.full_name = body.fullName
        if (body.email    !== undefined) updates.email     = body.email
        if (body.phone    !== undefined) updates.phone     = body.phone || null
        if (body.role     !== undefined) updates.role      = body.role

        const { data: updatedUser, error } = await admin
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single()

        if (error) {
            throw new Error('Failed to update user')
        }

        // If role changed: clear stale user-specific permission overrides and bump
        // permission_version so active sessions re-fetch updated permissions within ~60s
        if (body.role && body.role !== targetUser.role) {
            await admin.from('user_permissions').delete().eq('user_id', userId)
            const { data: org } = await admin
                .from('organizations')
                .select('permission_version')
                .eq('id', profile.organization_id)
                .single()
            await admin
                .from('organizations')
                .update({ permission_version: (org?.permission_version || 1) + 1 })
                .eq('id', profile.organization_id)
        }

        // Create audit log
        await admin.from('audit_logs').insert({
            organization_id: profile.organization_id,
            user_id: profile.id,
            user_name: profile.full_name,
            action: 'user.updated',
            entity_type: 'user',
            entity_id: userId,
            metadata: {
                updated_fields: Object.keys(body),
                new_role: body.role
            }
        })

        return corsJSON({ user: updatedUser })

    } catch (error) {
        const { status, body } = handleApiError(error)
        return corsJSON(body, { status })
    }
}

export async function DELETE(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check permission
        const canManage = await hasDashboardPermission(user.id, 'manage_users')
        if (!canManage) {
            return corsJSON({ error: 'Forbidden - Missing "manage_users" permission' }, { status: 403 })
        }

        const { userId } = await params
        const admin = createAdminClient()

        // Get user's organization first
        const { data: profile } = await admin.from('profiles').select('organization_id, id, full_name').eq('id', user.id).single()

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 404 })
        }

        // Verify user belongs to same organization
        const { data: targetUser } = await admin
            .from('profiles')
            .select('organization_id')
            .eq('id', userId)
            .single()

        if (!targetUser || targetUser.organization_id !== profile.organization_id) {
            throw new NotFoundError('User')
        }

        // Delete user from auth.users (will cascade to profiles)
        const { error: deleteError } = await admin.auth.admin.deleteUser(userId)

        if (deleteError) {
            throw new Error('Failed to delete user')
        }

        // Create audit log
        await admin.from('audit_logs').insert({
            organization_id: profile.organization_id,
            user_id: profile.id,
            user_name: profile.full_name,
            action: 'user.deleted',
            entity_type: 'user',
            entity_id: userId,
            metadata: { deleted_user_id: userId }
        })

        return corsJSON({ success: true })

    } catch (error) {
        const { status, body } = handleApiError(error)
        return corsJSON(body, { status })
    }
}
