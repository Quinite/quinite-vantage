import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return corsJSON({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify Platform Admin access
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile?.role !== 'platform_admin') {
      return corsJSON({ error: 'Platform Admin access required' }, { status: 403 })
    }

    // Fetch full organization details
    const { data: org, error } = await adminClient
      .from('organizations')
      .select(`
        *,
        users:profiles(id, email, full_name, role, created_at, avatar_url),
        subscription:subscriptions(id, status, current_period_end, plan:subscription_plans(name, slug)),
        credits:call_credits(balance, total_purchased, total_consumed)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // Inject computed status
    const safeOrg = {
      ...org,
      status: org.settings?.status || (org.onboarding_status === 'completed' ? 'active' : 'pending')
    }

    return corsJSON({ organization: safeOrg })
  } catch (e) {
    console.error('platform/organizations/[id] GET error:', e)
    return corsJSON({ error: e.message }, { status: 500 })
  }
}
