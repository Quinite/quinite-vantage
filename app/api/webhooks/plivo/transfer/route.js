import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
    console.log('🔄 Plivo Transfer Webhook Hit');
    const { searchParams } = new URL(request.url);
    const defaultToNumber = searchParams.get('to');
    const leadId = searchParams.get('leadId');
    const campaignId = searchParams.get('campaignId');

    let transferToNumber = defaultToNumber;
    const supabase = createAdminClient();

    try {
        if (campaignId) {
            const { data: campaign } = await supabase
                .from('campaigns')
                .select('organization_id')
                .eq('id', campaignId)
                .single();

            if (campaign?.organization_id) {
                const { data: employee } = await supabase
                    .from('profiles')
                    .select('phone, full_name')
                    .eq('organization_id', campaign.organization_id)
                    .eq('role', 'employee')
                    .not('phone', 'is', null)
                    .limit(1)
                    .maybeSingle();

                if (employee?.phone) transferToNumber = employee.phone;
            }
        }
    } catch (error) {
        console.error('❌ Error finding dynamic employee:', error);
    }

    if (!transferToNumber) {
        return new NextResponse('<Response><Hangup/></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    // Update DB
    if (leadId) {
        await supabase.from('call_logs').update({ call_status: 'transferred' }).eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1);
        await supabase.from('leads').update({ transferred_to_human: true }).eq('id', leadId);
    }

    // 🕵️ WHISPER LOGIC: Play context to agent before bridging
    const whisperUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/plivo/whisper?leadId=${leadId}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak>Connecting you to a specialist now. Please hold.</Speak>
    <Dial callerId="${process.env.PLIVO_PHONE_NUMBER || ''}">
        <Number url="${whisperUrl}">${transferToNumber}</Number>
    </Dial>
</Response>`;

    return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}
