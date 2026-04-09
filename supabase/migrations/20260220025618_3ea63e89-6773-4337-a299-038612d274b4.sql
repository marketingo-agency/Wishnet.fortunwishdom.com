
-- Create wishpedia_media table
CREATE TABLE public.wishpedia_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.wishpedia_entries(id) ON DELETE CASCADE,
  media_type text NOT NULL,
  storage_path text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  label text,
  group_tag text,
  angle text,
  version text,
  notes text,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  is_ai_generated boolean DEFAULT false,
  ai_prompt text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wishpedia_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same admin-ALL / authenticated-SELECT pattern)
CREATE POLICY "Admins can manage wishpedia media"
  ON public.wishpedia_media FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view wishpedia media"
  ON public.wishpedia_media FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Create wishpedia-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('wishpedia-media', 'wishpedia-media', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload wishpedia media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wishpedia-media');

CREATE POLICY "Anyone can view wishpedia media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'wishpedia-media');

CREATE POLICY "Admins can delete wishpedia media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'wishpedia-media' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update wishpedia media objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'wishpedia-media' AND public.is_admin(auth.uid()));
