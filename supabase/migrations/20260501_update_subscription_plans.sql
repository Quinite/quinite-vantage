-- ---------------------------------------------------------------------------
-- Migration: Update Free plan
-- Description: Remove 50 AI minutes from free plan and enable top-ups.
-- ---------------------------------------------------------------------------

BEGIN;

UPDATE public.subscription_plans
SET
  description = 'Get started at no cost. Valid for 6 months.',
  features = features || '{"ai_minutes_included": 0, "topup_allowed": true}'::jsonb,
  updated_at = NOW()
WHERE slug = 'free';

UPDATE public.subscription_plans
SET
  features = features || '{"max_leads": 1500, "ai_minutes_included": 100}'::jsonb,
  updated_at = NOW()
WHERE slug = 'starter';

UPDATE public.subscription_plans
SET
  features = features || '{"max_leads": 7500, "ai_minutes_included": 500}'::jsonb,
  updated_at = NOW()
WHERE slug = 'pro';

UPDATE public.subscription_plans
SET
  features = features || '{"ai_minutes_included": 1500, "lead_source_integrations": -1}'::jsonb,
  updated_at = NOW()
WHERE slug = 'enterprise';

COMMIT;
