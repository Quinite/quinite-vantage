-- Add price_undisclosed flag to unit_configs and units
-- When true, AI will not reveal the price on calls and will offer to transfer to senior team

ALTER TABLE public.unit_configs
    ADD COLUMN IF NOT EXISTS price_undisclosed boolean DEFAULT false;

ALTER TABLE public.units
    ADD COLUMN IF NOT EXISTS price_undisclosed boolean DEFAULT false;
