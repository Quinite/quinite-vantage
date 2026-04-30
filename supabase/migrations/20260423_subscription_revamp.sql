-- =============================================================================
-- MIGRATION: 20260423_subscription_revamp
-- Description: Subscription system revamp — new canonical plans (Free/Starter/
--              Pro/Enterprise), monthly call-minute tracking, dedup subscriptions,
--              drop dead tables (subscription_addons, billing_plans), update RPCs
--              and RLS policies.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 1: Drop dead tables
-- Remove RLS policies and indexes before dropping tables
-- ---------------------------------------------------------------------------

-- subscription_addons: drop any RLS policies first
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscription_addons'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscription_addons', pol.policyname);
  END LOOP;
END;
$$;

-- billing_plans: drop any RLS policies first
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'billing_plans'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.billing_plans', pol.policyname);
  END LOOP;
END;
$$;

DROP TABLE IF EXISTS public.subscription_addons CASCADE;
DROP TABLE IF EXISTS public.billing_plans CASCADE;


-- ---------------------------------------------------------------------------
-- SECTION 2: Alter subscriptions table
-- ---------------------------------------------------------------------------

-- Drop columns that are no longer needed
ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS trial_ends_at,
  DROP COLUMN IF EXISTS cancel_at_period_end,
  DROP COLUMN IF EXISTS cancelled_at;

-- Add unique constraint on organization_id (one active subscription per org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND contype = 'u'
      AND conname = 'subscriptions_organization_id_key'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_organization_id_key UNIQUE (organization_id);
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- SECTION 3: Alter call_credits table — add monthly minute tracking columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.call_credits
  ADD COLUMN IF NOT EXISTS monthly_included  NUMERIC NOT NULL DEFAULT 0 CHECK (monthly_included >= 0),
  ADD COLUMN IF NOT EXISTS monthly_balance   NUMERIC NOT NULL DEFAULT 0 CHECK (monthly_balance >= 0),
  ADD COLUMN IF NOT EXISTS monthly_used      NUMERIC NOT NULL DEFAULT 0 CHECK (monthly_used >= 0),
  ADD COLUMN IF NOT EXISTS monthly_reset_at  TIMESTAMPTZ;

-- Change low_balance_threshold default to 50
ALTER TABLE public.call_credits
  ALTER COLUMN low_balance_threshold SET DEFAULT 50;


-- ---------------------------------------------------------------------------
-- SECTION 4: Update credit_transactions.transaction_type constraint
-- ---------------------------------------------------------------------------

-- Migrate any 'purchase' rows to 'manual_topup' before changing the constraint
UPDATE public.credit_transactions
SET transaction_type = 'manual_topup'
WHERE transaction_type = 'purchase';

-- Drop the old CHECK constraint (Supabase/PG names it after the column pattern)
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

-- Add the new constraint with canonical types
ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY[
    'manual_topup'::text,
    'consumption'::text,
    'refund'::text,
    'adjustment'::text
  ]));


-- ---------------------------------------------------------------------------
-- SECTION 5: Ensure org_tier enum contains all required values
-- (organizations.tier is a USER-DEFINED enum type called org_tier)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Add 'starter' if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.org_tier'::regtype
      AND enumlabel = 'starter'
  ) THEN
    ALTER TYPE public.org_tier ADD VALUE IF NOT EXISTS 'starter';
  END IF;

  -- Add 'enterprise' if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.org_tier'::regtype
      AND enumlabel = 'enterprise'
  ) THEN
    ALTER TYPE public.org_tier ADD VALUE IF NOT EXISTS 'enterprise';
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- SECTION 6: Insert canonical subscription plans, then remove old ones
-- Strategy: insert new plans first → re-point all FKs → delete old plans
-- ---------------------------------------------------------------------------

-- Step 6a: Insert new plans (slug-based upsert so re-runs are safe)
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, features, is_active, sort_order)
VALUES
  (
    'Free', 'free',
    'Get started at no cost. Valid for 6 months.',
    0, 0,
    '{"max_users":3,"max_projects":2,"max_campaigns":5,"max_leads":250,"ai_minutes_included":0,"topup_allowed":true,"topup_rate_per_minute":6.0,"csv_export":false,"custom_domain":false,"lead_source_integrations":0,"pipeline_automation":true,"audit_log_days":0}'::jsonb,
    true, 1
  ),
  (
    'Starter', 'starter',
    'For small teams ramping up their AI outreach.',
    2499, 23988,
    '{"max_users":5,"max_projects":5,"max_campaigns":20,"max_leads":1500,"monthly_minutes_included":100,"topup_allowed":true,"topup_rate_per_minute":6.0,"csv_export":true,"custom_domain":false,"lead_source_integrations":1,"pipeline_automation":true,"audit_log_days":30}'::jsonb,
    true, 2
  ),
  (
    'Pro', 'pro',
    'For growing teams that need more scale and integrations.',
    6999, 67188,
    '{"max_users":20,"max_projects":25,"max_campaigns":100,"max_leads":7500,"monthly_minutes_included":500,"topup_allowed":true,"topup_rate_per_minute":6.0,"csv_export":true,"custom_domain":true,"lead_source_integrations":-1,"pipeline_automation":true,"audit_log_days":365}'::jsonb,
    true, 3
  ),
  (
    'Enterprise', 'enterprise',
    'Unlimited scale for large organisations with full feature access.',
    19999, 199999,
    '{"max_users":-1,"max_projects":-1,"max_campaigns":-1,"max_leads":-1,"monthly_minutes_included":1500,"topup_allowed":true,"topup_rate_per_minute":6.0,"csv_export":true,"custom_domain":true,"lead_source_integrations":-1,"pipeline_automation":true,"audit_log_days":-1}'::jsonb,
    true, 4
  )
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly  = EXCLUDED.price_yearly,
  features      = EXCLUDED.features,
  is_active     = EXCLUDED.is_active,
  sort_order    = EXCLUDED.sort_order;


-- ---------------------------------------------------------------------------
-- SECTION 7: Re-point all FKs to new plans, then delete old plan rows
-- ---------------------------------------------------------------------------

-- Re-point subscriptions whose plan_id is not one of the 4 new canonical plans → Pro
UPDATE public.subscriptions
SET plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'pro')
WHERE plan_id NOT IN (SELECT id FROM public.subscription_plans WHERE slug IN ('free','starter','pro','enterprise'));

-- Re-point organizations.current_plan_id the same way
UPDATE public.organizations
SET current_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'pro')
WHERE current_plan_id IS NULL
   OR current_plan_id NOT IN (SELECT id FROM public.subscription_plans WHERE slug IN ('free','starter','pro','enterprise'));

-- Now it is safe to delete any leftover old plan rows (not the 4 canonical ones)
DELETE FROM public.subscription_plans
WHERE slug NOT IN ('free', 'starter', 'pro', 'enterprise');


-- ---------------------------------------------------------------------------
-- SECTION 8: Sync organizations.tier from their active subscription
-- ---------------------------------------------------------------------------

UPDATE public.organizations o
SET tier = sp.slug::public.org_tier
FROM public.subscriptions s
JOIN public.subscription_plans sp ON sp.id = s.plan_id
WHERE s.organization_id = o.id
  AND s.status = 'active';


-- ---------------------------------------------------------------------------
-- SECTION 9: Backfill call_credits monthly data from each org's active plan
-- ---------------------------------------------------------------------------

UPDATE public.call_credits cc
SET
  monthly_included = COALESCE(
    (
      SELECT (sp.features->>'monthly_minutes_included')::numeric
      FROM public.subscriptions s
      JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.organization_id = cc.organization_id
        AND s.status = 'active'
      LIMIT 1
    ),
    0
  ),
  monthly_balance = COALESCE(
    (
      SELECT (sp.features->>'monthly_minutes_included')::numeric
      FROM public.subscriptions s
      JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.organization_id = cc.organization_id
        AND s.status = 'active'
      LIMIT 1
    ),
    0
  ),
  monthly_used     = 0,
  monthly_reset_at = NOW(),
  updated_at       = NOW();


-- ---------------------------------------------------------------------------
-- SECTION 10: Replace deduct_call_credits RPC
-- Drains monthly_balance first, then the paid balance
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.deduct_call_credits(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.deduct_call_credits(org_id UUID, deduction NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_monthly      NUMERIC;
  v_balance      NUMERIC;
  v_from_monthly NUMERIC;
  v_from_balance NUMERIC;
BEGIN
  SELECT monthly_balance, balance
  INTO v_monthly, v_balance
  FROM public.call_credits
  WHERE organization_id = org_id
  FOR UPDATE;

  IF (v_monthly + v_balance) < deduction THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  v_from_monthly := LEAST(deduction, v_monthly);
  v_from_balance := deduction - v_from_monthly;

  UPDATE public.call_credits
  SET
    monthly_balance = monthly_balance - v_from_monthly,
    monthly_used    = monthly_used    + v_from_monthly,
    balance         = balance         - v_from_balance,
    total_consumed  = total_consumed  + deduction,
    updated_at      = NOW()
  WHERE organization_id = org_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- SECTION 11: Add reset_monthly_minutes RPC
-- Called by billing system at the start of each new billing cycle
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reset_monthly_minutes(org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_included NUMERIC;
BEGIN
  SELECT (sp.features->>'monthly_minutes_included')::numeric
  INTO v_included
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = org_id
    AND s.status = 'active'
  LIMIT 1;

  UPDATE public.call_credits
  SET
    monthly_balance  = COALESCE(v_included, 0),
    monthly_included = COALESCE(v_included, 0),
    monthly_used     = 0,
    monthly_reset_at = NOW(),
    updated_at       = NOW()
  WHERE organization_id = org_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- SECTION 12: Trigger — keep organizations.tier in sync on subscription changes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_org_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.organizations
  SET tier = (
    SELECT sp.slug::public.org_tier
    FROM public.subscription_plans sp
    WHERE sp.id = NEW.plan_id
  )
  WHERE id = NEW.organization_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_org_tier ON public.subscriptions;

CREATE TRIGGER trg_sync_org_tier
  AFTER INSERT OR UPDATE OF plan_id, status
  ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_org_tier();


-- ---------------------------------------------------------------------------
-- SECTION 13: RLS Policies
-- Drop all existing policies on affected tables, then add new canonical ones
-- ---------------------------------------------------------------------------

-- Enable RLS on tables (idempotent)
ALTER TABLE public.subscription_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_credits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions   ENABLE ROW LEVEL SECURITY;

-- ---- subscription_plans ----

DROP POLICY IF EXISTS "subscription_plans_select_public"       ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_select_admin"        ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_select"              ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_write_admin"         ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_all_admin"           ON public.subscription_plans;
DROP POLICY IF EXISTS "Allow public read access to plans"      ON public.subscription_plans;
DROP POLICY IF EXISTS "Allow admin full access to plans"       ON public.subscription_plans;

-- Active plans are readable by everyone; platform_admin sees all plans
CREATE POLICY "subscription_plans_select"
  ON public.subscription_plans
  FOR SELECT
  USING (
    is_active = true
    OR (auth.jwt() ->> 'role') = 'platform_admin'
  );

-- Only platform_admin can insert/update/delete plans
CREATE POLICY "subscription_plans_all_admin"
  ON public.subscription_plans
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'platform_admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'platform_admin');


-- ---- subscriptions ----

DROP POLICY IF EXISTS "subscriptions_select"        ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own"    ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_write_admin"   ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_all_admin"     ON public.subscriptions;
DROP POLICY IF EXISTS "Allow org members to read their subscription"  ON public.subscriptions;
DROP POLICY IF EXISTS "Allow admin full access to subscriptions"      ON public.subscriptions;

-- Org members can read their own subscription; platform_admin sees all
CREATE POLICY "subscriptions_select"
  ON public.subscriptions
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'platform_admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.organization_id = subscriptions.organization_id
        AND p.id = auth.uid()
    )
  );

-- Only platform_admin can write subscriptions
CREATE POLICY "subscriptions_all_admin"
  ON public.subscriptions
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'platform_admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'platform_admin');


-- ---- call_credits ----

DROP POLICY IF EXISTS "call_credits_select"        ON public.call_credits;
DROP POLICY IF EXISTS "call_credits_select_own"    ON public.call_credits;
DROP POLICY IF EXISTS "call_credits_write_admin"   ON public.call_credits;
DROP POLICY IF EXISTS "call_credits_all_admin"     ON public.call_credits;
DROP POLICY IF EXISTS "Allow org members to read their call credits"  ON public.call_credits;
DROP POLICY IF EXISTS "Allow admin full access to call credits"       ON public.call_credits;

-- Org members can read their own credits; platform_admin sees all
CREATE POLICY "call_credits_select"
  ON public.call_credits
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'platform_admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.organization_id = call_credits.organization_id
        AND p.id = auth.uid()
    )
  );

-- Only platform_admin can write (SECURITY DEFINER RPCs bypass this)
CREATE POLICY "call_credits_all_admin"
  ON public.call_credits
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'platform_admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'platform_admin');


-- ---- credit_transactions ----

DROP POLICY IF EXISTS "credit_transactions_select"        ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_select_own"    ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert"        ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_write_admin"   ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_all_admin"     ON public.credit_transactions;
DROP POLICY IF EXISTS "Allow org members to read their transactions"  ON public.credit_transactions;
DROP POLICY IF EXISTS "Allow service role to insert transactions"     ON public.credit_transactions;

-- Org members can read their own transactions; platform_admin sees all
CREATE POLICY "credit_transactions_select"
  ON public.credit_transactions
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'platform_admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.organization_id = credit_transactions.organization_id
        AND p.id = auth.uid()
    )
  );

-- INSERT is handled by SECURITY DEFINER functions (service role context).
-- This permissive policy allows inserts from the service role / DEFINER context.
CREATE POLICY "credit_transactions_insert"
  ON public.credit_transactions
  FOR INSERT
  WITH CHECK (true);


-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------

COMMIT;
