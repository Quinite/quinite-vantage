-- ============================================================
-- MIGRATION: Site Visits System
-- Date: 2026-04-22
-- Creates site_visits table with RLS for multi-tenant isolation
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. site_visits table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_visits (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  organization_id    uuid        NOT NULL,
  lead_id            uuid        NOT NULL,
  project_id         uuid        NULL,
  unit_id            uuid        NULL,
  scheduled_at       timestamptz NOT NULL,
  status             text        NOT NULL DEFAULT 'scheduled',
  booked_via         text        NOT NULL DEFAULT 'manual',
  assigned_agent_id  uuid        NULL,
  visit_notes        text        NULL,
  outcome            text        NULL,
  pipeline_stage_id  uuid        NULL,
  created_by         uuid        NULL,
  created_at         timestamptz NULL DEFAULT now(),
  updated_at         timestamptz NULL DEFAULT now(),

  CONSTRAINT site_visits_pkey
    PRIMARY KEY (id),
  CONSTRAINT site_visits_status_check
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  CONSTRAINT site_visits_booked_via_check
    CHECK (booked_via IN ('ai_call', 'manual', 'self_booking')),
  CONSTRAINT site_visits_outcome_check
    CHECK (outcome IS NULL OR outcome IN ('interested', 'not_interested', 'follow_up_needed')),
  CONSTRAINT site_visits_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads (id) ON DELETE CASCADE,
  CONSTRAINT site_visits_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
  CONSTRAINT site_visits_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE SET NULL,
  CONSTRAINT site_visits_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.units (id) ON DELETE SET NULL,
  CONSTRAINT site_visits_assigned_agent_id_fkey
    FOREIGN KEY (assigned_agent_id) REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT site_visits_pipeline_stage_id_fkey
    FOREIGN KEY (pipeline_stage_id) REFERENCES public.pipeline_stages (id) ON DELETE SET NULL,
  CONSTRAINT site_visits_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- ────────────────────────────────────────────────────────────
-- 2. Indexes
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_site_visits_lead_id
  ON public.site_visits (lead_id);

CREATE INDEX IF NOT EXISTS idx_site_visits_org_scheduled
  ON public.site_visits (organization_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_site_visits_agent_scheduled
  ON public.site_visits (assigned_agent_id, scheduled_at)
  WHERE status = 'scheduled';

-- ────────────────────────────────────────────────────────────
-- 3. RLS
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site visits in their org"
  ON public.site_visits FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create site visits in their org"
  ON public.site_visits FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update site visits in their org"
  ON public.site_visits FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete site visits in their org"
  ON public.site_visits FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

COMMIT;
