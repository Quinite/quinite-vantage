-- Migration: 017_add_amenities.sql
-- Description: Adds amenities JSONB columns to projects and unit_configs tables.
--
-- Amenities are stored as arrays of stable snake_case amenity IDs that reference
-- the client-side taxonomy defined in lib/amenities-constants.js.
--
-- Two contexts:
--   projects.amenities      → society/community amenities (pool, gym, clubhouse, security...)
--   unit_configs.amenities  → in-flat features (AC, modular kitchen, flooring...)
--
-- The existing property_features table (linked to the old properties table) is
-- intentionally left intact for backward compatibility.

BEGIN;

-- 1. Add amenities column to projects (society / community amenities)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS amenities JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Add amenities column to unit_configs (in-unit features per config type)
ALTER TABLE public.unit_configs
  ADD COLUMN IF NOT EXISTS amenities JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. GIN indexes for fast containment queries
--    e.g. SELECT * FROM projects WHERE amenities @> '["swimming_pool","gym"]'
CREATE INDEX IF NOT EXISTS idx_projects_amenities
  ON public.projects USING gin(amenities);

CREATE INDEX IF NOT EXISTS idx_unit_configs_amenities
  ON public.unit_configs USING gin(amenities);

-- 4. Column documentation
COMMENT ON COLUMN public.projects.amenities IS
  'Array of amenity IDs from PROJECT_AMENITY_CATEGORIES (lib/amenities-constants.js).
   Stores society/community amenities — e.g. ["swimming_pool","gym","24hr_security","clubhouse"].
   Use GIN index for containment queries: amenities @> ''["swimming_pool"]''::jsonb';

COMMENT ON COLUMN public.unit_configs.amenities IS
  'Array of amenity IDs from UNIT_AMENITY_CATEGORIES (lib/amenities-constants.js).
   Stores in-flat features shared by all units of this config type —
   e.g. ["split_ac","modular_kitchen","vitrified_flooring","wardrobes"].
   Individual unit overrides can go in units.metadata if needed.';

COMMIT;
