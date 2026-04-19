import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PROFILE_SELECT = [
    'company', 'job_title', 'industry', 'department',
    'mailing_street', 'mailing_city', 'mailing_state', 'mailing_zip', 'mailing_country',
    'preferred_category', 'preferred_property_type', 'preferred_configuration', 'preferred_transaction_type',
    'preferred_location', 'preferred_timeline', 'min_budget', 'max_budget',
    'pain_points', 'preferred_contact_method', 'best_contact_time',
    'custom_fields',
].join(', ')

const PROFILE_FIELDS = [
    'company', 'job_title', 'industry', 'department',
    'mailing_street', 'mailing_city', 'mailing_state', 'mailing_zip', 'mailing_country',
    'preferred_category', 'preferred_property_type', 'preferred_configuration', 'preferred_transaction_type',
    'preferred_location', 'preferred_timeline', 'min_budget', 'max_budget',
    'pain_points', 'preferred_contact_method', 'best_contact_time',
    'custom_fields',
]

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: lead, error } = await supabase
            .from('leads')
            .select(PROFILE_SELECT)
            .eq('id', id)
            .maybeSingle()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ profile: lead ?? null })
    } catch (error) {
        console.error('Error fetching lead profile:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params
        const body = await request.json()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const updatePayload = {}
        PROFILE_FIELDS.forEach(field => {
            if (body[field] !== undefined) updatePayload[field] = body[field]
        })

        if (Object.keys(updatePayload).length === 0) {
            const { data: current } = await supabase
                .from('leads')
                .select(PROFILE_SELECT)
                .eq('id', id)
                .single()
            return NextResponse.json({ profile: current })
        }

        const { data, error } = await supabase
            .from('leads')
            .update(updatePayload)
            .eq('id', id)
            .select(PROFILE_SELECT)
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ profile: data })
    } catch (error) {
        console.error('Error updating lead profile:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
