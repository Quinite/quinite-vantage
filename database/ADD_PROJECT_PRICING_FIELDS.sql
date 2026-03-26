-- ==============================================================================
-- ADD PROJECT INVENTORY & PRICING FIELDS
-- ==============================================================================

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS total_units INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_types JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS min_price NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS max_price NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS price_range JSONB,
ADD COLUMN IF NOT EXISTS project_status TEXT DEFAULT 'planning',
ADD COLUMN IF NOT EXISTS show_in_inventory BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS possession_date DATE,
ADD COLUMN IF NOT EXISTS completion_date DATE,
ADD COLUMN IF NOT EXISTS public_visibility BOOLEAN DEFAULT false;

-- Add index for price filtering if needed
CREATE INDEX IF NOT EXISTS idx_projects_pricing ON public.projects(min_price, max_price);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(project_status);

-- Backfill counts if unit_types exist
UPDATE public.projects
SET total_units = (
  SELECT COALESCE(SUM((val->>'count')::integer), 0)
  FROM jsonb_array_elements(unit_types) AS val
)
WHERE unit_types IS NOT NULL AND jsonb_array_length(unit_types) > 0;
