import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { normalizeLead } from '@/lib/lead-normalization'

/**
 * Lead Ingestion API
 * Accepts leads from external sources (webhooks, CSV uploads, etc.)
 * 
 * @route POST /api/leads/ingest
 */
export async function POST(req) {
    try {
        // Parse request body
        let body
        try {
            body = await req.json()
        } catch (parseError) {
            return NextResponse.json({
                success: false,
                error: 'Invalid JSON',
                message: 'The request body must be valid JSON. Please check your payload format.',
                hint: 'Ensure your Content-Type header is set to application/json'
            }, { status: 400 })
        }

        const { source, data, secret, map_project_id } = body

        // Validate required fields
        if (!source) {
            return NextResponse.json({
                success: false,
                error: 'Missing Source',
                message: 'The "source" field is required to identify where the lead came from.',
                hint: 'Valid sources: magicbricks, 99acres, facebook, csv'
            }, { status: 400 })
        }

        if (!data) {
            return NextResponse.json({
                success: false,
                error: 'Missing Data',
                message: 'No lead data provided. Please include lead information in the "data" field.'
            }, { status: 400 })
        }

        // Security Check - Webhook Secret or Authenticated Session
        const EXPECTED_SECRET = process.env.INGESTION_SECRET || 'vantage-secret-key'
        let currentOrgId = null // [NEW] Context for project lookup

        if (secret !== EXPECTED_SECRET) {
            // Check if user is authenticated (for internal CSV uploads)
            try {
                const supabase = await createServerSupabaseClient()
                const { data: { user }, error: authError } = await supabase.auth.getUser()

                if (authError || !user) {
                    return NextResponse.json({
                        success: false,
                        error: 'Unauthorized',
                        message: 'Authentication failed. Please provide a valid webhook secret or sign in.',
                        hint: 'Add "secret" parameter to your request or ensure you are logged in'
                    }, { status: 401 })
                }

                // Fetch user's org for context
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                )
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single()

                if (profile) currentOrgId = profile.organization_id

            } catch (authCheckError) {
                return NextResponse.json({
                    success: false,
                    error: 'Authentication Error',
                    message: 'Unable to verify authentication. Please try again.'
                }, { status: 401 })
            }
        }

        // Initialize Admin Client to bypass RLS for ingestion
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Cache for lookup
        const projectOrgMap = new Map()
        const projectStageMap = new Map()
        const projectNameMap = new Map() // [NEW] Name -> ID cache

        // Process leads (single or bulk)
        const items = Array.isArray(data) ? data : [data]
        const processedLeads = []
        const errors = []

        console.log(`📥 [Lead Ingest] Processing ${items.length} lead(s) from source: ${source}`)

        for (let i = 0; i < items.length; i++) {
            const item = items[i]

            try {
                // Override project ID if provided
                if (map_project_id) {
                    item.project_id = map_project_id
                }

                // Normalize lead data based on source
                const standardized = normalizeLead(source, item)

                // [NEW] Attempt to resolve Project Name to ID if ID is missing and we have Org context
                if (!standardized.project_id && currentOrgId) {
                    // Look for project name keys flexibly
                    const pKeys = Object.keys(item).filter(k => k.toLowerCase().includes('project'))
                    let pName = null
                    for (const k of pKeys) {
                        if (item[k]) { pName = item[k]; break; }
                    }

                    if (pName) {
                        // Check cache
                        let pid = projectNameMap.get(pName.toLowerCase())

                        // DB Lookup if not in cache
                        if (!pid) {
                            const { data: foundProjects } = await supabaseAdmin
                                .from('projects')
                                .select('id')
                                .eq('organization_id', currentOrgId)
                                .ilike('name', pName.trim())
                                .limit(1)

                            if (foundProjects?.length > 0) {
                                pid = foundProjects[0].id
                                projectNameMap.set(pName.toLowerCase(), pid)
                            }
                        }

                        if (pid) standardized.project_id = pid
                    }
                }

                // Validate required fields
                if (!standardized.phone) {
                    errors.push({
                        index: i,
                        item: item,
                        error: 'Missing Phone Number',
                        message: 'Phone number is required for all leads'
                    })
                    continue
                }

                if (!standardized.project_id) {
                    errors.push({
                        index: i,
                        item: item,
                        error: 'Missing Project ID',
                        message: 'Could not determine which project this lead belongs to. Please ensure the Project Name matches exactly or select a project before upload.',
                        hint: `Found data: ${JSON.stringify(item)}`
                    })
                    continue
                }

                // Fetch Organization ID for the project
                let orgId = projectOrgMap.get(standardized.project_id)
                if (!orgId) {
                    const { data: project, error: projError } = await supabaseAdmin
                        .from('projects')
                        .select('organization_id')
                        .eq('id', standardized.project_id)
                        .single()

                    if (projError || !project) {
                        errors.push({
                            index: i,
                            item: item,
                            error: 'Invalid Project',
                            message: `Could not find project with ID: ${standardized.project_id}`
                        })
                        continue
                    }
                    orgId = project.organization_id
                    projectOrgMap.set(standardized.project_id, orgId)
                }

                // Fetch Default Stage (Org -> Pipeline -> Stage)
                let stageId = projectStageMap.get(standardized.project_id)
                if (stageId === undefined) {
                    try {
                        // 1. Get default pipeline for this Organization
                        const { data: pipelines } = await supabaseAdmin
                            .from('pipelines')
                            .select('id')
                            .eq('organization_id', orgId)
                            .eq('is_default', true)
                            .limit(1)

                        let pipelineId = pipelines?.[0]?.id

                        // Fallback: If no default, just take the first one
                        if (!pipelineId) {
                            const { data: allPipelines } = await supabaseAdmin
                                .from('pipelines')
                                .select('id')
                                .eq('organization_id', orgId)
                                .limit(1)
                            pipelineId = allPipelines?.[0]?.id
                        }

                        if (pipelineId) {
                            // 2. Get first stage of that pipeline
                            const { data: stages } = await supabaseAdmin
                                .from('pipeline_stages')
                                .select('id')
                                .eq('pipeline_id', pipelineId)
                                .order('order_index', { ascending: true })
                                .limit(1)

                            if (stages && stages.length > 0) {
                                stageId = stages[0].id
                                projectStageMap.set(standardized.project_id, stageId)
                            } else {
                                projectStageMap.set(standardized.project_id, null)
                            }
                        } else {
                            projectStageMap.set(standardized.project_id, null)
                        }
                    } catch (e) {
                        projectStageMap.set(standardized.project_id, null)
                    }
                }

                // Upsert lead into database using Admin Client
                const { data: inserted, error: dbError } = await supabaseAdmin
                    .from('leads')
                    .upsert({
                        name: standardized.name || 'Unknown',
                        phone: standardized.phone,
                        email: standardized.email,
                        project_id: standardized.project_id,
                        organization_id: orgId, // CRITICAL: Explicitly set organization_id
                        stage_id: stageId || null,
                        source: standardized.lead_source || source,
                        external_lead_id: standardized.external_lead_id,
                        raw_data: standardized.raw_data || item,

                    }, { onConflict: 'phone, project_id' })
                    .select()
                    .single()

                if (dbError) {
                    // Handle specific database errors
                    if (dbError.code === '23503') {
                        errors.push({
                            index: i,
                            item: item,
                            error: 'Invalid Reference',
                            message: 'Referenced project or organization does not exist'
                        })
                    } else if (dbError.code === '23505') {
                        // Duplicate - this is actually OK for upsert, but log it
                        console.log(`ℹ️  [Lead Ingest] Duplicate lead updated: ${standardized.phone}`)
                        processedLeads.push({ phone: standardized.phone, status: 'updated' })
                    } else {
                        throw dbError
                    }
                } else {
                    processedLeads.push(inserted)
                    console.log(`✅ [Lead Ingest] Lead processed: ${inserted.name} (${inserted.phone})`)
                }

            } catch (itemError) {
                console.error(`❌ [Lead Ingest] Error processing lead ${i}:`, itemError)
                errors.push({
                    index: i,
                    item: item,
                    error: 'Processing Failed',
                    message: itemError.message || 'An unexpected error occurred while processing this lead',
                    details: process.env.NODE_ENV === 'development' ? itemError.stack : undefined
                })
            }
        }

        // Return comprehensive response
        const response = {
            success: processedLeads.length > 0,
            summary: {
                total: items.length,
                processed: processedLeads.length,
                failed: errors.length
            },
            leads: processedLeads.length > 0 ? processedLeads : undefined,
            errors: errors.length > 0 ? errors : undefined,
            message: errors.length === 0
                ? `Successfully processed ${processedLeads.length} lead(s)`
                : `Processed ${processedLeads.length} lead(s), ${errors.length} failed`
        }

        const statusCode = errors.length === items.length ? 400 : 200

        console.log(`📊 [Lead Ingest] Complete: ${processedLeads.length} success, ${errors.length} failed`)

        return NextResponse.json(response, { status: statusCode })

    } catch (error) {
        console.error('💥 [Lead Ingest] Fatal Error:', error)

        return NextResponse.json({
            success: false,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while processing your request',
            hint: 'Please contact support if this issue persists',
            details: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack
            } : undefined
        }, { status: 500 })
    }
}
