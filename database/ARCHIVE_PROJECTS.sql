-- Migration: Add archive fields to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON public.projects(archived_at) WHERE archived_at IS NULL;
