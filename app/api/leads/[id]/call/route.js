import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasPermission, logAudit } from '@/lib/permissions'
import { corsJSON } from '@/lib/cors'
import { makeCall, isPlivoConfigured, validateIndianPhone } from '@/lib/plivo-service'

/**
 * POST /api/leads/[id]/call
 * Make a real AI call to a lead using Plivo + OpenAI
 */
export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return corsJSON({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check permission
        const canEdit = await hasPermission(supabase, user.id, 'leads.edit')
        if (!canEdit) {
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

        const { id } = await params
        const adminClient = createAdminClient()

        // Get the lead
        const { data: lead } = await adminClient
            .from('leads')
            .select('*, project:projects(*)')
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .single()

        if (!lead) {
            return corsJSON({ error: 'Lead not found' }, { status: 404 })
        }

        // Validate phone number
        if (!lead.phone) {
            return corsJSON({ error: 'Lead has no phone number' }, { status: 400 })
        }

        if (!validateIndianPhone(lead.phone)) {
            return corsJSON({ error: 'Invalid Indian phone number format. Use +91XXXXXXXXXX' }, { status: 400 })
        }

        // Check if real calling is enabled
        const enableRealCalling = process.env.ENABLE_REAL_CALLING === 'true'

        if (!enableRealCalling || !isPlivoConfigured()) {
            // Fallback to simulation
            return simulateCall(lead, id, user, profile, adminClient, supabase)
        }

        // Check recording consent
        if (!lead.recording_consent) {
            return corsJSON({ error: 'Lead has not consented to recording' }, { status: 400 })
        }

        // Check calling hours (9 AM - 9 PM IST)
        const now = new Date()
        const hour = now.getHours()
        if (hour < 9 || hour >= 21) {
            return corsJSON({ error: 'Outside calling hours (9 AM - 9 PM)' }, { status: 400 })
        }

        // Make real call via Plivo
        const callSid = await makeCall(lead.phone, lead.id, lead.project_id)

        // Create call log
        const { data: callLog, error: callLogError } = await adminClient
            .from('call_logs')
            .insert({
                campaign_id: null, // Individual call, not part of campaign
                lead_id: lead.id,
                call_sid: callSid,
                call_status: 'initiated',
                transferred: false,
                notes: 'Real AI call initiated'
            })
            .select()
            .single()

        if (callLogError) {
            console.error('Call log error:', callLogError)
        }

        // Update lead
        await adminClient
            .from('leads')
            .update({
                call_status: 'calling',
                call_date: new Date().toISOString()
            })
            .eq('id', id)

        // Audit log
        try {
            await logAudit(
                supabase,
                user.id,
                profile.full_name || user.email,
                'lead.call_initiated',
                'lead',
                id,
                {
                    lead_name: lead.name,
                    call_sid: callSid,
                    phone: lead.phone
                },
                profile.organization_id
            )
        } catch (auditError) {
            console.error('Audit log error:', auditError)
        }

        return corsJSON({
            success: true,
            callSid,
            callLogId: callLog?.id,
            message: 'Call initiated successfully. Status will update via webhooks.'
        })
    } catch (e) {
        console.error('lead call error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}

// Simulation fallback function
async function simulateCall(lead, id, user, profile, adminClient, supabase) {
    const outcomes = [
        { status: 'called', transferred: false, weight: 30 },
        { status: 'transferred', transferred: true, weight: 25 },
        { status: 'no_answer', transferred: false, weight: 25 },
        { status: 'voicemail', transferred: false, weight: 20 }
    ]

    const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0)
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

    await adminClient
        .from('leads')
        .update({
            stage_id: selectedOutcome.transferred ? lead.stage_id : lead.stage_id
        })
        .eq('id', id)

    await logAudit(
        supabase,
        user.id,
        profile.full_name || user.email,
        'lead.call_simulated',
        'lead',
        id,
        {
            lead_name: lead.name,
            call_status: selectedOutcome.status,
            transferred: selectedOutcome.transferred
        },
        profile.organization_id
    )

    return corsJSON({
        simulated: true,
        outcome: {
            status: selectedOutcome.status,
            transferred: selectedOutcome.transferred,
            message: 'Simulated: ' + (selectedOutcome.transferred
                ? 'Lead qualified and transferred!'
                : `Call completed - ${selectedOutcome.status.replace('_', ' ')}`)
        }
    })
}
