import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request) {
    const supabase = await createServerSupabaseClient();
    const { leadId, message, campaignId } = await request.json();

    if (!leadId) {
        return Response.json({ error: 'Lead ID required' }, { status: 400 });
    }

    // Get lead details
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('phone, name, organization_id')
        .eq('id', leadId)
        .single();

    if (leadError || !lead) {
        return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get organization for Plivo credentials
    const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', lead.organization_id)
        .single();

    // Use Plivo to send SMS
    const plivo = require('plivo');
    const client = new plivo.Client(
        process.env.PLIVO_AUTH_ID,
        process.env.PLIVO_AUTH_TOKEN
    );

    try {
        // Default message for Indian audience
        const smsMessage = message ||
            `नमस्ते ${lead.name}, हमने आपको कॉल करने की कोशिश की। कृपया हमें वापस कॉल करें या हाँ लिखकर भेजें। - ${org?.settings?.company_name || 'Real Estate Team'}`;

        const response = await client.messages.create(
            process.env.PLIVO_PHONE_NUMBER, // From
            lead.phone, // To
            smsMessage
        );

        console.log('✅ SMS sent:', response);

        // Update lead notes (last_contacted_at removed — computed from call_logs)
        await supabase
            .from('leads')
            .update({ notes: `SMS sent: ${smsMessage.substring(0, 50)}...` })
            .eq('id', leadId);

        return Response.json({
            success: true,
            messageUuid: response.messageUuid
        });
    } catch (error) {
        console.error('❌ SMS error:', error);

        return Response.json({
            error: 'Failed to send SMS',
            details: error.message
        }, { status: 500 });
    }
}
