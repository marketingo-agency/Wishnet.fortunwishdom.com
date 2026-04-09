-- Create file_settings table for configurable upload limits and quotas
CREATE TABLE public.file_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_file_size_mb INTEGER NOT NULL DEFAULT 50,
  total_storage_quota_gb DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  allowed_file_types TEXT[] DEFAULT NULL,
  auto_delete_trash_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row with increased limits (100MB file size, 5GB quota)
INSERT INTO public.file_settings (max_file_size_mb, total_storage_quota_gb, auto_delete_trash_days)
VALUES (100, 5.00, 30);

-- Enable RLS
ALTER TABLE public.file_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage (all operations)
CREATE POLICY "Admins can manage file settings" ON public.file_settings
  FOR ALL USING (public.is_admin(auth.uid()));

-- All authenticated users can read
CREATE POLICY "Authenticated users can read file settings" ON public.file_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE TRIGGER update_file_settings_updated_at
  BEFORE UPDATE ON public.file_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update storage bucket limits to 100MB for both buckets
UPDATE storage.buckets 
SET file_size_limit = 104857600
WHERE id IN ('files', 'brain-documents');