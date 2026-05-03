import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[Platform Orgs API] Auth error or no user')
      return corsJSON({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Platform Orgs API] User authenticated:', user.email)

    // Use admin client to fetch profile to bypass RLS
    const adminClient = createAdminClient()
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('[Platform Orgs API] Profile check:', {
      email: user.email,
      role: profile?.role,
      profileError: profileError?.message
    })

    if (!profile || profile?.role !== 'platform_admin') {
      console.log('[Platform Orgs API] Access denied - not platform_admin')
      return corsJSON({ error: 'Platform Admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const action = url.searchParams.get('action') // 'suspend', 'activate', 'delete'

    // Handle Actions (Suspend, Activate, Delete)
    if (action && id) {
      if (request.method === 'POST') {
        const { data: org, error: fetchError } = await adminClient
          .from('organizations')
          .select('settings')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError

        let updateData = {}
        const settings = org.settings || {}

        if (action === 'suspend') {
          updateData.settings = { ...settings, status: 'suspended' }
        } else if (action === 'activate') {
          updateData.settings = { ...settings, status: 'active' }
        } else if (action === 'update_settings') {
          const body = await request.json();
          // Handle explicit column updates if present
          if (body.caller_id) {
            updateData.caller_id = body.caller_id;
          }
          // Preserving generic settings update potential
          if (body.settings) {
            updateData.settings = { ...settings, ...body.settings };
          }
        } else if (action === 'delete') {
          // Check for active subscriptions or other blockers before deleting?
          // For now, allow Platform Admin to delete.
          const { error: deleteError } = await createAdminClient().from('organizations').delete().eq('id', id)
          if (deleteError) throw deleteError
          return corsJSON({ success: true, message: 'Organization deleted' })
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await createAdminClient()
            .from('organizations')
            .update(updateData)
            .eq('id', id)

          if (updateError) throw updateError
        }

        return corsJSON({ success: true, action })
      }
    }


    console.log('[Platform Orgs API] Using admin client to fetch organizations')

    if (id) {
      const { data: org, error } = await adminClient
        .from('organizations')
        .select(`*, users:profiles(id, email, full_name, role, created_at)`)
        .eq('id', id)
        .single()

      if (error) throw error
      // Inject computed status
      const safeOrg = {
        ...org,
        status: org.settings?.status || (org.onboarding_status === 'completed' ? 'active' : 'pending')
      }
      return corsJSON({ organization: safeOrg })
    }

    console.log('[Platform Orgs API] Fetching all organizations with user counts...')
    const { data, error } = await adminClient
      .from('organizations')
      .select('*, profiles(id)')
      .order('created_at', { ascending: false })

    console.log('[Platform Orgs API] Query result:', {
      success: !error,
      count: data?.length || 0,
      error: error?.message
    })

    if (error) {
      console.error('[Platform Orgs API] Error fetching organizations:', error)
      throw error
    }

    // Map status and user count for list view
    const enhancedData = (data || []).map(org => ({
      ...org,
      userCount: org.profiles?.length || 0,
      status: org.settings?.status || (org.onboarding_status === 'completed' ? 'active' : 'pending')
    }))

    console.log('[Platform Orgs API] Returning', enhancedData.length, 'organizations')
    return corsJSON({ organizations: enhancedData })
  } catch (e) {
    console.error('platform/organizations GET error:', e)
    return corsJSON({ error: e.message }, { status: 500 })
  }
}
// Support DELETE method for deletion as well
export async function DELETE(request) {
  // Re-use logic or implement separate handler. 
  // To keep it clean, let's just stick to the GET/POST with action params or standard REST.
  // Standard REST DELETE would be better but let's stick to the structure above for now or separate.
  return GET(request) // Reuse auth buffer wrapper if needed, but better to copy-paste auth check.
}
// Adding standard POST/PUT handler to avoid method not allowed if we move away from GET params
export async function POST(request) {
  return GET(request)
}
