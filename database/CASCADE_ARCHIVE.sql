-- ==============================================================================
-- CASCADE ARCHIVE SCHEMA UPDATES
-- ==============================================================================

-- 1. Add archival metadata to Campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- 2. Add archival metadata to Leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- 3. Add archival metadata to Properties (Inventory)
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- 4. Add archival metadata to Call Logs (Optional but good for consistency)
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- 5. Add indexes for performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_campaigns_archived_at ON public.campaigns(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON public.leads(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_archived_at ON public.properties(archived_at) WHERE archived_at IS NULL;
