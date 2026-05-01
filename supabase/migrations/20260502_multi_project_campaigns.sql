-- Migration: Multi-project support for campaigns
-- Date: 2026-05-02
-- Production-safe: fully backward compatible, no columns dropped, no data deleted.

-- Step 1: Add cached project_ids array column (nullable so existing rows are unaffected)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS project_ids uuid[] DEFAULT NULL;

-- Step 2: Backfill project_ids from existing project_id
UPDATE public.campaigns
SET project_ids = ARRAY[project_id]
WHERE project_id IS NOT NULL
  AND project_ids IS NULL;

-- Step 3: Create junction table (source of truth for multi-project campaigns)
CREATE TABLE IF NOT EXISTS public.campaign_projects (
  campaign_id uuid NOT NULL,
  project_id  uuid NOT NULL,
  created_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT campaign_projects_pkey PRIMARY KEY (campaign_id, project_id),
  CONSTRAINT campaign_projects_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_projects_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- Step 4: Backfill junction table from existing campaigns.project_id
INSERT INTO public.campaign_projects (campaign_id, project_id)
SELECT id, project_id
FROM public.campaigns
WHERE project_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 5: Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_campaign_projects_campaign_id
  ON public.campaign_projects(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_projects_project_id
  ON public.campaign_projects(project_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_project_ids
  ON public.campaigns USING GIN (project_ids);
