-- Add brochure fields to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brochure_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brochure_path text;

-- Create project-brochures storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-brochures', 'project-brochures', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for project-brochures bucket
CREATE POLICY "Authenticated users can upload brochures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-brochures');

CREATE POLICY "Anyone can read brochures"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-brochures');

CREATE POLICY "Authenticated users can delete their brochures"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-brochures');
