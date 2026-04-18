import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Public-facing endpoint: creates a lead from the website contact form.
// No auth required — uses admin client to bypass RLS.
// Rate-limiting, spam protection etc. can be added here later.

// The default "New Lead" pipeline stage used for all website-sourced leads.
const NEW_LEAD_STAGE_ID = '9a67d6d4-bfeb-4145-8433-523dac75be4f'

// ─── Phone normalizer (mirrors client-side logic) ─────────────────────────────
function normalizePhone(raw) {
    if (!raw) return null
    const digits = raw.replace(/[^\d+]/g, '')
    const stripped = digits.replace(/^\+/, '')

    if (digits.startsWith('+')) return digits              // already international
    if (/^[6-9]\d{9}$/.test(stripped)) return `+91${stripped}` // Indian 10-digit
    if (/^0[6-9]\d{9}$/.test(stripped)) return `+91${stripped.slice(1)}` // STD
    return stripped || null
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { name, mobile, email, message, organization_id } = body

        // ── Validation ────────────────────────────────────────────────────────
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }
        if (!mobile?.trim()) {
            return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 })
        }

        const normalizedMobile = normalizePhone(mobile)
        if (!normalizedMobile || normalizedMobile.replace(/\D/g, '').length < 7) {
            return NextResponse.json({ error: 'Please provide a valid phone number' }, { status: 400 })
        }

        // ── Insert lead ───────────────────────────────────────────────────────
        const admin = createAdminClient()

        const leadData = {
            name: name.trim(),
            mobile: normalizedMobile,
            phone: normalizedMobile, // also populate phone column for agent compatibility
            email: email?.trim() || null,
            notes: message?.trim() || null,
            organization_id: organization_id || null,
            stage_id: NEW_LEAD_STAGE_ID,
            source: 'website',
            score: 0,
            raw_data: {
                submitted_at: new Date().toISOString(),
                form: 'contact_section',
                original_mobile: mobile.trim(),
            },
        }

        const { data, error } = await admin
            .from('leads')
            .insert(leadData)
            .select('id')
            .single()

        if (error) {
            console.error('[/api/leads/public] Insert error:', error)
            return NextResponse.json(
                { error: 'Failed to save your inquiry. Please try again.' },
                { status: 500 }
            )
        }

        return NextResponse.json(
            { success: true, id: data.id },
            { status: 201, headers: { 'Cache-Control': 'no-store' } }
        )

    } catch (err) {
        console.error('[/api/leads/public] Unexpected error:', err)
        return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
    }
}
