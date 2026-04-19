-- ============================================================
-- Migration 019: Campaign Leads System
-- Adds: campaign_leads junction table, new campaign columns,
--       opt-out/DNC fields on leads, status constraint,
--       auto-completion trigger, credit RPC
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. NEW TABLE: campaign_leads
--    Every lead targeted by a campaign gets a row here.
--    All progress tracking flows through this table.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_leads (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id          UUID NOT NULL
                             REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id              UUID NOT NULL
                             REFERENCES public.leads(id) ON DELETE CASCADE,
    organization_id      UUID NOT NULL
                             REFERENCES public.organizations(id) ON DELETE CASCADE,

    status               TEXT NOT NULL DEFAULT 'enrolled'
                             CHECK (status IN (
                                 'enrolled',   -- added to campaign, not yet queued
                                 'queued',     -- in call_queue, awaiting worker
                                 'calling',    -- worker dispatched the call
                                 'called',     -- call completed (any outcome)
                                 'failed',     -- exhausted max_attempts with errors
                                 'opted_out',  -- lead explicitly opted out
                                 'skipped',    -- bypassed for a structural reason
                                 'archived'    -- lead was archived after enrollment
                             )),

    enrolled_by          UUID REFERENCES public.profiles(id),
    enrolled_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    last_call_attempt_at TIMESTAMPTZ,
    attempt_count        INTEGER NOT NULL DEFAULT 0,
    call_log_id          UUID REFERENCES public.call_logs(id),

    -- 'invalid_phone' | 'lead_archived' | 'project_archived' | 'opted_out'
    -- | 'credit_limit' | 'campaign_cancelled' | 'manually_removed' | 'do_not_call'
    -- | 'lead_archived_at_call_time'
    skip_reason          TEXT,
    opted_out_at         TIMESTAMPTZ,
    opted_out_reason     TEXT,

    metadata             JSONB NOT NULL DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_status
    ON public.campaign_leads (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead
    ON public.campaign_leads (lead_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_org
    ON public.campaign_leads (organization_id);


-- ────────────────────────────────────────────────────────────
-- 2. Auto-update updated_at trigger
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_campaign_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaign_leads_updated_at ON public.campaign_leads;
CREATE TRIGGER trg_campaign_leads_updated_at
    BEFORE UPDATE ON public.campaign_leads
    FOR EACH ROW EXECUTE FUNCTION public.update_campaign_leads_updated_at();


-- ────────────────────────────────────────────────────────────
-- 3. ALTER TABLE campaigns: operational columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS credit_cap      NUMERIC,
    ADD COLUMN IF NOT EXISTS credit_spent    NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS auto_complete   BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS dnd_compliance  BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS timezone        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    ADD COLUMN IF NOT EXISTS paused_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS total_enrolled  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lock_version    INTEGER NOT NULL DEFAULT 0;

-- Note: status CHECK constraint intentionally omitted.
-- Existing rows may have 'active' status (legacy). Add the constraint
-- manually after migrating all rows: UPDATE campaigns SET status='running' WHERE status='active';


-- ────────────────────────────────────────────────────────────
-- 4. ALTER TABLE leads: opt-out / DNC fields
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS opted_out_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS opted_out_reason TEXT,
    ADD COLUMN IF NOT EXISTS do_not_call      BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_do_not_call
    ON public.leads (do_not_call)
    WHERE do_not_call = true;


-- ────────────────────────────────────────────────────────────
-- 5. Fix call_queue FK: add CASCADE on campaign deletion
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.call_queue
    DROP CONSTRAINT IF EXISTS call_queue_campaign_id_fkey;

ALTER TABLE public.call_queue
    ADD CONSTRAINT call_queue_campaign_id_fkey
    FOREIGN KEY (campaign_id)
    REFERENCES public.campaigns(id)
    ON DELETE CASCADE;

-- Ensure UNIQUE constraint exists (start endpoint upserts on this)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'call_queue'
          AND constraint_name = 'call_queue_campaign_lead_unique'
    ) THEN
        ALTER TABLE public.call_queue
            ADD CONSTRAINT call_queue_campaign_lead_unique
            UNIQUE (campaign_id, lead_id);
    END IF;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. Auto-completion trigger
--    Fires after campaign_leads.status transitions to a
--    terminal value. When all enrolled leads are terminal
--    and campaign.auto_complete = true, completes the campaign.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_check_campaign_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_campaign      RECORD;
    v_pending_count INTEGER;
BEGIN
    -- Only care about actual status changes
    IF OLD.status = NEW.status THEN RETURN NEW; END IF;

    -- Only trigger on terminal transitions
    IF NEW.status NOT IN ('called', 'failed', 'skipped', 'opted_out', 'archived') THEN
        RETURN NEW;
    END IF;

    -- Fetch campaign (lock row to prevent race)
    SELECT id, status, auto_complete
    INTO v_campaign
    FROM public.campaigns
    WHERE id = NEW.campaign_id
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Only auto-complete running campaigns with the flag enabled
    IF v_campaign.status != 'running' OR NOT v_campaign.auto_complete THEN
        RETURN NEW;
    END IF;

    -- Count leads still in flight
    SELECT COUNT(*) INTO v_pending_count
    FROM public.campaign_leads
    WHERE campaign_id = NEW.campaign_id
      AND status IN ('enrolled', 'queued', 'calling');

    IF v_pending_count = 0 THEN
        UPDATE public.campaigns
        SET
            status              = 'completed',
            completed_at        = now(),
            updated_at          = now(),
            total_calls         = (
                SELECT COUNT(*) FROM public.call_logs
                WHERE campaign_id = NEW.campaign_id
            ),
            answered_calls      = (
                SELECT COUNT(*) FROM public.call_logs
                WHERE campaign_id = NEW.campaign_id
                  AND call_status IN ('called', 'completed')
            ),
            transferred_calls   = (
                SELECT COUNT(*) FROM public.call_logs
                WHERE campaign_id = NEW.campaign_id
                  AND transferred = true
            ),
            avg_sentiment_score = (
                SELECT AVG(sentiment_score) FROM public.call_logs
                WHERE campaign_id = NEW.campaign_id
                  AND sentiment_score IS NOT NULL
            )
        WHERE id = NEW.campaign_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaign_auto_complete ON public.campaign_leads;
CREATE TRIGGER trg_campaign_auto_complete
    AFTER UPDATE OF status ON public.campaign_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_check_campaign_completion();


-- ────────────────────────────────────────────────────────────
-- 7. Atomic credit_spent increment RPC
--    Called from vantage-webserver after each call ends.
--    Returns new running total so caller can check cap.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_campaign_credit_spent(
    p_campaign_id UUID,
    p_amount      NUMERIC
)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
    v_new_spent NUMERIC;
BEGIN
    UPDATE public.campaigns
    SET
        credit_spent = credit_spent + p_amount,
        updated_at   = now()
    WHERE id = p_campaign_id
    RETURNING credit_spent INTO v_new_spent;

    RETURN v_new_spent;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 8. RLS policy for campaign_leads
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_leads_org_isolation ON public.campaign_leads;
CREATE POLICY campaign_leads_org_isolation ON public.campaign_leads
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );


-- ────────────────────────────────────────────────────────────
-- 9. Enable Realtime for campaign_leads
--    Allows UI to receive live progress updates via Supabase.
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
    -- Only add if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'campaign_leads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_leads;
    END IF;
END;
$$;


COMMIT;
