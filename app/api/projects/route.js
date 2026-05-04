import { NextResponse } from 'next/server'
import { corsJSON } from '@/lib/cors'
import { ProjectService } from '@/services/project.service'
import { withPermission } from '@/lib/middleware/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/permissions'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { checkProjectLimit } from '@/lib/middleware/feature-limits'
import { requireActiveSubscription } from '@/lib/middleware/subscription'

/**
 * GET /api/projects
 * List all projects
 */
export const GET = withPermission('view_projects', async (request, context) => {
  try {
    const { profile } = context

    if (!profile?.organization_id) {
      return corsJSON({ error: 'Organization not found' }, { status: 400 })
    }

    // Use admin client for fetching projects to avoid RLS recursion issues
    // We manually verify organization_id above, so this is safe
    const { searchParams } = new URL(request.url)
    const filters = {
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      archived: searchParams.get('archived') === 'true',
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20
    }


    // 1. Build Query
    const admin = createAdminClient()
    let query = admin
      .from('projects')
      .select('*, campaigns!campaigns_project_id_fkey(*), unit_configs(id, config_name, property_type, category, base_price, carpet_area, transaction_type, amenities)')
      .eq('organization_id', profile.organization_id)
    
    // Optional archive filtering
    if (searchParams.has('archived')) {
      if (filters.archived) {
        query = query.not('archived_at', 'is', null)
      } else {
        query = query.is('archived_at', null)
      }
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,locality.ilike.%${filters.search}%`)
    }

    query = query.order('created_at', { ascending: false })

    // 2. Apply Filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }


    // 3. Pagination
    const page = parseInt(filters.page)
    const limit = parseInt(filters.limit)
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Get count first
    let countQuery = admin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
    
    // Optional archive filtering
    if (searchParams.has('archived')) {
      if (filters.archived) {
        countQuery = countQuery.not('archived_at', 'is', null)
      } else {
        countQuery = countQuery.is('archived_at', null)
      }
    }

    if (filters.search) {
      countQuery = countQuery.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,locality.ilike.%${filters.search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Projects count error:', countError)
    }

    // Execute query
    const { data: projects, error } = await query.range(from, to)

    if (error) throw error

    return corsJSON({
      projects: projects || [],
      metadata: {
        total: count || 0,
        page,
        limit,
        hasMore: (from + limit) < (count || 0)
      }
    })

  } catch (e) {
    console.error('projects GET error:', e)
    return corsJSON({ error: e.message }, { status: 500 })
  }
})



export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return corsJSON({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return corsJSON({ error: 'Organization not found' }, { status: 400 })
    }

    // Check permissions
    const canCreate = await hasDashboardPermission(user.id, 'create_projects')
    if (!canCreate) {
      return corsJSON({
        success: false,
        message: 'You don\'t have permission to create projects'
      }, { status: 200 })
    }

    // Subscription gate
    const subError = await requireActiveSubscription(profile.organization_id)
    if (subError) return corsJSON(subError, { status: 402 })

    // Check project limit
    const limitCheck = await checkProjectLimit(profile.organization_id)
    if (!limitCheck.allowed) {
      return corsJSON({
        error: 'limit_reached',
        resource: 'projects',
        current: limitCheck.current,
        limit: limitCheck.limit,
        message: 'You have reached your project limit. Contact us to upgrade.'
      }, { status: 403 })
    }

    const { name, description, address, image_url, image_path } = body

    if (!name) {
      return corsJSON({ error: 'Project name is required' }, { status: 400 })
    }

    // Support both flat fields and legacy real_estate nested shape from the form
    const re = body.real_estate || {}

    const unitTypesArr = Array.isArray(body.unit_types) ? body.unit_types : []
    const prices = unitTypesArr.map(u => Number(u.price || u.base_price)).filter(p => !isNaN(p) && p > 0)

    const payload = {
      name,
      description: description || null,
      address: address || null,
      image_url: image_url || null,
      image_path: image_path || null,
      rera_number: re.rera_number || body.rera_number || null,
      // Location — flat or nested from form
      city:     re.location?.city     || body.city     || null,
      state:    re.location?.state    || body.state    || null,
      country:  re.location?.country  || body.country  || 'India',
      pincode:  re.location?.pincode  || body.pincode  || null,
      locality: re.location?.locality || body.locality || null,
      landmark: re.location?.landmark || body.landmark || null,
      // Inventory
      total_units:      body.total_units || 0,
      project_status:   body.project_status || 'planning',
      is_draft:         body.is_draft || false,
      show_in_inventory: body.show_in_inventory !== false,
      possession_date:  body.possession_date || null,
      completion_date:  body.completion_date || null,
      public_visibility: body.public_visibility !== undefined ? body.public_visibility : false,
      organization_id:  profile.organization_id,
      created_by:       user.id,
      min_price: prices.length ? Math.min(...prices) : null,
      max_price: prices.length ? Math.max(...prices) : null,
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      brochure_url: body.brochure_url || null,
      brochure_path: body.brochure_path || null,
    }

    const { data: project, error } = await admin
      .from('projects')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    // Sync Unit Configs to unit_configs table
    if (body.unit_types) {
      await ProjectService.syncUnitConfigs(project.id, profile.organization_id, body.unit_types, user.id)
    }

    try {
      await logAudit(
        supabase,
        user.id,
        profile.full_name || user.email,
        'project.create',
        'project',
        project.id,
        { name: project.name }
      )
    } catch (e) {
      console.warn('Audit log failed:', e.message)
    }

    // Automatic Campaign Creation
    try {
      const today = new Date()
      const nextMonth = new Date(today)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      const campaignPayload = {
        organization_id: profile.organization_id,
        project_id: project.id,
        name: `${project.name} Campaign`,
        description: `Default campaign for ${project.name}`,
        start_date: today.toISOString().split('T')[0],
        end_date: nextMonth.toISOString().split('T')[0],
        time_start: '09:00',
        time_end: '17:00',
        status: 'scheduled',
        created_by: user.id
      }

      await admin.from('campaigns').insert(campaignPayload)

    } catch (campError) {
      console.error('Failed to auto-create campaign:', campError)
    }

    /* 
    // Manual sync is deprecated in favor of Visual Unit Painting
    try {
      await PropertyService.syncProjectInventory(project, user.id)
    } catch (syncError) {
      console.error('Failed to sync project inventory:', syncError)
    }
    */

    return corsJSON({ project })
  } catch (e) {
    console.error('projects POST error:', e)
    return corsJSON({ error: e.message }, { status: 500 })
  }
}
