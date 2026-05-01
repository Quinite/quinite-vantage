import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasPermission, logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { requireActiveSubscription } from '@/lib/middleware/subscription'

/**
 * POST /api/campaigns/[id]/call
 * Simulate AI calling all leads in a campaign
 */
export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check permission
        const canRun = await hasPermission(supabase, user.id, 'campaign.run')
        if (!canRun) {
            return corsJSON({ error: 'Insufficient permissions' }, { status: 403 })
        }

        // Get user's profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, full_name')
            .eq('id', user.id)
            .single()

        if (!profile?.organization_id) {
            return corsJSON({ error: 'Organization not found' }, { status: 400 })
        }

        const subError = await requireActiveSubscription(profile.organization_id)
        if (subError) return corsJSON(subError, { status: 402 })

        const { id } = await params
        const adminClient = createAdminClient()

        // Get the campaign
        const { data: campaign } = await adminClient
            .from('campaigns')
            .select('*, project:projects!campaigns_project_id_fkey(id, name)')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!campaign) {
            return corsJSON({ error: 'Campaign not found' }, { status: 404 })
        }

        // Get all leads for this campaign's project
        const { data: leads } = await adminClient
            .from('leads')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .eq('project_id', campaign.project_id)

        if (!leads || leads.length === 0) {
            return corsJSON({ error: 'No leads found for this campaign' }, { status: 400 })
        }

        // Simulate calling each lead
        const outcomes = [
            { status: 'called', transferred: false, weight: 30 },
            { status: 'transferred', transferred: true, weight: 25 },
            { status: 'no_answer', transferred: false, weight: 25 },
            { status: 'voicemail', transferred: false, weight: 20 }
        ]

        const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0)
        let totalCalls = 0
        let transferredCalls = 0
        const results = []

        for (const lead of leads) {
            // Random outcome
            const random = Math.random() * totalWeight
            let cumulative = 0
            let selectedOutcome = outcomes[0]

            for (const outcome of outcomes) {
                cumulative += outcome.weight
                if (random <= cumulative) {
                    selectedOutcome = outcome
                    break
                }
            }

            // Update lead interest level from simulated outcome
            if (selectedOutcome.transferred) {
                await adminClient
                    .from('leads')
                    .update({ interest_level: 'high' })
                    .eq('id', lead.id)
            }

            // Insert call log (Required for analytics)
            await adminClient
                .from('call_logs')
                .insert({
                    campaign_id: campaign.id,
                    lead_id: lead.id,
                    call_status: selectedOutcome.status,
                    transferred: selectedOutcome.transferred,
                    duration: Math.floor(Math.random() * 120) + 10,
                    notes: `Simulated: ${selectedOutcome.status}`
                })

            totalCalls++
            if (selectedOutcome.transferred) {
                transferredCalls++
            }

            results.push({
                leadId: lead.id,
                leadName: lead.name,
                outcome: selectedOutcome.status,
                transferred: selectedOutcome.transferred
            })
        }

        // Update campaign stats
        const { data: updatedCampaign } = await adminClient
            .from('campaigns')
            .update({
                total_calls: (campaign.total_calls || 0) + totalCalls,
                transferred_calls: (campaign.transferred_calls || 0) + transferredCalls,
                status: 'completed'
            })
            .eq('id', id)
            .select()
            .single()

        // Audit log
        try {
            await logAudit(
                supabase,
                user.id,
                profile.full_name || user.email,
                'campaign.calls_simulated',
                'campaign',
                id,
                {
                    campaign_name: campaign.name,
                    total_calls: totalCalls,
                    transferred_calls: transferredCalls,
                    conversion_rate: ((transferredCalls / totalCalls) * 100).toFixed(2)
                },
                profile.organization_id
            )
        } catch (auditError) {
            console.error('Audit log error:', auditError)
        }

        return corsJSON({
            campaign: updatedCampaign,
            summary: {
                totalCalls,
                transferredCalls,
                conversionRate: ((transferredCalls / totalCalls) * 100).toFixed(2),
                results
            }
        })
    } catch (e) {
        console.error('campaign call error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
