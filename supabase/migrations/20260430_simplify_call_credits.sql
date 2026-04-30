-- ---------------------------------------------------------------------------
-- Migration: Simplify call_credits — remove monthly tracking columns
--
-- Before: two pools (monthly_balance resets each cycle + balance = purchased)
-- After:  single balance field for all credits
--         plan's included minutes are credited to balance at subscription time
--         topup adds to the same balance — no monthly reset logic needed
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- STEP 1: Merge existing monthly_balance into balance
--         (so no minutes are lost during migration)
-- ---------------------------------------------------------------------------

UPDATE public.call_credits
SET
  balance         = balance + COALESCE(monthly_balance, 0),
  total_purchased = total_purchased + COALESCE(monthly_balance, 0),
  updated_at      = NOW()
WHERE monthly_balance > 0;


-- ---------------------------------------------------------------------------
-- STEP 2: Drop monthly tracking columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.call_credits
  DROP COLUMN IF EXISTS monthly_included,
  DROP COLUMN IF EXISTS monthly_balance,
  DROP COLUMN IF EXISTS monthly_used,
  DROP COLUMN IF EXISTS monthly_reset_at;


-- ---------------------------------------------------------------------------
-- STEP 3: Drop reset_monthly_minutes RPC (no longer needed)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.reset_monthly_minutes(UUID);


-- ---------------------------------------------------------------------------
-- STEP 4: Replace deduct_call_credits RPC
--         Simplified: single balance only, atomic with FOR UPDATE lock
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.deduct_call_credits(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.deduct_call_credits(org_id UUID, deduction NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.call_credits
  SET
    balance        = balance - deduction,
    total_consumed = total_consumed + deduction,
    updated_at     = NOW()
  WHERE organization_id = org_id
    AND balance >= deduction;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- STEP 5: Update subscription_plans — remove monthly_minutes_included from
--         features JSONB (keep as ai_minutes_included for display + credit
--         allocation on subscribe), clean up topup_rate_per_minute key name
-- ---------------------------------------------------------------------------

-- Rename monthly_minutes_included → ai_minutes_included in all plans
UPDATE public.subscription_plans
SET features = (features - 'monthly_minutes_included')
    || jsonb_build_object('ai_minutes_included', (features->>'monthly_minutes_included')::numeric)
WHERE features ? 'monthly_minutes_included';

-- Update Free plan description to reflect 6-month validity
UPDATE public.subscription_plans
SET
  description = 'Get started at no cost. Includes 50 AI minutes. Valid for 6 months.',
  updated_at  = NOW()
WHERE slug = 'free';
