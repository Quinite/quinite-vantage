-- Migration: Fix tr_call_logs_stats trigger on call_logs
--
-- The trigger fn_update_call_statistics fires on call_logs INSERT and tries to
-- UPDATE campaigns.total_calls, but that column didn't exist in production until
-- 20260501_campaigns_call_stats_columns.sql added it. Now that the column exists,
-- the trigger should work — but we're replacing it with a safer version that:
--   1. Uses COALESCE to handle NULLs
--   2. Wraps in EXCEPTION so a stat failure never rolls back a call_log INSERT
--   3. Drops the old function cleanly

BEGIN;

DROP TRIGGER IF EXISTS tr_call_logs_stats ON public.call_logs;
DROP FUNCTION IF EXISTS public.fn_update_call_statistics() CASCADE;

CREATE OR REPLACE FUNCTION public.fn_update_call_statistics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    BEGIN
        UPDATE campaigns
        SET total_calls = COALESCE(total_calls, 0) + 1,
            updated_at  = NOW()
        WHERE id = NEW.campaign_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'fn_update_call_statistics: failed to update campaigns (id=%): %', NEW.campaign_id, SQLERRM;
    END;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_call_logs_stats
    AFTER INSERT ON public.call_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_call_statistics();

COMMIT;
