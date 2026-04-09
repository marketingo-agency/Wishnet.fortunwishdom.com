-- Create branding_settings table for app-wide branding configuration
CREATE TABLE public.branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login_logo_url TEXT,
  main_logo_url TEXT,
  mini_logo_url TEXT,
  favicon_url TEXT,
  app_title TEXT DEFAULT 'Fortun Wishnet',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row (single-row config table)
INSERT INTO public.branding_settings (app_title) VALUES ('Fortun Wishnet');

-- Enable RLS
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view branding settings (needed for logo display)
CREATE POLICY "Anyone can view branding" ON public.branding_settings
  FOR SELECT USING (true);

-- Only admins can update branding
CREATE POLICY "Only admins can update branding" ON public.branding_settings
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_branding_settings_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();