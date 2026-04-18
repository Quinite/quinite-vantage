-- Add lead_id to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_properties_lead_id ON public.properties(lead_id);
