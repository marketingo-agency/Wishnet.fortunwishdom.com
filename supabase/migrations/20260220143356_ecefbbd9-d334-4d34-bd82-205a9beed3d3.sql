
-- Create wishpedia_settings table
CREATE TABLE public.wishpedia_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_provider text NOT NULL DEFAULT 'openai',
  image_model text NOT NULL DEFAULT 'gpt-image-1',
  text_provider text NOT NULL DEFAULT 'openai',
  text_model text NOT NULL DEFAULT 'gpt-4o',
  default_aspect_ratio text NOT NULL DEFAULT '1:1',
  default_style_prompt text NOT NULL DEFAULT 'high-quality digital art, brand-consistent, appropriate for all audiences, clean lines, vibrant colors',
  transparency_default boolean NOT NULL DEFAULT true,
  brain_retrieval_depth integer NOT NULL DEFAULT 15,
  wizard_angles text[] NOT NULL DEFAULT '{front,left,right,back,top,bottom}',
  auto_set_primary boolean NOT NULL DEFAULT true,
  max_reference_images integer NOT NULL DEFAULT 3,
  naming_pattern text NOT NULL DEFAULT '{name}_{angle}',
  custom_system_prompt text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wishpedia_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only write
CREATE POLICY "Admins can manage wishpedia settings"
ON public.wishpedia_settings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Authenticated read
CREATE POLICY "Authenticated users can read wishpedia settings"
ON public.wishpedia_settings
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Seed default row
INSERT INTO public.wishpedia_settings (id) VALUES (gen_random_uuid());

-- Auto-update timestamp
CREATE TRIGGER update_wishpedia_settings_updated_at
BEFORE UPDATE ON public.wishpedia_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
