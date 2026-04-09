-- Create enum for permission levels
CREATE TYPE public.permission_level AS ENUM ('none', 'view', 'limited', 'full');

-- Create permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tool Access Permissions
  files_manager permission_level DEFAULT 'none',
  mastermind permission_level DEFAULT 'none',
  content_studio permission_level DEFAULT 'none',
  social_pulse permission_level DEFAULT 'none',
  taskforce permission_level DEFAULT 'none',
  
  -- Settings Access (for agents)
  can_access_branding BOOLEAN DEFAULT false,
  can_access_user_management BOOLEAN DEFAULT false,
  
  -- Special File Manager Permissions
  files_can_see_admin_files BOOLEAN DEFAULT false,
  files_can_delete BOOLEAN DEFAULT true,
  files_can_upload BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own permissions"
ON public.user_permissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all permissions"
ON public.user_permissions FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update permissions"
ON public.user_permissions FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert permissions"
ON public.user_permissions FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete permissions"
ON public.user_permissions FOR DELETE
USING (public.is_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert permissions for existing users
INSERT INTO public.user_permissions (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;