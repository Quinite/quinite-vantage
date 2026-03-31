import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 1. Fetch from BOTH tables (Unified Profile)
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select(`
                score, min_budget, max_budget, 
                property_type_interest, sub_category_interest, 
                preferred_bhk, pain_points, competitor_mentions,
                preferred_contact_method, best_contact_time, preferences,
                profile:lead_profiles(*)
            `)
            .eq('id', id)
            .single()

        if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 })

        // 2. Synthesize a single profile object for the UI
        const synthesizedProfile = {
            ...lead.profile, // Demographic
            lead_score: lead.score, // Behavioral
            min_budget: lead.min_budget,
            max_budget: lead.max_budget,
            property_type_interest: lead.property_type_interest,
            sub_category_interest: lead.sub_category_interest,
            preferred_bhk: lead.preferred_bhk,
            pain_points: lead.pain_points,
            competitor_mentions: lead.competitor_mentions,
            preferred_contact_method: lead.preferred_contact_method,
            best_contact_time: lead.best_contact_time,
            preferences: lead.preferences
        }

        return NextResponse.json({ profile: synthesizedProfile })
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

        // [1] Update Leads Table (Behavioral/Sales Context)
        const { error: leadError } = await supabase
            .from('leads')
            .update({
                score: body.lead_score,
                min_budget: body.min_budget,
                max_budget: body.max_budget,
                property_type_interest: body.property_type_interest,
                sub_category_interest: body.sub_category_interest,
                preferred_bhk: body.preferred_bhk,
                pain_points: body.pain_points,
                competitor_mentions: body.competitor_mentions,
                preferred_contact_method: body.preferred_contact_method,
                best_contact_time: body.best_contact_time,
                preferences: body.preferences
            })
            .eq('id', id)

        if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 })

        // [2] Update Lead Profiles Table (Demographic Context)
        const { data: profileData, error: profileError } = await supabase
            .from('lead_profiles')
            .update({
                company: body.company,
                job_title: body.job_title,
                location: body.location,
                industry: body.industry,
                mailing_street: body.mailing_street,
                mailing_city: body.mailing_city,
                mailing_state: body.mailing_state,
                mailing_zip: body.mailing_zip,
                mailing_country: body.mailing_country,
                custom_fields: body.custom_fields
            })
            .eq('lead_id', id)
            .select()
            .single()

        if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

        return NextResponse.json({ profile: profileData })
    } catch (error) {
        console.error('Error updating lead profile:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
