-- Migration: Revamp Units and Configs
-- Date: 2026-03-28
-- Description: Creates unit_configs, renames properties to units, and migrates data.

BEGIN;

-- 1. Create unit_configs table
CREATE TABLE IF NOT EXISTS public.unit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('residential', 'commercial', 'land')),
    property_type TEXT NOT NULL,
    config_name TEXT,
    carpet_area NUMERIC(12, 2),
    built_up_area NUMERIC(12, 2),
    super_built_up_area NUMERIC(12, 2),
    plot_area NUMERIC(12, 2),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sell', 'rent', 'lease')),
    base_price NUMERIC(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES public.profiles(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_unit_configs_project_id ON public.unit_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_unit_configs_org_id ON public.unit_configs(organization_id);

-- 2. Rename properties to units
ALTER TABLE IF EXISTS public.properties RENAME TO units;

-- 3. Update units schema
-- Add new columns and ensure they match the requested schema exactly
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS config_id UUID REFERENCES public.unit_configs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tower_id UUID REFERENCES public.towers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transaction_type TEXT, -- Overridable from config
ADD COLUMN IF NOT EXISTS total_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS floor_rise_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS plc_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS built_up_area NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS super_built_up_area NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS plot_area NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
ADD COLUMN IF NOT EXISTS bathrooms INTEGER,
ADD COLUMN IF NOT EXISTS balconies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS facing TEXT,
ADD COLUMN IF NOT EXISTS is_corner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vastu_compliant BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS possession_date DATE,
ADD COLUMN IF NOT EXISTS completion_date DATE,
ADD COLUMN IF NOT EXISTS construction_status TEXT CHECK (construction_status IN ('under_construction', 'ready_to_move', 'completed')),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- Rename price to base_price if it matches previous schema and ensure it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'price') THEN
        ALTER TABLE public.units RENAME COLUMN price TO base_price;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'base_price') THEN
        ALTER TABLE public.units ADD COLUMN base_price NUMERIC(15, 2) DEFAULT 0;
    END IF;
END $$;

-- Ensure carpet_area exists (it likely does from legacy properties)
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS carpet_area NUMERIC(12, 2) DEFAULT 0;

-- 4. Update units constraints
-- Note: properties_pkey is automatically renamed or remains associated with 'units'
-- We only need to ensure the project_unit_number unique constraint is correctly named for the new table
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_project_unit_number_key;
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS properties_project_unit_number_key;
ALTER TABLE public.units ADD CONSTRAINT units_project_unit_number_key UNIQUE (project_id, unit_number);

-- 5. Update projects table
ALTER TABLE public.projects 
DROP COLUMN IF EXISTS project_type,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 6. Update Indexes for Units
CREATE INDEX IF NOT EXISTS idx_units_config_id ON public.units(config_id);
CREATE INDEX IF NOT EXISTS idx_units_project_id ON public.units(project_id);
CREATE INDEX IF NOT EXISTS idx_units_tower_id ON public.units(tower_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);

-- 7. Data Migration: projects.unit_types -> unit_configs
INSERT INTO public.unit_configs (
    project_id,
    organization_id,
    category,
    property_type,
    config_name,
    carpet_area,
    transaction_type,
    base_price,
    metadata
)
SELECT 
    p.id as project_id,
    p.organization_id,
    COALESCE((ut->>'category'), 'residential') as category,
    COALESCE((ut->>'property_type'), (ut->>'type'), 'Apartment') as property_type,
    COALESCE((ut->>'configuration'), (ut->>'config_name')) as config_name,
    (ut->>'carpet_area')::NUMERIC as carpet_area,
    COALESCE((ut->>'transaction_type'), (ut->>'transaction'), 'sell') as transaction_type,
    (ut->>'price')::NUMERIC as base_price,
    jsonb_build_object('legacy_id', (ut->>'id'))
FROM 
    public.projects p,
    jsonb_array_elements(p.unit_types) ut
WHERE 
    p.unit_types IS NOT NULL AND jsonb_array_length(p.unit_types) > 0;

-- 8. Link units to configs and sync transaction_type
UPDATE public.units u
SET 
    config_id = uc.id,
    transaction_type = COALESCE(u.transaction_type, uc.transaction_type)
FROM public.unit_configs uc
WHERE uc.project_id = u.project_id
AND (uc.metadata->>'legacy_id' = u.unit_config_id OR uc.metadata->>'legacy_id' = u.unit_config);

COMMIT;
