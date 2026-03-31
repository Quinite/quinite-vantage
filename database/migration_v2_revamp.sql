-- ==========================================
-- Master Migration: AI Call & Campaign Revamp
-- ==========================================

-- [1] PREPARE NEW TABLES & COLUMNS
------------------------------------------

-- Add detailed context to Campaign Settings
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS ai_script text,
ADD COLUMN IF NOT EXISTS call_settings jsonb DEFAULT '{
  "voice_id": "alloy",
  "silence_timeout": 30,
  "max_duration": 600,
  "language": "hinglish"
}'::jsonb;

-- Add Behavioral context to Leads (The Active Core)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS mobile text,
ADD COLUMN IF NOT EXISTS category_interest text CHECK (category_interest = ANY (ARRAY['residential'::text, 'commercial'::text, 'land'::text])),
ADD COLUMN IF NOT EXISTS property_type_interest text,
ADD COLUMN IF NOT EXISTS sub_category_interest text,
ADD COLUMN IF NOT EXISTS transaction_type_interest text CHECK (transaction_type_interest = ANY (ARRAY['sell'::text, 'rent'::text, 'lease'::text])),
ADD COLUMN IF NOT EXISTS preferred_bhk text,
ADD COLUMN IF NOT EXISTS pain_points text[],
ADD COLUMN IF NOT EXISTS competitor_mentions text[],
ADD COLUMN IF NOT EXISTS preferred_contact_method text,
ADD COLUMN IF NOT EXISTS best_contact_time text,
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS min_budget numeric,
ADD COLUMN IF NOT EXISTS max_budget numeric;

-- Consolidate Call Logs (Single Source of Truth)
ALTER TABLE public.call_logs
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS sentiment_score numeric,
ADD COLUMN IF NOT EXISTS interest_level text,
ADD COLUMN IF NOT EXISTS call_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS disconnect_reason text,
ADD COLUMN IF NOT EXISTS ai_metadata jsonb DEFAULT '{}'::jsonb;

-- Add Priority to Queue
ALTER TABLE public.call_queue
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 5;

-- [2] DATA MIGRATION (Move existing data before dropping)
------------------------------------------

-- Sync Lead Profiles data to Leads
UPDATE public.leads l
SET 
  score = COALESCE(lp.lead_score, l.score),
  min_budget = lp.min_budget,
  max_budget = lp.max_budget,
  property_type_interest = lp.property_type_interest,
  sub_category_interest = lp.sub_category_interest,
  pain_points = lp.pain_points,
  competitor_mentions = lp.competitor_mentions,
  preferred_contact_method = lp.preferred_contact_method,
  best_contact_time = lp.best_contact_time,
  preferences = lp.preferences
FROM public.lead_profiles lp
WHERE l.id = lp.lead_id;

-- Sync Insights to Call Logs
UPDATE public.call_logs cl
SET 
  summary = ci.overall_sentiment, 
  sentiment_score = ci.overall_sentiment,
  interest_level = ci.interest_level,
  ai_metadata = jsonb_build_object(
    'objections', ci.objections,
    'budget_mentioned', ci.budget_mentioned,
    'priority_score', ci.priority_score
  )
FROM public.conversation_insights ci
WHERE cl.id = ci.call_log_id;

-- [3] CLEANUP REDUNDANCIES
------------------------------------------

-- Drop the defunct insights table
DROP TABLE IF EXISTS public.conversation_insights CASCADE;

-- Strip redundant fields from lead_profiles
ALTER TABLE public.lead_profiles
DROP COLUMN IF EXISTS lead_score,
DROP COLUMN IF EXISTS engagement_level,
DROP COLUMN IF EXISTS budget_range,
DROP COLUMN IF EXISTS timeline,
DROP COLUMN IF EXISTS min_budget,
DROP COLUMN IF EXISTS max_budget,
DROP COLUMN IF EXISTS pain_points,
DROP COLUMN IF EXISTS competitor_mentions,
DROP COLUMN IF EXISTS property_type_interest,
DROP COLUMN IF EXISTS sub_category_interest,
DROP COLUMN IF EXISTS preferred_contact_method,
DROP COLUMN IF EXISTS best_contact_time,
DROP COLUMN IF EXISTS preferences;

-- Remove redundant fields from call_logs
ALTER TABLE public.call_logs 
DROP COLUMN IF EXISTS ai_analysis,
DROP COLUMN IF EXISTS status;

-- [4] FUNCTIONS & TRIGGERS (Production Automation)
------------------------------------------

-- Atomic Credit Deduction Function
CREATE OR REPLACE FUNCTION public.deduct_credits(
    p_organization_id uuid,
    p_amount numeric
) RETURNS boolean AS $$
DECLARE
    v_balance numeric;
BEGIN
    -- Select current balance for update (lock the row)
    SELECT balance INTO v_balance 
    FROM public.call_credits 
    WHERE organization_id = p_organization_id
    FOR UPDATE;

    IF v_balance IS NULL OR v_balance < p_amount THEN
        RETURN FALSE;
    END IF;

    UPDATE public.call_credits 
    SET 
        balance = balance - p_amount,
        total_consumed = total_consumed + p_amount,
        updated_at = now()
    WHERE organization_id = p_organization_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Master Call Statistics Trigger Function
CREATE OR REPLACE FUNCTION public.fn_update_call_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update Lead stats
    UPDATE public.leads 
    SET 
        total_calls = total_calls + 1,
        last_contacted_at = NEW.created_at,
        last_sentiment_score = NEW.sentiment_score,
        interest_level = COALESCE(NEW.interest_level, interest_level)
    WHERE id = NEW.lead_id;

    -- Update Campaign stats
    UPDATE public.campaigns
    SET 
        total_calls = total_calls + 1,
        answered_calls = CASE WHEN NEW.call_status = 'completed' THEN answered_calls + 1 ELSE answered_calls END,
        updated_at = now()
    WHERE id = NEW.campaign_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Attach
DROP TRIGGER IF EXISTS tr_call_logs_stats ON public.call_logs;
CREATE TRIGGER tr_call_logs_stats
AFTER INSERT OR UPDATE OF call_status ON public.call_logs
FOR EACH ROW
WHEN (NEW.call_status IS NOT NULL)
EXECUTE FUNCTION public.fn_update_call_statistics();

-- [5] SUBSCRIPTION MODERNIZATION (Performance Caching)
------------------------------------------

-- Add cached status to organizations to avoid 3-level joins in dialer polling
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status = ANY (ARRAY['active', 'trialing', 'past_due', 'cancelled', 'suspended'])),
ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz,
ADD COLUMN IF NOT EXISTS current_plan_id uuid REFERENCES public.subscription_plans(id);

-- Trigger to keep organizations.subscription_status in sync with subscriptions table
CREATE OR REPLACE FUNCTION public.fn_sync_org_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.organizations
    SET 
        subscription_status = NEW.status::text,
        subscription_period_end = NEW.current_period_end,
        current_plan_id = NEW.plan_id,
        updated_at = now()
    WHERE id = NEW.organization_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_org_subscription ON public.subscriptions;
CREATE TRIGGER tr_sync_org_subscription
AFTER INSERT OR UPDATE OF status, plan_id, current_period_end ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_org_status();

-- [6] BACKFILL EXISTING DATA
------------------------------------------
-- Synchronize existing subscription data into the new cached organization columns
UPDATE public.organizations o
SET 
    subscription_status = s.status::text,
    subscription_period_end = s.current_period_end,
    current_plan_id = s.plan_id,
    updated_at = now()
FROM public.subscriptions s
WHERE o.id = s.organization_id;

-- [7] PRODUCTION SECURITY (RLS)
------------------------------------------

-- Enable RLS on all telephony tables
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Generator (Helper)
-- Policy: Organization isolation based on profile.organization_id
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['call_logs', 'call_queue', 'call_attempts', 'call_credits'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Org isolation: %s" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Org isolation: %s" ON public.%I 
                        USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
                        WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))', t, t);
    END LOOP;
END $$;

-- [9] PERFORMANCE INDEXES
------------------------------------------
CREATE INDEX IF NOT EXISTS idx_call_queue_polling ON public.call_queue (status, next_retry_at, priority DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_stats ON public.call_logs (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_behavioral ON public.leads (organization_id, interest_level, last_contacted_at);

-- [10] SAMPLE DATA SEEDING (FOR TESTING)
------------------------------------------
-- Seed a default 'Pro' plan matching user's structure
INSERT INTO public.subscription_plans (id, name, slug, description, price_monthly, features, is_active, sort_order)
VALUES (
    '1cf410a8-d273-46bc-b059-6e7451e13afd',
    'Pro', 
    'pro', 
    'For growing businesses', 
    9999.00, 
    '{"support": "email", "max_leads": 10000, "max_users": 10, "max_projects": 10, "max_campaigns": 50, "custom_branding": true, "advanced_analytics": true, "ai_calls_per_month": 5000}'::jsonb, 
    true,
    2
)
ON CONFLICT (id) DO NOTHING;

-- Seed all existing organizations with active subscriptions IF they don't have one
INSERT INTO public.subscriptions (organization_id, plan_id, status, current_period_end)
SELECT o.id, '1cf410a8-d273-46bc-b059-6e7451e13afd', 'active', (now() + '1 month'::interval)
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.organization_id = o.id);

-- Ensure all organizations have high-speed call credits
INSERT INTO public.call_credits (organization_id, balance, total_purchased)
SELECT id, 1000.00, 1000.00 FROM public.organizations
ON CONFLICT (organization_id) DO UPDATE 
SET balance = EXCLUDED.balance, total_purchased = EXCLUDED.total_purchased;
