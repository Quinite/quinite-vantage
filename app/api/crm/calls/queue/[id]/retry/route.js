
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
    const supabase = await createServerSupabaseClient()
    const { id } = await params
    const { reason } = await request.json()

    if (!id) {
        return NextResponse.json({ error: 'Queue ID is required' }, { status: 400 })
    }

    if (!reason) {
        return NextResponse.json({ error: 'Retry reason is required' }, { status: 400 })
    }

    try {
        // Fetch current queue item to get metadata and attempt counts
        const { data: currentItem, error: fetchError } = await supabase
            .from('call_queue')
            .select('metadata, attempt_count, max_attempts')
            .eq('id', id)
            .single()

        if (fetchError) throw fetchError

        const currentMetadata = currentItem.metadata || {}
        const retryHistory = currentMetadata.manual_retry_history || []

        const newRetryEntry = {
            reason,
            at: new Date().toISOString(),
            previous_attempts: currentItem.attempt_count
        }

        const newMetadata = {
            ...currentMetadata,
            manual_retry_history: [newRetryEntry, ...retryHistory],
            last_manual_retry_reason: reason
        }

        // Logic:
        // Reset status to 'queued' so it gets picked up immediately.
        // Update next_retry_at to NOW().
        // Regarding attempt_count: 
        // If we want it to be retried, we should ensure attempt_count < max_attempts.
        // If it failed because max_attempts was reached, just resetting status to 'queued' might cause it to fail again immediately if the processor checks `attempt_count >= max_attempts`.
        // So we should increment max_attempts to allow one more try.

        const newMaxAttempts = (currentItem.attempt_count >= currentItem.max_attempts)
            ? currentItem.attempt_count + 1
            : currentItem.max_attempts

        const { data, error } = await supabase
            .from('call_queue')
            .update({
                status: 'queued',
                next_retry_at: new Date().toISOString(),
                metadata: newMetadata,
                max_attempts: newMaxAttempts,
                // Optional: Reset last_error so it doesn't look like it failed yet? 
                // Keeping last_error is fine as history.
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error retrying call:', error)
        return NextResponse.json({ error: 'Failed to retry call' }, { status: 500 })
    }
}
