
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'
import { formatIndianMobile } from '@/lib/utils'

// POST /api/forms/submit - Public submission
export async function POST(request) {
    try {
        const body = await request.json()
        const { formId, data } = body

        if (!formId || !data) {
            return corsJSON({ error: 'Missing form data' }, { status: 400 })
        }

        const adminClient = createAdminClient()

        // 1. Fetch Form Definition
        const { data: form, error: formError } = await adminClient
            .from('lead_forms')
            .select('organization_id, project_id, schema')
            .eq('id', formId)
            .single()

        if (formError || !form) {
            return corsJSON({ error: 'Invalid form' }, { status: 404 })
        }

        // 2. Map data to Lead fields
        // Schema items have 'id' and 'type'. Data keys are the item IDs.
        // We need to map standard fields (name, email, phone) if possible.
        // Or store everything in raw_data/notes if not standard.

        // Simple mapping based on field label or type from schema
        let leadData = {
            name: '',
            email: null,
            phone: null,
            notes: '',
            raw_data: data
        }

        const schema = form.schema || []
        schema.forEach(field => {
            const value = data[field.id]
            if (!value) return

            const label = field.label.toLowerCase()

            if (field.type === 'text' && (label.includes('name') || label.includes('full name'))) {
                leadData.name = value
            } else if (field.type === 'email') {
                leadData.email = value
            } else if (field.type === 'phone') {
                leadData.phone = formatIndianMobile(value)
            } else {
                leadData.notes += `${field.label}: ${value}\n`
            }
        })

        // Fallback: If no name found, use "Web Form Lead"
        if (!leadData.name) leadData.name = 'Web Form Lead'

        // 3. Auto-assign Stage
        let stageId = null
        try {
                // Determine organization default pipeline stage
                const { data: pipelines } = await adminClient
                    .from('pipelines')
                    .select('id')
                    .eq('organization_id', form.organization_id)
                    .eq('is_default', true)
                    .limit(1)

                let pipelineId = pipelines?.[0]?.id

                // Fallback pipeline
                if (!pipelineId) {
                    const { data: allPipelines } = await adminClient
                        .from('pipelines')
                        .select('id')
                        .eq('organization_id', form.organization_id)
                        .limit(1)
                    pipelineId = allPipelines?.[0]?.id
                }

                if (pipelineId) {
                    const { data: stages } = await adminClient
                        .from('pipeline_stages')
                        .select('id')
                        .eq('pipeline_id', pipelineId)
                        .order('order_index', { ascending: true })
                        .limit(1)

                    if (stages?.length > 0) stageId = stages[0].id
                }
        } catch (e) {
            console.warn('Defaults fetch error', e)
        }

        // 4. Create Lead
        const { data: lead, error: insertError } = await adminClient
            .from('leads')
            .insert({
                organization_id: form.organization_id,
                project_id: form.project_id,
                stage_id: stageId,
                name: leadData.name,
                email: leadData.email,
                phone: leadData.phone,
                notes: leadData.notes.trim(),
                source: 'web_form',
                raw_data: { form_id: formId, submission: data }
            })
            .select()
            .single()

        if (insertError) throw insertError

        return corsJSON({ success: true, leadId: lead.id })

    } catch (e) {
        console.error('Submission error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
