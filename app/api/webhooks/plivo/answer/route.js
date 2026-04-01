import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createVoiceInstructions, getVoiceConfig } from '@/lib/openai-voice'

/**
 * POST /api/webhooks/plivo/answer
 * Called when Plivo connects a call
 * Returns XML to stream audio to WebSocket for real-time conversation
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const campaignId = searchParams.get('campaignId')

    // Extract CallUUID from form data (Plivo sends it in POST body)
    let callUUID = searchParams.get('CallUUID') || searchParams.get('callSid')
    try {
      const formData = await request.formData()
      if (!callUUID) {
        callUUID = formData.get('CallUUID') || formData.get('callSid')
      }
    } catch (e) {
      // Ignore missing form data
    }



    // Get lead and campaign details
    const adminClient = createAdminClient()

    const { data: lead } = await adminClient
      .from('leads')
      .select('*, project:projects(*)')
      .eq('id', leadId)
      .single()

    const { data: campaign } = await adminClient
      .from('campaigns')
      .select('*, organization:organizations(*)')
      .eq('id', campaignId)
      .single()

    if (!lead || !campaign) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak>Sorry, there was an error. Goodbye.</Speak>
  <Hangup/>
</Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // CREATE CALL LOG ENTRY
    const { error: logError } = await adminClient
      .from('call_logs')
      .upsert({
        organization_id: campaign.organization_id,
        project_id: lead.project_id,
        campaign_id: campaign.id,
        lead_id: lead.id,
        call_sid: callUUID,
        call_status: 'in-progress',
        direction: 'inbound', // Mark as inbound
        caller_number: request.headers.get('x-plivo-from') || 'unknown',
        callee_number: request.headers.get('x-plivo-to') || 'unknown'
      }, { onConflict: 'call_sid', ignoreDuplicates: true })

    if (logError) {
      console.error('Failed to create call log:', logError)
      // Continue anyway to allow call to proceed, but log error
    } else {
      console.log('Call log created successfully for SID:', callUUID)
    }

    // Check if real-time AI is enabled
    const enableRealtime = process.env.ENABLE_REALTIME_AI === 'true'

    if (enableRealtime && process.env.OPENAI_API_KEY) {
      // REAL-TIME CONVERSATIONAL AI
      
      // 1. Resolve WebSocket Base URL
      // Priority: WEBSOCKET_SERVER_URL > WS_URL > Host-Based Dev Default
      let wsBaseUrl = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL || 
                      process.env.WEBSOCKET_SERVER_URL || 
                      process.env.WS_URL;

      if (!wsBaseUrl) {
        // Fallback for local development if everything is missing
        const host = request.headers.get('host') || 'localhost:3000';
        const hostname = host.split(':')[0];
        wsBaseUrl = `wss://${hostname}:10000`;
        console.warn('⚠️ [Answer Webhook] No WS URL configured. Falling back to:', wsBaseUrl);
      }

      // 2. Ensure Secure Protocol (Plivo requires WSS for external connections)
      if (wsBaseUrl.startsWith('http://')) {
        wsBaseUrl = wsBaseUrl.replace('http://', 'wss://');
      } else if (wsBaseUrl.startsWith('https://')) {
        wsBaseUrl = wsBaseUrl.replace('https://', 'wss://');
      } else if (!wsBaseUrl.startsWith('ws')) {
        wsBaseUrl = `wss://${wsBaseUrl}`;
      }

      // 3. Construct Final Stream URL
      const wsFullUrl = `${wsBaseUrl}/voice/stream?leadId=${leadId}&campaignId=${campaignId}&callSid=${callUUID}`;
      const xmlWsUrl = wsFullUrl.replace(/&/g, '&amp;');
      const statusCallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/plivo/stream-status`;

      console.log(`📡 [Answer Webhook] Routing stream to: ${wsBaseUrl}`);

      // 4. Return Plivo Response XML
      // ADDED: Immediate <Speak> to confirm audio path and reduce "silent start" anxiety
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="Woman">Hello?</Speak>
  <Stream 
    bidirectional="true"
    keepCallAlive="true"
    streamTimeout="86400"
    contentType="audio/x-mulaw;rate=8000"
    statusCallbackUrl="${statusCallbackUrl}"
    statusCallbackMethod="POST"
  >${xmlWsUrl}</Stream>
</Response>`;

      return new NextResponse(xml, {
        headers: { 'Content-Type': 'text/xml' }
      })

    } else {
      // FALLBACK: Simple TTS (no real-time conversation)
      const greeting = `Hello ${lead.name}, this is a representative from ${campaign.organization.name}.`
      const script = campaign.ai_script || 'We wanted to reach out to you regarding our services.'

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak>${greeting}</Speak>
  <Speak>${script}</Speak>
  <Speak>Thank you for your time. Goodbye.</Speak>
  <Hangup/>
</Response>`


      return new NextResponse(xml, {
        headers: { 'Content-Type': 'text/xml' }
      })
    }
  } catch (error) {
    console.error('Answer webhook error:', error)

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak>Sorry, there was an error. Goodbye.</Speak>
  <Hangup/>
</Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
