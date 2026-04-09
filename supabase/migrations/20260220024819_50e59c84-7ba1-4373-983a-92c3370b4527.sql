
-- ============================================
-- Wishpedia Phase 1: Core Encyclopedia Tables
-- ============================================

-- Table: wishpedia_entries
CREATE TABLE public.wishpedia_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL,
  canon_status text NOT NULL DEFAULT 'draft',
  name text NOT NULL,
  short_summary text,
  long_description text,
  tags text[] DEFAULT '{}',
  collections text[] DEFAULT '{}',
  visual_keywords text[] DEFAULT '{}',
  do_depiction text,
  avoid_depiction text,
  source_notes text,
  is_archived boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  type_fields jsonb DEFAULT '{}'
);

-- Table: wishpedia_relationships
CREATE TABLE public.wishpedia_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.wishpedia_entries(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.wishpedia_entries(id) ON DELETE CASCADE,
  relationship_label text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table: wishpedia_history
CREATE TABLE public.wishpedia_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.wishpedia_entries(id) ON DELETE CASCADE,
  changed_by uuid,
  change_type text NOT NULL,
  change_summary text,
  previous_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wishpedia_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishpedia_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishpedia_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: wishpedia_entries
CREATE POLICY "Admins can manage wishpedia entries"
  ON public.wishpedia_entries FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view wishpedia entries"
  ON public.wishpedia_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies: wishpedia_relationships
CREATE POLICY "Admins can manage wishpedia relationships"
  ON public.wishpedia_relationships FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view wishpedia relationships"
  ON public.wishpedia_relationships FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies: wishpedia_history
CREATE POLICY "Admins can manage wishpedia history"
  ON public.wishpedia_history FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view wishpedia history"
  ON public.wishpedia_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Updated_at trigger for entries
CREATE TRIGGER update_wishpedia_entries_updated_at
  BEFORE UPDATE ON public.wishpedia_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_wishpedia_entries_type ON public.wishpedia_entries(entry_type);
CREATE INDEX idx_wishpedia_entries_canon ON public.wishpedia_entries(canon_status);
CREATE INDEX idx_wishpedia_entries_archived ON public.wishpedia_entries(is_archived);
CREATE INDEX idx_wishpedia_relationships_source ON public.wishpedia_relationships(source_id);
CREATE INDEX idx_wishpedia_relationships_target ON public.wishpedia_relationships(target_id);
CREATE INDEX idx_wishpedia_history_entry ON public.wishpedia_history(entry_id);
