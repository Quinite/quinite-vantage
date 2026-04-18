-- Migration: Rename property_id to unit_id in leads and deals
-- Date: 2026-03-28

BEGIN;

-- 1. Rename column in leads table
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'property_id') THEN
        ALTER TABLE public.leads RENAME COLUMN property_id TO unit_id;
    END IF;
END $$;

-- 2. Rename column in deals table
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'property_id') THEN
        ALTER TABLE public.deals RENAME COLUMN property_id TO unit_id;
    END IF;
END $$;

-- 3. Update related constraints/indexes if necessary
-- (PostgreSQL automatically renames these for column renames usually, but let's be safe with naming conventions)

COMMIT;
