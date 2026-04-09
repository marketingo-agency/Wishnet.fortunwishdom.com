-- Create brain_category enum
CREATE TYPE brain_category AS ENUM ('brand', 'products', 'support', 'operations');

-- Create brain_section_type enum
CREATE TYPE brain_section_type AS ENUM ('general', 'agent');

-- Create brain_sections table
CREATE TABLE public.brain_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type brain_section_type NOT NULL DEFAULT 'general',
  agent_id TEXT,  -- References agent id from data/agents.ts (e.g., 'nexus', 'echo')
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_agent_section UNIQUE (agent_id),
  CONSTRAINT agent_id_required_for_agent_type CHECK (
    (type = 'general' AND agent_id IS NULL) OR 
    (type = 'agent' AND agent_id IS NOT NULL)
  )
);

-- Create brain_documents table
CREATE TABLE public.brain_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES brain_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  category brain_category NOT NULL DEFAULT 'brand',
  description TEXT,
  restricted_agents TEXT[],  -- If null/empty, accessible to ALL agents
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create heart_rules table (replacing any existing implementation)
CREATE TABLE public.heart_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'communication',  -- communication, restrictions, templates, compliance
  priority TEXT NOT NULL DEFAULT 'medium',  -- critical, high, medium, low
  is_global BOOLEAN NOT NULL DEFAULT true,
  assigned_agents TEXT[],  -- If is_global = false, list of agent ids
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.brain_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heart_rules ENABLE ROW LEVEL SECURITY;

-- Brain Sections RLS - Admins can manage, all authenticated can view
CREATE POLICY "Admins can manage brain sections"
  ON public.brain_sections FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view brain sections"
  ON public.brain_sections FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Brain Documents RLS - Admins can manage, all authenticated can view
CREATE POLICY "Admins can manage brain documents"
  ON public.brain_documents FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view brain documents"
  ON public.brain_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Heart Rules RLS - Admins can manage, all authenticated can view
CREATE POLICY "Admins can manage heart rules"
  ON public.heart_rules FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view heart rules"
  ON public.heart_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create updated_at triggers
CREATE TRIGGER update_brain_sections_updated_at
  BEFORE UPDATE ON public.brain_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brain_documents_updated_at
  BEFORE UPDATE ON public.brain_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_heart_rules_updated_at
  BEFORE UPDATE ON public.heart_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_brain_documents_section ON public.brain_documents(section_id);
CREATE INDEX idx_brain_documents_category ON public.brain_documents(category);
CREATE INDEX idx_brain_sections_type ON public.brain_sections(type);
CREATE INDEX idx_brain_sections_agent ON public.brain_sections(agent_id);
CREATE INDEX idx_heart_rules_category ON public.heart_rules(category);
CREATE INDEX idx_heart_rules_global ON public.heart_rules(is_global);

-- Create brain-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('brain-documents', 'brain-documents', true);

-- Storage policies for brain-documents bucket
CREATE POLICY "Admins can upload brain documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brain-documents' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update brain documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'brain-documents' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete brain documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'brain-documents' AND is_admin(auth.uid()));

CREATE POLICY "Anyone authenticated can view brain documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brain-documents' AND auth.uid() IS NOT NULL);

-- Insert the default General Knowledge section
INSERT INTO public.brain_sections (type, agent_id, name, description)
VALUES ('general', NULL, 'General Knowledge', 'Shared knowledge accessible to all AI agents');

-- Insert agent-specific sections for each AI agent
INSERT INTO public.brain_sections (type, agent_id, name, description)
VALUES 
  ('agent', 'nexus', 'Nexus Knowledge', 'Specialized knowledge for the Nexus LLM Control Center'),
  ('agent', 'promptor', 'Promptor Knowledge', 'Specialized knowledge for the Promptor Prompt Engineer AI'),
  ('agent', 'osha', 'Osha Knowledge', 'Specialized knowledge for the Osha Platform Assistant'),
  ('agent', 'echo', 'Echo Knowledge', 'Specialized knowledge for the Echo Customer Support AI'),
  ('agent', 'pulse', 'Pulse Knowledge', 'Specialized knowledge for the Pulse Community Manager AI'),
  ('agent', 'muse', 'Muse Knowledge', 'Specialized knowledge for the Muse Creative Ideation AI'),
  ('agent', 'pixel', 'Pixel Knowledge', 'Specialized knowledge for the Pixel Visual Creator AI'),
  ('agent', 'atlas', 'Atlas Knowledge', 'Specialized knowledge for the Atlas Deep Research AI');