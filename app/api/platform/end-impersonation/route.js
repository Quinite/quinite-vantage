import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const adminClient = createAdminClient()

    try {
      const { error } = await adminClient
        .from('impersonation_sessions')
        .update({ active: false, ended_at: new Date().toISOString() })
        .eq('admin_id', user.id)
        .eq('active', true)
      if (error) throw new Error('Failed to end impersonation')

      await adminClient.from('audit_logs').insert({ user_id: user.id, user_name: 'Platform Admin', action: 'IMPERSONATION_ENDED', entity_type: 'session', entity_id: null })

      return handleCORS(NextResponse.json({ message: 'Impersonation ended' }))
    } catch (e) {
      console.error('platform/end-impersonation error:', e)
      return handleCORS(NextResponse.json({ error: e.message || 'Failed to end impersonation' }, { status: 500 }))
    }
  } catch (e) {
    console.error('platform/end-impersonation auth error:', e)
    return handleCORS(NextResponse.json({ error: e.message }, { status: 500 }))
  }
}
