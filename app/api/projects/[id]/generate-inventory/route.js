import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/projects/[id]/generate-inventory
 * Bulk generate units for a tower
 */
export async function POST(req, { params }) {
    try {
        const { id: projectId } = await params
        const body = await req.json()
        const {
            tower_id,
            config_id,
            startFloor,
            endFloor,
            unitsPerFloor,
            namingPattern = '{tower}-{floor}{unit}'
        } = body

        if (!projectId || !tower_id || !config_id) {
            return corsJSON({ error: 'Missing required project, tower, or configuration ID' }, { status: 400 })
        }

        const adminClient = createAdminClient()

        // 1. Fetch Project & Tower validation
        const { data: projectData, error: projectError } = await adminClient
            .from('projects')
            .select('organization_id, total_units')
            .eq('id', projectId)
            .single()

        if (projectError || !projectData) {
            return corsJSON({ error: 'Project not found' }, { status: 404 })
        }

        const { data: towerData, error: towerError } = await adminClient
            .from('towers')
            .select('name')
            .eq('id', tower_id)
            .single()

        if (towerError || !towerData) {
            return corsJSON({ error: 'Tower not found' }, { status: 404 })
        }

        // 2. Fetch Configuration details
        const { data: config, error: configError } = await adminClient
            .from('unit_configs')
            .select('*')
            .eq('id', config_id)
            .single()

        if (configError || !config) {
            return corsJSON({ error: 'Configuration not found' }, { status: 404 })
        }

        // 3. Check existing units count
        const { count: currentUnitCount, error: countError } = await adminClient
            .from('units')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)

        if (countError) {
            console.error('Error fetching unit count:', countError)
            return corsJSON({ error: 'Failed to validate unit limits' }, { status: 500 })
        }

        const startF = parseInt(startFloor || 1)
        const endF = parseInt(endFloor || 1)
        const unitsPerF = parseInt(unitsPerFloor || 1)
        const totalNewUnits = (endF - startF + 1) * unitsPerF

        if (currentUnitCount + totalNewUnits > (projectData.total_units || 0)) {
            return corsJSON({
                error: `Cannot generate ${totalNewUnits} units. Project limit is ${projectData.total_units} units, and you already have ${currentUnitCount}.`
            }, { status: 400 })
        }

        // 4. Generate Units payload
        const newUnits = []
        for (let f = startF; f <= endF; f++) {
            for (let u = 1; u <= unitsPerF; u++) {
                const unitNumStr = u.toString().padStart(2, '0')
                const unitNumber = `${f}${unitNumStr}`
                
                newUnits.push({
                    organization_id: projectData.organization_id,
                    project_id: projectId,
                    tower_id: tower_id,
                    config_id: config_id,
                    floor_number: Number(f),
                    unit_number: unitNumber,
                    status: 'available',
                    
                    // Inherit from config
                    transaction_type: config.transaction_type || 'sell',
                    base_price: config.base_price || 0,
                    total_price: config.base_price || 0,
                    carpet_area: config.carpet_area || 0,
                    built_up_area: config.builtup_area || 0,
                    super_built_up_area: config.super_builtup_area || 0,
                    plot_area: config.plot_area || 0,
                    bedrooms: config.bedrooms || 0,
                    bathrooms: config.bathrooms || 0,
                    balconies: config.balconies || 0,
                    facing: config.facing || null,
                    
                    construction_status: 'under_construction',
                    created_at: new Date().toISOString()
                })
            }
        }

        if (newUnits.length === 0) {
            return corsJSON({ error: 'No units generated. Check your floor parameters.' }, { status: 400 })
        }

        // 5. Bulk Insert
        const { data, error: insertError } = await adminClient
            .from('units')
            .insert(newUnits)
            .select()

        if (insertError) {
            console.error('Bulk generate insert error:', insertError)
            return corsJSON({ error: insertError.message }, { status: 500 })
        }

        return corsJSON({
            success: true,
            count: data.length,
            message: `Successfully generated ${data.length} units for ${towerData.name}`
        })

    } catch (e) {
        console.error('Generate inventory endpoint error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
