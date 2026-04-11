-- Drop and recreate the match_knowledge function to use the correct vector type
DROP FUNCTION IF EXISTS public.match_knowledge;

-- Create match function for similarity search with proper vector reference
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding text,
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
SET search_path = public, extensions
AS $$
DECLARE
  query_vec extensions.vector(1536);
BEGIN
  -- Convert text to vector
  query_vec := query_embedding::extensions.vector(1536);
  
  RETURN QUERY
  SELECT
    ke.id,
    ke.source_type,
    ke.source_id,
    ke.chunk_index,
    ke.content,
    ke.metadata,
    (1 - (ke.embedding <=> query_vec))::FLOAT AS similarity
  FROM public.knowledge_embeddings ke
  WHERE 
    ke.embedding IS NOT NULL
    AND (filter_source_types IS NULL OR ke.source_type = ANY(filter_source_types))
    AND (filter_agent_id IS NULL OR 
         ke.metadata->>'agent_id' IS NULL OR 
         ke.metadata->>'agent_id' = filter_agent_id OR
         ke.metadata->'assigned_agents' ? filter_agent_id OR
         (ke.metadata->>'is_global')::boolean = true)
    AND (1 - (ke.embedding <=> query_vec)) > match_threshold
  ORDER BY ke.embedding <=> query_vec
  LIMIT match_count;
END;
$$;