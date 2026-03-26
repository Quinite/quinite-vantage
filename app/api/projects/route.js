import { NextResponse } from 'next/server'
import { corsJSON } from '@/lib/cors'
import { ProjectService } from '@/services/project.service'
import { withPermission } from '@/lib/middleware/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/permissions'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import * as fs from 'fs'
import * as path from 'path'
import Ajv from 'ajv'
import { PropertyService } from '@/services/property.service'

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
      projectType: searchParams.get('project_type'),
      search: searchParams.get('search'),
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20
    }


    // 1. Build Query
    const admin = createAdminClient()
    let query = admin
      .from('projects')
      .select('*, campaigns(*)') // Fetch related campaigns
      .eq('organization_id', profile.organization_id)

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,locality.ilike.%${filters.search}%`)
    }

    query = query.order('created_at', { ascending: false })

    // 2. Apply Filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.projectType && filters.projectType !== 'all') {
      query = query.eq('project_type', filters.projectType)
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

    const {
      name,
      description,
      address,
      type,
      metadata,
      image_url,
      image_path
    } = body

    // Validate optional real estate payload if present (Skip if draft)
    const realEstate = body.real_estate || (metadata && metadata.real_estate)
    const isDraft = body.is_draft === true
    
    if (realEstate && !isDraft) {
      try {
        const schemaPath = path.join(process.cwd(), 'lib', 'schemas', 'realEstateProperty.schema.json')
        const schemaRaw = fs.readFileSync(schemaPath, 'utf8')
        const schema = JSON.parse(schemaRaw)
        const ajv = new Ajv({ allErrors: true, strict: false })
        const validate = ajv.compile(schema)
        const valid = validate(realEstate)
        if (!valid) {
          return corsJSON({
            error: 'Invalid real_estate payload',
            details: validate.errors
          }, { status: 400 })
        }
      } catch (err) {
        console.error('Schema validation error:', err)
        return corsJSON({ error: 'Schema validation failed' }, { status: 500 })
      }
    }

    if (!name) {
      return corsJSON({ error: 'Project name is required' }, { status: 400 })
    }

    const payload = {
      name,
      description: description || null,
      address: address || null,
      project_type: type || null,
      metadata: metadata || (realEstate ? { real_estate: realEstate } : null),
      image_url: image_url || null,
      image_path: image_path || null,
      // Inventory fields
      total_units: body.total_units || 0,
      unit_types: body.unit_types || null,
      price_range: body.price_range || null,
      project_status: body.project_status || 'planning',
      is_draft: body.is_draft || false,
      show_in_inventory: body.show_in_inventory !== false,
      possession_date: body.possession_date || null,
      completion_date: body.completion_date || null,
      organization_id: profile.organization_id,
      created_by: user.id,
      public_visibility: body.public_visibility !== undefined ? body.public_visibility : false,
      city: realEstate?.location?.city || null,
      state: realEstate?.location?.state || null,
      country: realEstate?.location?.country || 'India',
      pincode: realEstate?.location?.pincode || null,
      locality: realEstate?.location?.locality || null,
      landmark: realEstate?.location?.landmark || null
    }

    const { data: project, error } = await admin
      .from('projects')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

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

    // Automatic Inventory Sync
    try {
      await PropertyService.syncProjectInventory(project, user.id)
    } catch (syncError) {
      console.error('Failed to sync project inventory:', syncError)
    }

    return corsJSON({ project })
  } catch (e) {
    console.error('projects POST error:', e)
    return corsJSON({ error: e.message }, { status: 500 })
  }
}
