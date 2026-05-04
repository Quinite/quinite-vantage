-- Fix campaign auto-complete firing prematurely when retries are still pending.
-- The trigger previously checked only campaign_leads status, but a failed lead
-- with retries remaining still has a call_queue row with attempt_count < 4.
-- We now also check call_queue for any retriable rows before completing.

CREATE OR REPLACE FUNCTION public.fn_check_campaign_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_campaign      RECORD;
    v_pending_count INTEGER;
    v_retry_count   INTEGER;
BEGIN
    -- Only care about actual status changes
    IF OLD.status = NEW.status THEN RETURN NEW; END IF;

    -- Only trigger on terminal transitions
    IF NEW.status NOT IN ('called', 'failed', 'skipped', 'opted_out', 'archived') THEN
        RETURN NEW;
    END IF;

    -- Fetch campaign (lock row to prevent race)
    SELECT id, status, auto_complete
    INTO v_campaign
    FROM public.campaigns
    WHERE id = NEW.campaign_id
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Only auto-complete running campaigns with the flag enabled
    IF v_campaign.status != 'running' OR NOT v_campaign.auto_complete THEN
        RETURN NEW;
    END IF;

    -- Count leads still in flight in campaign_leads
    SELECT COUNT(*) INTO v_pending_count
    FROM public.campaign_leads
    WHERE campaign_id = NEW.campaign_id
      AND status IN ('enrolled', 'queued', 'calling');

    IF v_pending_count > 0 THEN RETURN NEW; END IF;

    -- Also check call_queue for leads that still have retries remaining.
    -- A failed lead may have campaign_leads.status = 'failed' but the queue
    -- worker hasn't retried yet (attempt_count < 4, next_retry_at in future).
    SELECT COUNT(*) INTO v_retry_count
    FROM public.call_queue
    WHERE campaign_id = NEW.campaign_id
      AND status IN ('queued', 'failed', 'processing')
      AND attempt_count < 4;

    IF v_retry_count > 0 THEN
        RETURN NEW;
    END IF;

    -- Nothing pending and no retries left — mark campaign completed
    UPDATE public.campaigns
    SET
        status              = 'completed',
        completed_at        = now(),
        updated_at          = now(),
        total_calls         = (
            SELECT COUNT(*) FROM public.call_logs
            WHERE campaign_id = NEW.campaign_id
        ),
        answered_calls      = (
            SELECT COUNT(*) FROM public.call_logs
            WHERE campaign_id = NEW.campaign_id
              AND call_status IN ('called', 'completed')
        ),
        transferred_calls   = (
            SELECT COUNT(*) FROM public.call_logs
            WHERE campaign_id = NEW.campaign_id
              AND transferred = true
        ),
        avg_sentiment_score = (
            SELECT AVG(sentiment_score) FROM public.call_logs
            WHERE campaign_id = NEW.campaign_id
              AND sentiment_score IS NOT NULL
        )
    WHERE id = NEW.campaign_id;

    RETURN NEW;
END;
$$;
