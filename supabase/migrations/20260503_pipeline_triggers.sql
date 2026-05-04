-- Pipeline Triggers: org-wide event → stage mappings
CREATE TABLE public.org_pipeline_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trigger_key text NOT NULL,
  is_enabled boolean DEFAULT true,
  target_stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, trigger_key)
);

ALTER TABLE public.org_pipeline_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage pipeline triggers"
  ON public.org_pipeline_triggers
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Badge field: set when all call retries exhausted, cleared on next successful call
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS call_failed_at timestamptz;

-- Add pipeline_trigger as valid source in stage transitions
ALTER TABLE pipeline_stage_transitions
  DROP CONSTRAINT IF EXISTS pipeline_stage_transitions_source_check;

ALTER TABLE pipeline_stage_transitions
  ADD CONSTRAINT pipeline_stage_transitions_source_check
  CHECK (source IN ('manual', 'automation', 'ai_call', 'import', 'pipeline_trigger'));
