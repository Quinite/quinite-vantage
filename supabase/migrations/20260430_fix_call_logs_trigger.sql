-- Migration: fix call_logs INSERT failure caused by orphaned trigger
--
-- Background: 20260419_full_revamp_cleanup.sql dropped leads.total_calls, but a trigger
-- on call_logs still tries to UPDATE leads SET total_calls = ..., causing every
-- call_logs INSERT to fail with "column total_calls does not exist".
-- This migration drops that trigger and also creates the increment_campaign_stat RPC
-- used by the webserver to update campaign call counters.

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 1: Drop any trigger on call_logs that references a function which
--         touches the now-removed leads.total_calls column.
--         We target by function name pattern to avoid removing unrelated triggers.
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT t.tgname
        FROM pg_trigger t
        JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE t.tgrelid = 'public.call_logs'::regclass
          AND t.tgisinternal = false
          AND (
              p.proname ILIKE '%total_calls%'
           OR p.proname ILIKE '%lead_call%'
           OR p.proname ILIKE '%increment_lead%'
           OR p.proname ILIKE '%update_lead_call%'
          )
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.call_logs', r.tgname);
        RAISE NOTICE 'Dropped orphaned trigger on call_logs: %', r.tgname;
    END LOOP;
END $$;

-- Also drop the underlying functions if they exist (CASCADE cleans up any remaining triggers)
DROP FUNCTION IF EXISTS public.increment_lead_total_calls() CASCADE;
DROP FUNCTION IF EXISTS public.update_lead_call_count() CASCADE;
DROP FUNCTION IF EXISTS public.increment_lead_calls() CASCADE;
DROP FUNCTION IF EXISTS public.handle_call_log_insert() CASCADE;

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 2: Create increment_campaign_stat RPC used by the webserver
--         to increment total_calls and answered_calls on campaigns.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_campaign_stat(
    campaign_uuid UUID,
    stat_name     TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    CASE stat_name
        WHEN 'total_calls' THEN
            UPDATE campaigns
            SET total_calls = COALESCE(total_calls, 0) + 1,
                updated_at  = NOW()
            WHERE id = campaign_uuid;

        WHEN 'answered_calls' THEN
            UPDATE campaigns
            SET answered_calls = COALESCE(answered_calls, 0) + 1,
                updated_at      = NOW()
            WHERE id = campaign_uuid;

        WHEN 'transferred_calls' THEN
            UPDATE campaigns
            SET transferred_calls = COALESCE(transferred_calls, 0) + 1,
                updated_at         = NOW()
            WHERE id = campaign_uuid;

        ELSE
            RAISE WARNING 'increment_campaign_stat: unknown stat_name "%"', stat_name;
    END CASE;
EXCEPTION WHEN OTHERS THEN
    -- Non-fatal — stats are nice-to-have; never block a call log write
    RAISE WARNING 'increment_campaign_stat failed (campaign=%, stat=%): %',
        campaign_uuid, stat_name, SQLERRM;
END;
$$;

-- Allow service role (used by webserver) to call the function
GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(UUID, TEXT) TO service_role;

COMMIT;
