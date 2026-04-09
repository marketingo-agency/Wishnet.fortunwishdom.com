-- Brain Categories table
CREATE TABLE public.brain_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'FileText',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Heart Categories table
CREATE TABLE public.heart_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'MessageSquare',
  color TEXT NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brain_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heart_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brain_categories
CREATE POLICY "Authenticated users can view brain categories"
  ON public.brain_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage brain categories"
  ON public.brain_categories FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for heart_categories
CREATE POLICY "Authenticated users can view heart categories"
  ON public.heart_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage heart categories"
  ON public.heart_categories FOR ALL
  USING (is_admin(auth.uid()));

-- Update triggers
CREATE TRIGGER update_brain_categories_updated_at
  BEFORE UPDATE ON public.brain_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_heart_categories_updated_at
  BEFORE UPDATE ON public.heart_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default Brain categories
INSERT INTO public.brain_categories (id, name, description, icon, sort_order) VALUES
  ('brand', 'Brand & Company', 'Brand guidelines, company info, values', 'Building2', 1),
  ('products', 'Products & Services', 'Product specs, pricing, features', 'Package', 2),
  ('support', 'Customer & Support', 'FAQs, support docs, customer context', 'Users', 3),
  ('operations', 'Operations & Policies', 'Internal processes, policies', 'Settings2', 4);

-- Seed default Heart categories
INSERT INTO public.heart_categories (id, name, description, icon, color, sort_order) VALUES
  ('communication', 'Communication Style', 'Tone, voice, and language', 'MessageSquare', 'violet', 1),
  ('restrictions', 'Restrictions', 'Guardrails and boundaries', 'ShieldAlert', 'red', 2),
  ('templates', 'Templates', 'Response formats', 'FileText', 'blue', 3),
  ('compliance', 'Compliance', 'Legal and policy rules', 'Scale', 'amber', 4);