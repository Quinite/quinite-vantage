-- Migration 014: Add priority column to call_queue
-- Required by queueWorker.js .order('priority', { ascending: false })
-- Run this before deploying the updated queueWorker.js

ALTER TABLE public.call_queue
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_call_queue_priority_created
  ON public.call_queue (priority DESC, created_at ASC)
  WHERE status IN ('queued', 'failed');

COMMENT ON COLUMN public.call_queue.priority IS
  'Higher values = higher dispatch priority. Default 0. Can be set higher for urgent campaigns.';
