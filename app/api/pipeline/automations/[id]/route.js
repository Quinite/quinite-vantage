import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth } from '@/lib/middleware/withAuth'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'

async function getAutomationForOrg(id, organizationId) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('pipeline_automations')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .maybeSingle()
    if (error) throw error
    return data
}

/**
 * PUT /api/pipeline/automations/[id]
 * Update an automation rule
 */
export const PUT = withAuth(async (request, { params, user, profile }) => {
    const canManage = await hasDashboardPermission(user.id, 'manage_crm_settings')
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const existing = await getAutomationForOrg(id, profile.organization_id)
    if (!existing) return NextResponse.json({ error: 'Automation not found' }, { status: 404 })

    let body
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

    const updates = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.trigger_type !== undefined) updates.trigger_type = body.trigger_type
    if (body.trigger_config !== undefined) updates.trigger_config = body.trigger_config
    if (body.action_type !== undefined) updates.action_type = body.action_type
    if (body.action_config !== undefined) updates.action_config = body.action_config

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('pipeline_automations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ automation: data })
})

/**
 * DELETE /api/pipeline/automations/[id]
 * Delete an automation rule
 */
export const DELETE = withAuth(async (request, { params, user, profile }) => {
    const canManage = await hasDashboardPermission(user.id, 'manage_crm_settings')
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const existing = await getAutomationForOrg(id, profile.organization_id)
    if (!existing) return NextResponse.json({ error: 'Automation not found' }, { status: 404 })

    const supabase = createAdminClient()
    const { error } = await supabase.from('pipeline_automations').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
})
