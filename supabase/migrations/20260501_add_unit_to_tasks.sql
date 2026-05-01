-- Add unit_id to tasks table
BEGIN;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS unit_id uuid
    REFERENCES public.units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_unit ON public.tasks(unit_id);

COMMIT;
