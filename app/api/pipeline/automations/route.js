import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth } from '@/lib/middleware/withAuth'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'

/**
 * GET /api/pipeline/automations
 * List all automation rules for the org (optionally filtered by pipeline_id)
 */
export const GET = withAuth(async (request, { user, profile }) => {
    const { searchParams } = new URL(request.url)
    const pipelineId = searchParams.get('pipeline_id')

    const supabase = createAdminClient()
    let query = supabase
        .from('pipeline_automations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: true })

    if (pipelineId) query = query.eq('pipeline_id', pipelineId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ automations: data })
})

/**
 * POST /api/pipeline/automations
 * Create a new automation rule
 */
export const POST = withAuth(async (request, { user, profile }) => {
    const canManage = await hasDashboardPermission(user.id, 'manage_crm_settings')
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let body
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

    const { pipeline_id, name, trigger_type, trigger_config, action_type, action_config, is_active } = body

    if (!pipeline_id || !name || !trigger_type || !action_type) {
        return NextResponse.json({ error: 'pipeline_id, name, trigger_type, action_type are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify pipeline belongs to org
    const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('id', pipeline_id)
        .eq('organization_id', profile.organization_id)
        .maybeSingle()

    if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })

    const { data, error } = await supabase
        .from('pipeline_automations')
        .insert({
            organization_id: profile.organization_id,
            pipeline_id,
            name,
            trigger_type,
            trigger_config: trigger_config ?? {},
            action_type,
            action_config: action_config ?? {},
            is_active: is_active !== false,
            created_by: user.id,
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ automation: data }, { status: 201 })
})
