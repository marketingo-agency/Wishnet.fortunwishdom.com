-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true);

-- Create sectors (folders) table first (referenced by files)
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create files metadata table
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  description TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_trashed BOOLEAN DEFAULT FALSE,
  trashed_at TIMESTAMPTZ,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create file tags table
CREATE TABLE public.file_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, name)
);

-- Create file versions table
CREATE TABLE public.file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  size BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;

-- Sectors RLS policies
CREATE POLICY "Users can view own sectors" ON public.sectors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sectors" ON public.sectors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sectors" ON public.sectors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sectors" ON public.sectors
  FOR DELETE USING (auth.uid() = user_id);

-- Files RLS policies
CREATE POLICY "Users can view own files" ON public.files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON public.files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" ON public.files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON public.files
  FOR DELETE USING (auth.uid() = user_id);

-- File tags RLS policies (via file ownership)
CREATE POLICY "Users can view own file tags" ON public.file_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.files WHERE files.id = file_tags.file_id AND files.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own file tags" ON public.file_tags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.files WHERE files.id = file_tags.file_id AND files.user_id = auth.uid())
  );

CREATE POLICY "Users can update own file tags" ON public.file_tags
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.files WHERE files.id = file_tags.file_id AND files.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own file tags" ON public.file_tags
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.files WHERE files.id = file_tags.file_id AND files.user_id = auth.uid())
  );

-- File versions RLS policies (via file ownership)
CREATE POLICY "Users can view own file versions" ON public.file_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.files WHERE files.id = file_versions.file_id AND files.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own file versions" ON public.file_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.files WHERE files.id = file_versions.file_id AND files.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own file versions" ON public.file_versions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.files WHERE files.id = file_versions.file_id AND files.user_id = auth.uid())
  );

-- Storage RLS policies
CREATE POLICY "Users can upload files to storage" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own files in storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own files in storage" ON storage.objects
  FOR UPDATE USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files in storage" ON storage.objects
  FOR DELETE USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger to update updated_at on files
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();