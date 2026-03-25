-- Migration: Add manual_start column to campaigns table
-- This allows campaigns to be started manually by the user instead of automatically

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaigns' AND column_name = 'manual_start'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN manual_start BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Update index hint for manual start campaigns
COMMENT ON COLUMN campaigns.manual_start IS 'If true, the campaign must be started manually within its date/time window. If false (default), it starts automatically.';
