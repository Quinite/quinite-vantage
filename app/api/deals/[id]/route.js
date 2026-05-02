import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { withPermission } from '@/lib/middleware/withAuth'
import { DealService } from '@/services/deal.service'
import { firePipelineTrigger, TRIGGER_KEYS } from '@/lib/pipeline-triggers'

function dealStatusToUnitStatus(status) {
    if (status === 'won')      return 'sold'
    if (status === 'lost')     return 'available'
    if (status === 'reserved') return 'reserved'
    return null // interested / negotiation → don't touch unit status
}

/**
 * PATCH /api/deals/[id]
 * Updates deal fields, handles reserved-uniqueness, syncs unit status.
 */
export const PATCH = withPermission('manage_deals', async (request, context) => {
    try {
        const { user, profile } = context
        const { id } = await context.params
        const body = await request.json()
        const { status, amount, notes, lost_reason } = body

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const adminClient = createAdminClient()
        const orgId = profile.organization_id

        const { data: existing, error: fetchErr } = await adminClient
            .from('deals')
            .select('id, unit_id, lead_id, status')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single()

        if (fetchErr || !existing) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
        }

        const updates = {}
        if (status    !== undefined) updates.status     = status
        if (amount    !== undefined) updates.amount     = parseFloat(amount)
        if (notes     !== undefined) updates.notes      = notes
        if (lost_reason !== undefined) updates.lost_reason = lost_reason

        // If reserving this deal, demote any other reserved deal on the same unit
        if (status === 'reserved' && existing.unit_id) {
            await adminClient
                .from('deals')
                .update({ status: 'negotiation', updated_at: new Date().toISOString() })
                .eq('unit_id', existing.unit_id)
                .eq('status', 'reserved')
                .neq('id', id)
                .eq('organization_id', orgId)
        }

        const deal = await DealService.updateDeal(id, updates, orgId, user.id)

        // Sync unit status when deal status changes
        if (status && status !== existing.status && existing.unit_id) {
            const newUnitStatus = dealStatusToUnitStatus(status)

            if (newUnitStatus) {
                const unitUpdate = { status: newUnitStatus, updated_at: new Date().toISOString() }

                if (['reserved', 'won'].includes(status)) {
                    unitUpdate.lead_id = existing.lead_id
                } else if (newUnitStatus === 'available') {
                    // Only clear lead_id if this was the primary lead on the unit
                    const { data: unit } = await adminClient.from('units').select('lead_id').eq('id', existing.unit_id).single()
                    if (unit?.lead_id === existing.lead_id) unitUpdate.lead_id = null
                }

                await adminClient.from('units').update(unitUpdate).eq('id', existing.unit_id)
            }
        }

        // Fire pipeline trigger on terminal deal status changes — non-blocking
        if (status && status !== existing.status) {
            if (status === 'won') {
                firePipelineTrigger(TRIGGER_KEYS.DEAL_WON, existing.lead_id, orgId).catch(() => {})
            } else if (status === 'lost') {
                firePipelineTrigger(TRIGGER_KEYS.DEAL_LOST, existing.lead_id, orgId).catch(() => {})
            }
        }

        return NextResponse.json({ deal })
    } catch (error) {
        console.error('Error in deals PATCH:', error)
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Another deal is already reserved for this unit.' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})

/**
 * DELETE /api/deals/[id]
 * Deletes deal and reverts unit to available if no other active deals exist.
 */
export const DELETE = withPermission('delete_deals', async (request, context) => {
    try {
        const { profile } = context
        const { id } = await context.params

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const adminClient = createAdminClient()
        const orgId = profile.organization_id

        const { data: deal } = await adminClient
            .from('deals')
            .select('unit_id, lead_id, status')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single()

        await DealService.deleteDeal(id, orgId)

        if (deal?.unit_id) {
            // Check remaining active deals for this unit
            const { data: remaining } = await adminClient
                .from('deals')
                .select('id, status')
                .eq('unit_id', deal.unit_id)
                .eq('organization_id', orgId)
                .not('status', 'in', '("lost")')

            if (!remaining || remaining.length === 0) {
                const { data: unit } = await adminClient.from('units').select('lead_id').eq('id', deal.unit_id).single()
                await adminClient.from('units').update({
                    status: 'available',
                    lead_id: null,
                    updated_at: new Date().toISOString(),
                }).eq('id', deal.unit_id)
            } else {
                // If deleted deal was the primary (reserved/won), promote highest-priority remaining deal
                const wasPrimary = ['reserved', 'won'].includes(deal.status)
                if (wasPrimary) {
                    const next = remaining.find(d => d.status === 'negotiation') || remaining[0]
                    if (next) {
                        // Unit goes back to available since no reserved deal remains
                        await adminClient.from('units').update({
                            status: 'available',
                            lead_id: null,
                            updated_at: new Date().toISOString(),
                        }).eq('id', deal.unit_id)
                    }
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in deals DELETE:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})
