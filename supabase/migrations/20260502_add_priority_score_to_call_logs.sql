-- Add priority_score column to call_logs for better indexing and crystal clear reporting
-- This standardizes AI metrics as top-level columns alongside sentiment_score

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS priority_score integer;

-- Comment for clarity
COMMENT ON COLUMN public.call_logs.priority_score IS 'AI estimated priority score (0-100) based on lead intent and budget';

-- Update existing data from ai_metadata to the new column (one-time sync)
UPDATE public.call_logs
SET priority_score = (ai_metadata->>'priority_score')::integer
WHERE ai_metadata->>'priority_score' IS NOT NULL;
