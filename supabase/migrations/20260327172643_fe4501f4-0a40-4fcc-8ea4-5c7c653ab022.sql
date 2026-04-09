
-- Drop old wishpedia tables
DROP TABLE IF EXISTS public.wishpedia_media CASCADE;
DROP TABLE IF EXISTS public.wishpedia_history CASCADE;
DROP TABLE IF EXISTS public.wishpedia_relationships CASCADE;
DROP TABLE IF EXISTS public.wishpedia_entries CASCADE;
DROP TABLE IF EXISTS public.wishpedia_settings CASCADE;

-- Create wishpedia_categories
CREATE TABLE public.wishpedia_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text NOT NULL DEFAULT 'Users',
  color text NOT NULL DEFAULT 'amber',
  has_angle_views boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wishpedia_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wishpedia categories"
  ON public.wishpedia_categories FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view wishpedia categories"
  ON public.wishpedia_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create new wishpedia_entries
CREATE TABLE public.wishpedia_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.wishpedia_categories(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wishpedia_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wishpedia entries"
  ON public.wishpedia_entries FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view wishpedia entries"
  ON public.wishpedia_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create wishpedia_entry_images
CREATE TABLE public.wishpedia_entry_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.wishpedia_entries(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/png',
  size bigint NOT NULL DEFAULT 0,
  angle text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wishpedia_entry_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wishpedia entry images"
  ON public.wishpedia_entry_images FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view wishpedia entry images"
  ON public.wishpedia_entry_images FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add updated_at triggers
CREATE TRIGGER update_wishpedia_categories_updated_at
  BEFORE UPDATE ON public.wishpedia_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wishpedia_entries_updated_at
  BEFORE UPDATE ON public.wishpedia_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default Character category
INSERT INTO public.wishpedia_categories (name, description, icon, color, has_angle_views, sort_order)
VALUES ('Character', 'Characters with 6-angle view images (front, back, left, right, top, bottom)', 'Users', 'violet', true, 0);
