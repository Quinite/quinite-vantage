-- Migration 016: Production Data Quality & AI Call Improvements
-- Run this in Supabase SQL editor BEFORE deploying the updated webserver.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FK constraint on leads.call_log_id → call_logs(id)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_call_log_id_fkey;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_call_log_id_fkey
    FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Drop unused conversation_summary column from call_logs
--    (summary is the live field, filled by sentimentService)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.call_logs
  DROP COLUMN IF EXISTS conversation_summary;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Ensure campaign AI columns exist (may already exist in live DB)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS ai_script TEXT,
  ADD COLUMN IF NOT EXISTS call_settings JSONB DEFAULT
    '{"language":"hinglish","voice_id":"shimmer","max_duration":600,"silence_timeout":30}'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Credit deduction RPC — atomic, enforces balance >= 0 via UPDATE WHERE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_call_credits(org_id UUID, deduction NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.call_credits
  SET
    balance       = balance - deduction,
    total_consumed = total_consumed + deduction,
    updated_at    = NOW()
  WHERE organization_id = org_id
    AND balance >= deduction;
  RETURN FOUND;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Campaign stat increment RPC (total_calls, answered_calls, transferred_calls)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_campaign_stat(
  campaign_uuid UUID,
  stat_name     TEXT,
  increment_by  NUMERIC DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.campaigns SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE id = $2',
    stat_name, stat_name
  ) USING increment_by, campaign_uuid;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Campaign running average sentiment score RPC
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_campaign_sentiment(
  campaign_uuid UUID,
  new_score     NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.campaigns
  SET
    avg_sentiment_score = CASE
      WHEN avg_sentiment_score IS NULL THEN new_score
      ELSE ROUND((avg_sentiment_score + new_score) / 2, 2)
    END,
    updated_at = NOW()
  WHERE id = campaign_uuid;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Grant execute permissions
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.deduct_call_credits(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(UUID, TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_campaign_sentiment(UUID, NUMERIC) TO service_role;

-- Also grant to authenticated for RPC calls from frontend if needed
GRANT EXECUTE ON FUNCTION public.deduct_call_credits(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(UUID, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_campaign_sentiment(UUID, NUMERIC) TO authenticated;
