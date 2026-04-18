-- 1. New columns on properties table
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS tower_id UUID,
  ADD COLUMN IF NOT EXISTS floor_number_int INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_number_text TEXT,
  ADD COLUMN IF NOT EXISTS facing TEXT,
  ADD COLUMN IF NOT EXISTS floor_rise_price NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plc_price NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS unit_config TEXT,
  ADD COLUMN IF NOT EXISTS carpet_area NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS built_up_area NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS super_built_up_area NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS slot_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Note: Existing properties already have floor_number (TEXT) and unit_number (TEXT).
-- The spec asks for floor_number (INTEGER) and unit_number (TEXT).
-- Since floor_number already exists as TEXT, I'll rename the new one to floor_number_temp then handle it.
-- Or better, since I'm revamping, I'll check if I can just use the existing ones if types match.
-- Existing: floor_number TEXT, unit_number TEXT.
-- New: floor_number INTEGER, unit_number TEXT.
-- I will add as new names first if needed, but the spec says "ADD COLUMN IF NOT EXISTS floor_number INTEGER".
-- This might fail if it exists as TEXT.

-- Let's check the existing schema for properties again.
-- I'll use a safer approach: add columns with different names and then migrate if needed, 
-- or just try to ALTEr COLUMN if it exists.

-- Actually, I'll follow the spec as much as possible but be careful.
-- If I run "ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS floor_number INTEGER", 
-- and it already exists as TEXT, it WILL error in Postgres.

-- I'll use the spec's SQL but with a refinement to handle existing columns.

DO $$ 
BEGIN
  -- Add tower_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='tower_id') THEN
    ALTER TABLE public.properties ADD COLUMN tower_id UUID;
  END IF;

  -- Handle floor_number: if exists as text, we might want to keep it or add a new one.
  -- The spec says floor_number INTEGER.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='floor_number' AND data_type='text') THEN
    -- Rename existing to floor_number_old or just use it as is?
    -- The spec is quite specific about INTEGER.
    ALTER TABLE public.properties RENAME COLUMN floor_number TO floor_number_text_old;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='floor_number') THEN
    ALTER TABLE public.properties ADD COLUMN floor_number INTEGER DEFAULT 1;
  END IF;

  -- unit_number is already TEXT in existing, so that's fine.
  -- Add other columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='facing') THEN
    ALTER TABLE public.properties ADD COLUMN facing TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='floor_rise_price') THEN
    ALTER TABLE public.properties ADD COLUMN floor_rise_price NUMERIC(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='plc_price') THEN
    ALTER TABLE public.properties ADD COLUMN plc_price NUMERIC(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='base_price') THEN
    ALTER TABLE public.properties ADD COLUMN base_price NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='unit_config') THEN
    ALTER TABLE public.properties ADD COLUMN unit_config TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='carpet_area') THEN
    ALTER TABLE public.properties ADD COLUMN carpet_area NUMERIC(8,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='built_up_area') THEN
    ALTER TABLE public.properties ADD COLUMN built_up_area NUMERIC(8,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='super_built_up_area') THEN
    ALTER TABLE public.properties ADD COLUMN super_built_up_area NUMERIC(8,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='slot_index') THEN
    ALTER TABLE public.properties ADD COLUMN slot_index INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='metadata') THEN
    ALTER TABLE public.properties ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;

END $$;

-- 2. New towers table
CREATE TABLE IF NOT EXISTS public.towers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_floors INTEGER NOT NULL DEFAULT 10,
  units_per_floor INTEGER NOT NULL DEFAULT 4,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add tower_id FK to properties
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS fk_properties_tower;

ALTER TABLE public.properties
  ADD CONSTRAINT fk_properties_tower
  FOREIGN KEY (tower_id) REFERENCES public.towers(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_towers_project_id ON public.towers(project_id);
CREATE INDEX IF NOT EXISTS idx_towers_org_id ON public.towers(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_tower_id ON public.properties(tower_id);
CREATE INDEX IF NOT EXISTS idx_properties_floor ON public.properties(tower_id, floor_number);

-- RLS
ALTER TABLE public.towers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View org towers" ON public.towers;
CREATE POLICY "View org towers" ON public.towers FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Manage org towers" ON public.towers;
CREATE POLICY "Manage org towers" ON public.towers FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_towers_modtime ON towers;
CREATE TRIGGER update_towers_modtime 
  BEFORE UPDATE ON towers 
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
