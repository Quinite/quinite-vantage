-- Migration: Drop ALL custom triggers on call_logs and their backing functions.
--
-- The 20260430_fix_call_logs_trigger migration tried to drop triggers by
-- matching function name patterns, but missed the actual trigger in production
-- (which has a different function name). This migration takes a nuclear approach:
-- drop every non-internal trigger on call_logs unconditionally, then drop the
-- backing functions by every known naming convention.
--
-- Safe to run multiple times (IF EXISTS / DO block with exception handling).

BEGIN;

-- ── Step 1: Drop every non-internal trigger on call_logs ──────────────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT t.tgname
        FROM pg_trigger t
        WHERE t.tgrelid = 'public.call_logs'::regclass
          AND t.tgisinternal = false
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.call_logs CASCADE', r.tgname);
        RAISE NOTICE 'Dropped trigger on call_logs: %', r.tgname;
    END LOOP;
END $$;

-- ── Step 2: Drop backing functions by every known naming convention ────────────
-- (CASCADE ensures any remaining triggers using these functions are also removed)
DROP FUNCTION IF EXISTS public.increment_lead_total_calls() CASCADE;
DROP FUNCTION IF EXISTS public.update_lead_call_count() CASCADE;
DROP FUNCTION IF EXISTS public.increment_lead_calls() CASCADE;
DROP FUNCTION IF EXISTS public.handle_call_log_insert() CASCADE;
DROP FUNCTION IF EXISTS public.on_call_log_insert() CASCADE;
DROP FUNCTION IF EXISTS public.after_call_log_insert() CASCADE;
DROP FUNCTION IF EXISTS public.update_campaign_call_count() CASCADE;
DROP FUNCTION IF EXISTS public.increment_campaign_calls() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_call_log() CASCADE;
DROP FUNCTION IF EXISTS public.call_log_after_insert() CASCADE;

COMMIT;
