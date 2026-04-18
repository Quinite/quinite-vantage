
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * Maps deal status → inventory unit status
 */
function dealStatusToUnitStatus(dealStatus) {
    const s = (dealStatus || '').toLowerCase()
    if (s === 'won' || s === 'closed' || s === 'closed won') return 'sold'
    if (s === 'lost') return 'available'
    return 'reserved'
}

/**
 * PATCH /api/deals/[id]
 * Update deal status and auto-sync the linked property's inventory status
 */
export async function PATCH(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const { id } = await params
        const body = await request.json()
        const { status, amount, close_date, name } = body

        // Build update payload
        const updatePayload = { updated_at: new Date().toISOString() }
        if (status !== undefined) updatePayload.status = status
        if (amount !== undefined) updatePayload.amount = parseFloat(amount)
        if (close_date !== undefined) updatePayload.close_date = close_date
        if (name !== undefined) updatePayload.name = name

        // Fetch existing deal to get unit_id and lead_id
        const { data: existingDeal, error: fetchError } = await adminClient
            .from('deals')
            .select('id, unit_id, lead_id, status')
            .eq('id', id)
            .single()

        if (fetchError || !existingDeal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
        }

        // Update the deal
        const { data: updatedDeal, error: updateError } = await adminClient
            .from('deals')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (updateError) throw updateError

        // ✅ Auto-sync inventory unit status when deal status changes
        if (status && status !== existingDeal.status && existingDeal.unit_id) {
            const newUnitStatus = dealStatusToUnitStatus(status)

            await adminClient
                .from('units')
                .update({ status: newUnitStatus, updated_at: new Date().toISOString() })
                .eq('id', existingDeal.unit_id)

            // If deal is lost → remove the unit link from the lead
            if (newUnitStatus === 'available' && existingDeal.lead_id) {
                await adminClient
                    .from('leads')
                    .update({ unit_id: null })
                    .eq('id', existingDeal.lead_id)
                    .eq('unit_id', existingDeal.unit_id)
            }
        }

        return NextResponse.json({ deal: updatedDeal })

    } catch (error) {
        console.error('Error in deals PATCH:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * DELETE /api/deals/[id]
 */
export async function DELETE(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const { id } = await params

        // Fetch the deal to get unit_id before deleting
        const { data: deal } = await adminClient
            .from('deals')
            .select('unit_id, lead_id')
            .eq('id', id)
            .single()

        const { error } = await adminClient
            .from('deals')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting deal:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // If the deleted deal had a unit, check if any other active deals exist for it
        if (deal?.unit_id) {
            const { data: remainingDeals } = await adminClient
                .from('deals')
                .select('id, status')
                .eq('unit_id', deal.unit_id)
                .neq('status', 'lost')

            if (!remainingDeals || remainingDeals.length === 0) {
                // No more active deals → mark unit as available
                await adminClient
                    .from('units')
                    .update({ status: 'available', updated_at: new Date().toISOString() })
                    .eq('id', deal.unit_id)

                // Unlink from lead too
                if (deal.lead_id) {
                    await adminClient
                        .from('leads')
                        .update({ unit_id: null })
                        .eq('id', deal.lead_id)
                        .eq('unit_id', deal.unit_id)
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in deals DELETE:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
