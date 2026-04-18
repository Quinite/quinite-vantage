-- Migration 018: Per-unit amenity override + drop orphaned property_features table
-- Run this in Supabase SQL editor.

BEGIN;

-- Per-unit amenity override
-- NULL   = inherit amenities from unit_configs.amenities (default behaviour)
-- []     = this unit explicitly has no features
-- [...]  = unit-specific override, shown instead of config amenities
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT NULL;

-- Partial GIN index — only indexes rows that actually have an override
CREATE INDEX IF NOT EXISTS idx_units_amenities
  ON public.units USING gin(amenities)
  WHERE amenities IS NOT NULL;

COMMENT ON COLUMN public.units.amenities IS
  'NULL = inherit from unit_config.amenities. Explicit array = unit-level override.';

-- Drop completely unused legacy table (no code references anywhere in the project)
DROP TABLE IF EXISTS public.property_features CASCADE;

COMMIT;
