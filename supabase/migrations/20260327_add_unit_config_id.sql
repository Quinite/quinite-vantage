-- Migration: Add unit_config_id to properties table
-- Description: Supports unique identification for unit configurations to avoid collisions between sets with the same name.

-- 1. Add the column
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS unit_config_id TEXT;

-- 2. Create an index for faster lookups when calculating inventory counts
CREATE INDEX IF NOT EXISTS idx_properties_unit_config_id ON public.properties(unit_config_id);

-- 3. Comment for documentation
COMMENT ON COLUMN public.properties.unit_config_id IS 'Unique identifier for the unit configuration set from project.unit_types';
