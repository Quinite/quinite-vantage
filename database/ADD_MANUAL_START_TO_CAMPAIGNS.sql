-- Migration: Add manual_start column to campaigns table
-- Run this in Supabase SQL editor

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaigns' AND column_name = 'manual_start'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN manual_start BOOLEAN NOT NULL DEFAULT FALSE;
        COMMENT ON COLUMN campaigns.manual_start IS 'If true, the campaign must be started manually within its date/time window. If false (default), it starts automatically.';
    END IF;
END $$;
