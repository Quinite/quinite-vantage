import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { searchParams } = new URL(request.url)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 403 })
        }

        const from      = searchParams.get('from')
        const to        = searchParams.get('to')
        const agentId   = searchParams.get('agent_id')
        const projectId = searchParams.get('project_id')
        const unitId    = searchParams.get('unit_id')

        let query = supabase
            .from('site_visits')
            .select(`
                *,
                leads:lead_id ( id, name, phone, email, avatar_url ),
                projects:project_id ( id, name ),
                units:unit_id ( id, unit_number )
            `)
            .eq('organization_id', profile.organization_id)
            .order('scheduled_at', { ascending: true })

        if (from)      query = query.gte('scheduled_at', from)
        if (to)        query = query.lte('scheduled_at', to)
        if (agentId)   query = query.eq('assigned_agent_id', agentId)
        if (projectId) query = query.eq('project_id', projectId)
        if (unitId)    query = query.eq('unit_id', unitId)

        const { data: visits, error } = await query

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Enrich assigned_agent profiles
        const agentIds = [...new Set((visits || []).map(v => v.assigned_agent_id).filter(Boolean))]
        let agentMap = {}
        if (agentIds.length > 0) {
            const admin = createAdminClient()
            const { data: profiles } = await admin
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', agentIds)
            if (profiles) agentMap = Object.fromEntries(profiles.map(p => [p.id, p]))
        }

        const enriched = (visits || []).map(v => ({
            ...v,
            assigned_agent: v.assigned_agent_id ? (agentMap[v.assigned_agent_id] ?? null) : null,
        }))

        return NextResponse.json({ visits: enriched })
    } catch (error) {
        console.error('Error fetching org site visits:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
