-- Extend pipeline_automations.action_type to support post-move site visit prompts
ALTER TABLE public.pipeline_automations
  DROP CONSTRAINT IF EXISTS pipeline_automations_action_type_check;

ALTER TABLE public.pipeline_automations
  ADD CONSTRAINT pipeline_automations_action_type_check
  CHECK (action_type = ANY (ARRAY[
    'move_stage'::text,
    'assign_agent'::text,
    'create_task'::text,
    'add_tag'::text,
    'show_site_visit_form'::text
  ]));
