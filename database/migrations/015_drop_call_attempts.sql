-- Migration 015: Drop call_attempts table
-- This table is unused by the AI calling flow.
-- Retry logic is fully handled by call_queue (status + next_retry_at + attempt_count).
-- SMS attempts no longer need a separate log table.
-- Run AFTER deploying code changes that remove all call_attempts references.

DROP TABLE IF EXISTS public.call_attempts CASCADE;
