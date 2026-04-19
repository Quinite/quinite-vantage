-- ============================================================
-- MIGRATION: Full Revamp & Database Cleanup
-- Date: 2026-04-19
-- Removes duplicate tables, redundant fields, and dead code.
-- See plan: full-revamp-and-database-binary-rose.md
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. DROP OBSOLETE TABLES
-- ────────────────────────────────────────────────────────────

-- follow_up_tasks: replaced by lead_tasks
DROP TABLE IF EXISTS public.follow_up_tasks CASCADE;

-- lead_activities: replaced by lead_interactions (was not in production)
DROP TABLE IF EXISTS public.lead_activities CASCADE;

-- lead_tags: not used in any application code
DROP TABLE IF EXISTS public.lead_tags CASCADE;

-- conversation_insights: AI data now lives in call_logs.ai_metadata
DROP TABLE IF EXISTS public.conversation_insights CASCADE;

-- organization_addons: consolidated into subscriptions model
DROP TABLE IF EXISTS public.organization_addons CASCADE;

-- organization_subscriptions: replaced by subscriptions table
DROP TABLE IF EXISTS public.organization_subscriptions CASCADE;


-- ────────────────────────────────────────────────────────────
-- 2. CLEAN call_logs — remove legacy/duplicate columns
-- ────────────────────────────────────────────────────────────

-- status: duplicate of call_status
ALTER TABLE public.call_logs DROP COLUMN IF EXISTS status;

-- ai_analysis: superseded by ai_metadata (JSONB)
ALTER TABLE public.call_logs DROP COLUMN IF EXISTS ai_analysis;


-- ────────────────────────────────────────────────────────────
-- 3. CLEAN campaigns — remove unused columns
-- ────────────────────────────────────────────────────────────

-- manual_start: feature flag never used in code
ALTER TABLE public.campaigns DROP COLUMN IF EXISTS manual_start;

-- lock_version: optimistic locking was never implemented
ALTER TABLE public.campaigns DROP COLUMN IF EXISTS lock_version;


-- ────────────────────────────────────────────────────────────
-- 4. CLEAN leads — remove redundant computed/mirrored columns
-- ────────────────────────────────────────────────────────────

-- call_log_id: confusing "latest call" pointer; use call_logs join instead
ALTER TABLE public.leads DROP COLUMN IF EXISTS call_log_id;

-- transferred_to_human: already tracked via call_logs.transferred
ALTER TABLE public.leads DROP COLUMN IF EXISTS transferred_to_human;

-- last_sentiment_score: mirrors latest call_logs.sentiment_score; compute on read
ALTER TABLE public.leads DROP COLUMN IF EXISTS last_sentiment_score;

-- total_calls: should be COUNT(call_logs WHERE lead_id); computed on read
ALTER TABLE public.leads DROP COLUMN IF EXISTS total_calls;

-- last_contacted_at: should be MAX(call_logs.ended_at WHERE lead_id); computed on read
ALTER TABLE public.leads DROP COLUMN IF EXISTS last_contacted_at;

-- competitor_mentions: never populated by any code path
ALTER TABLE public.leads DROP COLUMN IF EXISTS competitor_mentions;

-- engagement_score: duplicate concept with score; never used
ALTER TABLE public.leads DROP COLUMN IF EXISTS engagement_score;


-- ────────────────────────────────────────────────────────────
-- 5. DROP OBSOLETE TRIGGERS & FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Trigger that updated last_sentiment_score from conversation_insights (both removed)
DROP TRIGGER IF EXISTS update_score_on_insight ON public.conversation_insights;
DROP FUNCTION IF EXISTS public.update_lead_score_after_insight();

-- calculate_lead_score used removed fields (total_calls, last_sentiment_score, conversation_insights)
DROP FUNCTION IF EXISTS public.calculate_lead_score(UUID);


-- ────────────────────────────────────────────────────────────
-- 6. ADD USEFUL INDEXES for computed-on-read queries
-- These support the pattern: leads list joins call_logs for stats
-- ────────────────────────────────────────────────────────────

-- Fast lookup of all calls for a lead (for COUNT and MAX queries)
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id_ended_at
    ON public.call_logs (lead_id, ended_at DESC);

-- Fast lookup by campaign for history tab
CREATE INDEX IF NOT EXISTS idx_call_logs_campaign_id_created_at
    ON public.call_logs (campaign_id, created_at DESC);

-- Fast lookup by call_status
CREATE INDEX IF NOT EXISTS idx_call_logs_call_status
    ON public.call_logs (call_status);


-- ────────────────────────────────────────────────────────────
-- SUMMARY OF FINAL AUTHORITATIVE COLUMN SETS
-- (for documentation — no SQL changes below)
-- ────────────────────────────────────────────────────────────

-- call_logs columns (post-cleanup):
--   id, organization_id, lead_id, campaign_id, caller_id, project_id,
--   call_sid, direction, caller_number, callee_number,
--   call_status, duration, ended_at, recording_url,
--   conversation_transcript, sentiment_score, interest_level, summary,
--   call_cost, transferred, transferred_at, transfer_reason, transfer_department,
--   disconnect_reason, disconnect_notes, notes, ai_metadata,
--   archived_at, archived_by, created_at

-- campaigns columns (post-cleanup):
--   id, organization_id, project_id, name, description, status,
--   start_date, end_date, time_start, time_end,
--   ai_script, call_settings, credit_cap, credit_spent,
--   auto_complete, dnd_compliance, timezone,
--   total_calls, answered_calls, transferred_calls, avg_sentiment_score,
--   total_enrolled, paused_at, completed_at,
--   metadata, created_by, created_at, updated_at, archived_at, archived_by

-- leads AI-written fields (post-cleanup, webserver-owned):
--   interest_level, purchase_readiness, budget_range,
--   min_budget, max_budget, preferred_category, preferred_property_type,
--   preferred_configuration, preferred_transaction_type, preferred_location,
--   preferred_timeline, pain_points, preferred_contact_method, best_contact_time,
--   waiting_status, callback_time, abuse_flag, abuse_details,
--   do_not_call, opted_out_at, opted_out_reason

-- Computed on read (NOT stored on leads):
--   total_calls      → COUNT(call_logs WHERE lead_id)
--   last_contacted_at→ MAX(call_logs.ended_at WHERE lead_id)
--   last_sentiment   → latest call_logs.sentiment_score WHERE lead_id ORDER BY created_at DESC

COMMIT;
