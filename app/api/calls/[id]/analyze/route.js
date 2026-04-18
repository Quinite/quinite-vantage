import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

/**
 * POST /api/calls/[id]/analyze
 * Manually (re)trigger production-grade sentiment analysis.
 * Standardizes analysis format with the WebSocket server.
 */
export async function POST(request, { params }) {
    try {
        const { id: callId } = await params;
        console.log(`🧠 [Analyze API] Manual re-analysis for call: ${callId}`);

        const adminClient = createAdminClient();

        // 1. FETCH CONTEXT: Get transcript and IDs
        const { data: callLog, error: callError } = await adminClient
            .from('call_logs')
            .select(`
                id, 
                lead_id, 
                campaign_id, 
                organization_id, 
                conversation_transcript, 
                call_sid
            `)
            .eq('id', callId)
            .single();

        if (callError || !callLog) {
            return NextResponse.json({ error: 'Call not found' }, { status: 404 });
        }

        if (!callLog.conversation_transcript || callLog.conversation_transcript.length < 50) {
            return NextResponse.json({ error: 'Transcript too short for analysis' }, { status: 400 });
        }

        // 2. AI ANALYSIS: Match WebSocket server's prompt
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "system",
                content: `You are an expert Indian Real Estate Analyst. Analyze this sales transcript.
                Extract structured insights focused on the lead's intent and budget.
                Return JSON: {
                  "sentiment_score": float (-1 to 1),
                  "sentiment_label": "Positive" | "Neutral" | "Negative",
                  "interest_level": "high" | "medium" | "low" | "none",
                  "summary": "1-sentence conversational summary",
                  "objections": ["list", "of", "objections"],
                  "budget": "estimated budget if mentioned",
                  "priority": float (0-100),
                  "key_takeaways": "bullet points"
                }`
            }, {
                role: "user",
                content: callLog.conversation_transcript
            }],
            response_format: { type: "json_object" },
            temperature: 0
        });

        const analysis = JSON.parse(completion.choices[0].message.content);

        // 3. CONSOLIDATED UPDATE: Update call_logs (Single Source of Truth)
        const { error: updateError } = await adminClient.from('call_logs').update({
            summary: analysis.summary,
            sentiment_score: analysis.sentiment_score,
            sentiment_label: analysis.sentiment_label,
            interest_level: analysis.interest_level,
            ai_metadata: {
                objections: analysis.objections,
                budget_estimated: analysis.budget,
                priority_score: analysis.priority,
                key_takeaways: analysis.key_takeaways,
                manual_analysis_at: new Date().toISOString()
            }
        }).eq('id', callId);

        if (updateError) throw updateError;

        // 4. SYNC LEAD BEHAVIORAL DATA
        if (callLog.lead_id) {
            await adminClient.from('leads').update({
                interest_level: analysis.interest_level,
                score: Math.round(analysis.priority),
                last_sentiment_score: analysis.sentiment_score,
                last_contacted_at: new Date().toISOString()
            }).eq('id', callLog.lead_id);
        }

        return NextResponse.json({
            success: true,
            analysis,
            message: 'Call analysis synchronized successfully'
        });

    } catch (error) {
        console.error('❌ [Analyze API] Error:', error.message);
        return NextResponse.json({ error: 'Analysis engine failure' }, { status: 500 });
    }
}
