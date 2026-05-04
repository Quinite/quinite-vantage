-- =============================================================================
-- Migration: Consolidate all call-related DB functions and triggers
-- =============================================================================
--
-- Problems this fixes:
--   1. Two overloaded increment_campaign_stat() functions cause "ambiguous call"
--      errors when invoked with named parameters from the webserver.
--   2. tr_call_logs_stats trigger counted total_calls on INSERT, but the webserver
--      also called increment_campaign_stat('total_calls') — double-counting every call.
--   3. Stale / duplicated function signatures left over from iterative migrations.
--
-- Design after this migration:
--   - tr_call_logs_stats trigger  → owns total_calls (atomic, on INSERT, no app code needed)
--   - increment_campaign_stat RPC → only used for answered_calls and transferred_calls
--   - increment_campaign_credit_spent RPC → atomically tracks credit spend + returns new total
--   - deduct_call_credits RPC     → atomically deducts org balance (enforces >= 0)
--   - update_campaign_sentiment RPC → rolling weighted average of sentiment scores
--   - All functions wrapped in EXCEPTION so no stat failure can break a call flow
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Drop all overloaded / stale versions of every function we own
-- =============================================================================

-- Drop both overloaded increment_campaign_stat signatures (2-arg and 3-arg)
DROP FUNCTION IF EXISTS public.increment_campaign_stat(uuid, text)           CASCADE;
DROP FUNCTION IF EXISTS public.increment_campaign_stat(uuid, text, numeric)  CASCADE;

-- Drop old trigger and its backing function so we can replace cleanly
DROP TRIGGER  IF EXISTS tr_call_logs_stats                ON public.call_logs;
DROP FUNCTION IF EXISTS public.fn_update_call_statistics()                   CASCADE;

-- Drop other functions we are redefining
DROP FUNCTION IF EXISTS public.increment_campaign_credit_spent(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.deduct_call_credits(uuid, numeric)             CASCADE;
DROP FUNCTION IF EXISTS public.update_campaign_sentiment(uuid, numeric)       CASCADE;


-- =============================================================================
-- STEP 2: tr_call_logs_stats — trigger that owns total_calls
--
-- Fires AFTER INSERT on call_logs. Increments campaigns.total_calls by 1.
-- Wrapped in EXCEPTION — a stat failure must never roll back a call_log write.
-- The webserver does NOT call increment_campaign_stat('total_calls') anymore;
-- this trigger handles it atomically at the DB layer.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_call_statistics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.campaign_id IS NOT NULL THEN
        BEGIN
            UPDATE campaigns
            SET    total_calls = COALESCE(total_calls, 0) + 1,
                   updated_at  = NOW()
            WHERE  id = NEW.campaign_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'fn_update_call_statistics: campaign=% err=%', NEW.campaign_id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_call_logs_stats
    AFTER INSERT ON public.call_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_call_statistics();


-- =============================================================================
-- STEP 3: increment_campaign_stat(campaign_uuid, stat_name)
--
-- Called by webserver for: 'answered_calls', 'transferred_calls'.
-- NOT called for 'total_calls' — the trigger handles that.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_campaign_stat(
    campaign_uuid uuid,
    stat_name     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    CASE stat_name
        WHEN 'answered_calls' THEN
            UPDATE campaigns
            SET    answered_calls = COALESCE(answered_calls, 0) + 1,
                   updated_at     = NOW()
            WHERE  id = campaign_uuid;

        WHEN 'transferred_calls' THEN
            UPDATE campaigns
            SET    transferred_calls = COALESCE(transferred_calls, 0) + 1,
                   updated_at        = NOW()
            WHERE  id = campaign_uuid;

        WHEN 'total_calls' THEN
            -- Handled by tr_call_logs_stats trigger. Silently ignore if called by old code.
            RAISE WARNING 'increment_campaign_stat: total_calls is trigger-managed, call ignored';

        ELSE
            RAISE WARNING 'increment_campaign_stat: unknown stat_name "%"', stat_name;
    END CASE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'increment_campaign_stat: campaign=% stat=% err=%', campaign_uuid, stat_name, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(uuid, text) TO service_role;


-- =============================================================================
-- STEP 4: increment_campaign_credit_spent(p_campaign_id, p_amount)
--
-- Atomically adds p_amount to campaigns.credit_spent.
-- Returns the new credit_spent total so the caller can check against credit_cap.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_campaign_credit_spent(
    p_campaign_id uuid,
    p_amount      numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_spent numeric;
BEGIN
    UPDATE campaigns
    SET    credit_spent = COALESCE(credit_spent, 0) + p_amount,
           updated_at   = NOW()
    WHERE  id = p_campaign_id
    RETURNING credit_spent INTO v_new_spent;

    RETURN v_new_spent;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'increment_campaign_credit_spent: campaign=% amount=% err=%', p_campaign_id, p_amount, SQLERRM;
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_campaign_credit_spent(uuid, numeric) TO service_role;


-- =============================================================================
-- STEP 5: deduct_call_credits(org_id, deduction)
--
-- Atomically deducts `deduction` from call_credits.balance.
-- The CHECK constraint (balance >= 0) on the table enforces floor at zero.
-- Clamps to balance if deduction would go negative.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.deduct_call_credits(
    org_id    uuid,
    deduction numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE call_credits
    SET    balance         = GREATEST(0, balance - deduction),
           total_consumed  = COALESCE(total_consumed, 0) + deduction,
           updated_at      = NOW()
    WHERE  organization_id = org_id;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'deduct_call_credits: org=% amount=% err=%', org_id, deduction, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_call_credits(uuid, numeric) TO service_role;


-- =============================================================================
-- STEP 6: update_campaign_sentiment(campaign_uuid, new_score)
--
-- Rolling weighted average: weight existing avg by (total_calls - 1), add new score.
-- Falls back to simple assignment if total_calls = 0 or 1.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_campaign_sentiment(
    campaign_uuid uuid,
    new_score     numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE campaigns
    SET    avg_sentiment_score = CASE
               WHEN total_calls <= 1 OR avg_sentiment_score IS NULL
               THEN new_score
               ELSE ROUND(
                   (COALESCE(avg_sentiment_score, 0) * (total_calls - 1) + new_score) / total_calls,
                   4
               )
           END,
           updated_at = NOW()
    WHERE  id = campaign_uuid;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'update_campaign_sentiment: campaign=% score=% err=%', campaign_uuid, new_score, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_campaign_sentiment(uuid, numeric) TO service_role;


COMMIT;
