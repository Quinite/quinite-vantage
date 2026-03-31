import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
    console.log('🕵️ Whisper Post Answer Hit');
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    const supabase = createAdminClient();
    let whisperText = "Connecting you to a sales lead now.";

    if (leadId) {
        const { data: lead } = await supabase
            .from('leads')
            .select('name, preferred_bhk')
            .eq('id', leadId)
            .single();

        if (lead) {
            whisperText = `Connecting you to ${lead.name}. They are interested in ${lead.preferred_bhk || 'our property'}. Please be ready!`;
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak>${whisperText}</Speak>
</Response>`;

    return new NextResponse(xml, { 
        headers: { 'Content-Type': 'text/xml' } 
    });
}
