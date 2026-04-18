-- Fix for PostgREST ambiguity between units and leads (PGRST201)
-- Description: Drops the redundant unit_id from the leads table. 
-- Assignments are now handled directly from the units table using the lead_id column.

BEGIN;

-- 1. Migrate any existing data if necessary (optional depending on use case)
-- UPDATE units u
-- SET lead_id = l.id
-- FROM leads l
-- WHERE l.unit_id = u.id AND u.lead_id IS NULL;

-- 2. Drop the redundant foreign key and column from leads
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_property_id_fkey,
DROP COLUMN IF EXISTS unit_id;

-- 3. Ensure units table has the correct lead_id column and index (should already exist)
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_units_lead_id ON public.units(lead_id);

COMMIT;
