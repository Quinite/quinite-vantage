-- ════════════════════════════════════════════════════════════════════
-- Quinite Vantage — Final Schema Migration
-- Merges lead_profiles into leads (single table).
-- Safe to run once. IF EXISTS / IF NOT EXISTS makes it idempotent.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. leads: add all columns formerly in lead_profiles ───────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS company                    text,
  ADD COLUMN IF NOT EXISTS job_title                  text,
  ADD COLUMN IF NOT EXISTS industry                   text,
  ADD COLUMN IF NOT EXISTS preferred_timeline         text,
  ADD COLUMN IF NOT EXISTS preferred_location         text,
  ADD COLUMN IF NOT EXISTS custom_fields              jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mailing_street             text,
  ADD COLUMN IF NOT EXISTS mailing_city               text,
  ADD COLUMN IF NOT EXISTS mailing_state              text,
  ADD COLUMN IF NOT EXISTS mailing_zip                text,
  ADD COLUMN IF NOT EXISTS mailing_country            text,
  ADD COLUMN IF NOT EXISTS preferred_category         text
    CHECK (preferred_category IN ('residential', 'commercial', 'land')),
  ADD COLUMN IF NOT EXISTS preferred_property_type    text,
  ADD COLUMN IF NOT EXISTS preferred_configuration    text,
  ADD COLUMN IF NOT EXISTS preferred_transaction_type text
    CHECK (preferred_transaction_type IN ('sell', 'rent', 'lease'));
  -- NOTE: department already exists on leads (repurposed from dead column)

-- ── 2a. Backfill professional/address data from lead_profiles ─────────
-- migration_v2_revamp already stripped timeline, budgets, pain_points, etc.
-- from lead_profiles. Only these columns still exist there:
UPDATE leads l
SET
  company         = COALESCE(l.company,         lp.company),
  job_title       = COALESCE(l.job_title,       lp.job_title),
  industry        = COALESCE(l.industry,        lp.industry),
  preferred_location = COALESCE(l.preferred_location, lp.location),
  custom_fields   = COALESCE(l.custom_fields,   lp.custom_fields),
  mailing_street  = COALESCE(l.mailing_street,  lp.mailing_street),
  mailing_city    = COALESCE(l.mailing_city,    lp.mailing_city),
  mailing_state   = COALESCE(l.mailing_state,   lp.mailing_state),
  mailing_zip     = COALESCE(l.mailing_zip,     lp.mailing_zip),
  mailing_country = COALESCE(l.mailing_country, lp.mailing_country)
FROM lead_profiles lp
WHERE l.id = lp.lead_id;

-- ── 2b. Copy old-named columns → new preferred_* names (all leads) ────
-- category_interest / property_type_interest / etc. were added by
-- migration_v2_revamp; populate the canonical preferred_* names before drop.
UPDATE leads
SET
  preferred_category         = COALESCE(preferred_category,         category_interest),
  preferred_property_type    = COALESCE(preferred_property_type,    property_type_interest),
  preferred_configuration    = COALESCE(preferred_configuration,    sub_category_interest),
  preferred_transaction_type = COALESCE(preferred_transaction_type, transaction_type_interest)
WHERE category_interest        IS NOT NULL
   OR property_type_interest   IS NOT NULL
   OR sub_category_interest    IS NOT NULL
   OR transaction_type_interest IS NOT NULL;

-- ── 3. leads: drop old-named columns + dead columns ───────────────────
-- KEPT: abuse_flag, abuse_details, rejection_reason, waiting_status,
--       callback_time, purchase_readiness, budget_range, transferred_to_human
--       — all actively written by vantage-webserver AI agent.
ALTER TABLE leads
  DROP COLUMN IF EXISTS category_interest,          -- renamed → preferred_category
  DROP COLUMN IF EXISTS property_type_interest,     -- renamed → preferred_property_type
  DROP COLUMN IF EXISTS sub_category_interest,      -- renamed → preferred_configuration
  DROP COLUMN IF EXISTS transaction_type_interest,  -- renamed → preferred_transaction_type
  DROP COLUMN IF EXISTS preferred_bhk,              -- replaced by preferred_configuration
  DROP COLUMN IF EXISTS preferences,                -- unused JSONB catch-all
  DROP COLUMN IF EXISTS engagement_score,           -- never written or read
  DROP COLUMN IF EXISTS title;                      -- duplicate of job_title

-- ── 4. Drop lead_profiles ─────────────────────────────────────────────
DROP TABLE IF EXISTS lead_profiles CASCADE;

-- ════════════════════════════════════════════════════════════════════
-- Projects table cleanup — drop metadata JSONB and unit_types JSONB.
-- Promotes rera_number to a flat column. All other fields already
-- exist as direct columns (city, state, min_price, image_url, etc.).
-- ════════════════════════════════════════════════════════════════════

-- ── 5. Add rera_number to projects ────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS rera_number text;

-- ── 6. Backfill rera_number from metadata ─────────────────────────────
UPDATE projects
SET rera_number = COALESCE(rera_number, metadata->'real_estate'->>'rera_number')
WHERE metadata IS NOT NULL AND metadata != 'null'::jsonb;

-- ── 7. Drop metadata and unit_types ───────────────────────────────────
ALTER TABLE projects
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS unit_types;

COMMIT;
