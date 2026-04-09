-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create embedding source type enum
CREATE TYPE knowledge_source_type AS ENUM ('brain_document', 'heart_rule');

-- Create knowledge embeddings table
CREATE TABLE public.knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type knowledge_source_type NOT NULL,
  source_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding extensions.vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_id, chunk_index)
);

-- Create HNSW index for fast similarity search
CREATE INDEX knowledge_embeddings_embedding_idx 
ON public.knowledge_embeddings 
USING hnsw (embedding extensions.vector_cosine_ops);

-- Create index for source lookups
CREATE INDEX knowledge_embeddings_source_idx 
ON public.knowledge_embeddings (source_type, source_id);

-- Enable RLS
ALTER TABLE public.knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read embeddings
CREATE POLICY "Authenticated users can view knowledge embeddings"
ON public.knowledge_embeddings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins can manage embeddings (for manual cleanup if needed)
CREATE POLICY "Admins can manage knowledge embeddings"
ON public.knowledge_embeddings
FOR ALL
USING (is_admin(auth.uid()));

-- Create match function for similarity search
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_source_types knowledge_source_type[] DEFAULT NULL,
  filter_agent_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_type knowledge_source_type,
  source_id UUID,
  chunk_index INTEGER,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.source_type,
    ke.source_id,
    ke.chunk_index,
    ke.content,
    ke.metadata,
    (1 - (ke.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.knowledge_embeddings ke
  WHERE 
    (filter_source_types IS NULL OR ke.source_type = ANY(filter_source_types))
    AND (filter_agent_id IS NULL OR 
         ke.metadata->>'agent_id' IS NULL OR 
         ke.metadata->>'agent_id' = filter_agent_id OR
         ke.metadata->'assigned_agents' ? filter_agent_id OR
         (ke.metadata->>'is_global')::boolean = true)
    AND (1 - (ke.embedding <=> query_embedding)) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_knowledge_embeddings_updated_at
BEFORE UPDATE ON public.knowledge_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add processing status table to track embedding jobs
CREATE TABLE public.embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type knowledge_source_type NOT NULL,
  source_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index for finding pending jobs
CREATE INDEX embedding_jobs_status_idx ON public.embedding_jobs (status, created_at);

-- Enable RLS on jobs table
ALTER TABLE public.embedding_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage jobs
CREATE POLICY "Admins can manage embedding jobs"
ON public.embedding_jobs
FOR ALL
USING (is_admin(auth.uid()));