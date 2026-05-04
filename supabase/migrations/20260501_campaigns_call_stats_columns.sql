-- Migration: Add missing call stat columns to campaigns table
-- These columns exist in schema_latest.sql but were never migrated to production,
-- causing a "column total_calls does not exist" error on every call_logs INSERT
-- (a trigger on call_logs tries to update these columns).

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS total_calls integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS answered_calls integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transferred_calls integer DEFAULT 0;
