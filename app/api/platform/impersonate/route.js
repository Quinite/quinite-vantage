import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { targetUserId, organizationId } = body
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const { data: impersonatorProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (impersonatorProfile?.role !== 'platform_admin') return handleCORS(NextResponse.json({ error: 'Only Platform Admins can impersonate users' }, { status: 403 }))

    const adminClient = createAdminClient()

    let targetId = targetUserId

    // If no specific user provided, find the first owner/admin of the organization
    if (!targetId) {
      const { data: users, error: usersError } = await adminClient
        .from('profiles')
        .select('id, role')
        .eq('organization_id', organizationId)
        // .in('role', ['super_admin', 'manager']) // Assuming roles; filtering in JS if needed
        .limit(5)

      if (usersError || !users || users.length === 0) {
        return handleCORS(NextResponse.json({ error: 'No users found in this organization' }, { status: 404 }))
      }

      // Prefer manager/admin, else first user
      const adminUser = users.find(u => u.role === 'super_admin' || u.role === 'manager') || users[0]
      targetId = adminUser.id
    }

    try {
      const { data: targetProfile, error: targetError } = await adminClient
        .from('profiles')
        .select('*, organization:organizations(name)')
        .eq('id', targetId)
        .eq('organization_id', organizationId)
        .single()
      if (targetError || !targetProfile) throw new Error('Target user not found in specified organization')

      await adminClient
        .from('impersonation_sessions')
        .update({ active: false, ended_at: new Date().toISOString() })
        .eq('admin_id', user.id)
        .eq('active', true)

      const { data: session, error: sessionError } = await adminClient
        .from('impersonation_sessions')
        .insert({ 
          admin_id: user.id, 
          target_user_id: targetId, 
          active: true,
          reason: 'Platform Admin Impersonation'
        })
        .select()
        .single()
      if (sessionError) {
        console.error('Session Error:', sessionError)
        throw new Error('Failed to create impersonation session')
      }

      await adminClient.from('audit_logs').insert({ 
        user_id: user.id, 
        user_name: 'Platform Admin', 
        action: 'IMPERSONATION_STARTED', 
        entity_type: 'user', 
        entity_id: targetId, 
        is_impersonated: false, 
        metadata: { 
          target_user_email: targetProfile.email, 
          target_organization: targetProfile.organization?.name, 
          impersonation_session_id: session.id 
        } 
      })

      return handleCORS(NextResponse.json({ 
        message: 'Impersonation started', 
        session, 
        targetUser: { 
          id: targetProfile.id, 
          email: targetProfile.email, 
          name: targetProfile.full_name, 
          role: targetProfile.role, 
          organization: targetProfile.organization?.name 
        } 
      }))
    } catch (e) {
      console.error('platform/impersonate error:', e)
      return handleCORS(NextResponse.json({ error: e.message || 'Impersonation failed' }, { status: 500 }))
    }
  } catch (e) {
    console.error('platform/impersonate error:', e)
    return handleCORS(NextResponse.json({ error: e.message }, { status: 500 }))
  }
}
