import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const admin = createAdminClient()

        const { data: profile } = await admin.from('profiles')
            .select('organization_id').eq('id', user.id).single()

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 403 })
        }

        const webserverUrl = process.env.WEBSOCKET_SERVER_URL
        const res = await fetch(`${webserverUrl}/calls/${id}/hangup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizationId: profile.organization_id }),
        })

        const data = await res.json()
        return NextResponse.json(data, { status: res.status })
    } catch (error) {
        console.error('Error cancelling call:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
