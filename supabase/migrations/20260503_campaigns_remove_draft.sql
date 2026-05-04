-- Remove 'draft' from campaigns.status and migrate any existing draft rows to 'scheduled'.
-- Backfill campaign_projects for campaigns that only have project_id set.

-- 1. Migrate existing draft campaigns to scheduled
UPDATE public.campaigns
SET status = 'scheduled', updated_at = now()
WHERE status = 'draft';

-- 2. Drop old status CHECK constraint
ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- 3. Add new CHECK constraint without 'draft'
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_status_check
  CHECK (status = ANY (ARRAY[
    'scheduled'::text,
    'running'::text,
    'paused'::text,
    'completed'::text,
    'cancelled'::text,
    'archived'::text,
    'failed'::text
  ]));

-- 4. Fix DEFAULT value (was 'draft')
ALTER TABLE public.campaigns
  ALTER COLUMN status SET DEFAULT 'scheduled';

-- 5. Backfill campaign_projects for campaigns that have project_id but no junction row
INSERT INTO public.campaign_projects (campaign_id, project_id, created_at)
SELECT c.id, c.project_id, c.created_at
FROM public.campaigns c
WHERE c.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.campaign_projects cp
    WHERE cp.campaign_id = c.id
  )
ON CONFLICT (campaign_id, project_id) DO NOTHING;
