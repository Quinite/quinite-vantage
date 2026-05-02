import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { withPermission } from '@/lib/middleware/withAuth'
import { DealService } from '@/services/deal.service'
import { firePipelineTrigger, TRIGGER_KEYS } from '@/lib/pipeline-triggers'

function dealStatusToUnitStatus(status) {
    if (status === 'won')  return 'sold'
    if (status === 'lost') return 'available'
    if (status === 'reserved') return 'reserved'
    return null // interested / negotiation → don't change unit status
}

/**
 * POST /api/deals
 * Creates a deal and syncs unit + lead state.
 * If status is 'reserved', any existing reserved deal on that unit is demoted to 'negotiation' first.
 */
export const POST = withPermission('manage_deals', async (request, context) => {
    try {
        const { user, profile } = context
        const body = await request.json()
        const { lead_id, unit_id, project_id, amount, status, notes, interest_source, site_visit_id, name, title } = body

        if (!lead_id) {
            return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
        }
        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const adminClient = createAdminClient()
        const orgId = profile.organization_id
        const dealStatus = status || 'interested'

        // If reserving, demote any existing reserved deal for this unit first
        if (dealStatus === 'reserved' && unit_id) {
            await adminClient
                .from('deals')
                .update({ status: 'negotiation', updated_at: new Date().toISOString() })
                .eq('unit_id', unit_id)
                .eq('status', 'reserved')
                .eq('organization_id', orgId)
        }

        // Auto-generate name if not provided
        let dealName = name || title
        if (!dealName) {
            const [leadRes, unitRes] = await Promise.all([
                adminClient.from('leads').select('name').eq('id', lead_id).single(),
                unit_id ? adminClient.from('units').select('unit_number').eq('id', unit_id).single() : Promise.resolve({ data: null }),
            ])
            dealName = unitRes.data
                ? `${leadRes.data?.name || 'Lead'} — ${unitRes.data.unit_number || 'Unit'}`
                : (leadRes.data?.name || 'Deal')
        }

        const deal = await DealService.createDeal(
            { lead_id, unit_id, project_id, amount: amount ? parseFloat(amount) : null, status: dealStatus, notes, interest_source, site_visit_id, name: dealName },
            orgId,
            user.id
        )

        // Sync unit status and units.lead_id
        if (unit_id) {
            const newUnitStatus = dealStatusToUnitStatus(dealStatus)
            if (newUnitStatus) {
                await adminClient
                    .from('units')
                    .update({
                        status: newUnitStatus,
                        lead_id: ['reserved', 'won'].includes(dealStatus) ? lead_id : null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', unit_id)
            }

            // Set project on lead if not already set
            const { data: unitData } = await adminClient.from('units').select('project_id').eq('id', unit_id).single()
            if (unitData?.project_id) {
                await adminClient.from('leads').update({ project_id: unitData.project_id }).eq('id', lead_id).is('project_id', null)
            }
        } else if (project_id) {
            await adminClient.from('leads').update({ project_id }).eq('id', lead_id).is('project_id', null)
        }

        // Fire pipeline trigger — non-blocking
        firePipelineTrigger(TRIGGER_KEYS.DEAL_CREATED, lead_id, orgId).catch(() => {})

        return NextResponse.json({ deal })
    } catch (error) {
        console.error('Error in deals POST:', error)
        if (error.code === '23505') {
            return NextResponse.json({ error: 'A deal already exists for this lead and unit.' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})
