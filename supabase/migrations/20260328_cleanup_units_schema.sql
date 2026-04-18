-- Migration: Cleanup redundant fields from units table
-- Created: 2026-03-28

ALTER TABLE public.units
DROP COLUMN IF EXISTS title CASCADE,
DROP COLUMN IF EXISTS description CASCADE,
DROP COLUMN IF EXISTS address CASCADE,
DROP COLUMN IF EXISTS size_sqft CASCADE,
DROP COLUMN IF EXISTS type CASCADE,
DROP COLUMN IF EXISTS show_in_crm CASCADE,
DROP COLUMN IF EXISTS block_name CASCADE,
DROP COLUMN IF EXISTS floor_number_text_old CASCADE,
DROP COLUMN IF EXISTS unit_number_text CASCADE,
DROP COLUMN IF EXISTS configuration CASCADE,
DROP COLUMN IF EXISTS floor_number_int CASCADE,
DROP COLUMN IF EXISTS unit_config CASCADE,
DROP COLUMN IF EXISTS slot_index CASCADE,
DROP COLUMN IF EXISTS unit_config_id CASCADE;

-- Also remove redundant indexes
DROP INDEX IF EXISTS idx_properties_unit_config_id;
DROP INDEX IF EXISTS idx_properties_block;
DROP INDEX IF EXISTS idx_properties_project_block;
