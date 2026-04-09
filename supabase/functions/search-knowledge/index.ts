/**
 * Search Knowledge Edge Function
 * 
 * Performs vector similarity search on the knowledge_embeddings table
 * to find relevant Brain documents and Heart rules for AI agents.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RequestBodySchema = z.object({
  query: z.string().trim().min(1, 'Query is required').max(2000),
  source_types: z.array(z.enum(['brain_document', 'heart_rule', 'wishpedia_entry'])).optional(),
  agent_id: z.string().regex(UUID_RE, 'Invalid agent_id').optional().or(z.literal('')),
  limit: z.number().int().min(1).max(50).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.7),
});

interface SearchResult {
  id: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

// Generate embedding for query
async function generateQueryEmbedding(query: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    const rawBody = await req.json();
    const parsed = RequestBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { query, source_types, agent_id, limit, threshold } = parsed.data;
    
    console.log(`Searching knowledge base: query="${query.substring(0, 50)}...", agent=${agent_id}, limit=${limit}`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query, openaiKey);
    
    // Convert to string format for the RPC call
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    // Call the match_knowledge function
    const { data: results, error: searchError } = await supabaseAdmin
      .rpc('match_knowledge', {
        query_embedding: embeddingString,
        match_threshold: threshold,
        match_count: limit,
        filter_source_types: source_types || null,
        filter_agent_id: agent_id || null,
      });
    
    if (searchError) {
      throw new Error(`Search failed: ${searchError.message}`);
    }
    
    const searchResults: SearchResult[] = results || [];
    console.log(`Found ${searchResults.length} matching chunks`);
    
    // Enrich results with source details
    const enrichedResults = await Promise.all(
      searchResults.map(async (result) => {
        let sourceDetails: Record<string, unknown> = {};
        
        if (result.source_type === 'brain_document') {
          const { data: doc } = await supabaseAdmin
            .from('brain_documents')
            .select('name, category, description')
            .eq('id', result.source_id)
            .single();
          
          if (doc) {
            sourceDetails = {
              name: doc.name,
              category: doc.category,
              description: doc.description,
              type: 'document',
            };
          }
        } else if (result.source_type === 'heart_rule') {
          const { data: rule } = await supabaseAdmin
            .from('heart_rules')
            .select('name, category, description, is_active')
            .eq('id', result.source_id)
            .single();
          
          if (rule) {
            sourceDetails = {
              name: rule.name,
              category: rule.category,
              description: rule.description,
              is_active: rule.is_active,
              type: 'rule',
            };
          }
        } else if (result.source_type === 'wishpedia_entry') {
          const { data: entry } = await supabaseAdmin
            .from('wishpedia_entries')
            .select('name, description, category_id')
            .eq('id', result.source_id)
            .single();
          
          if (entry) {
            // Fetch category name
            let categoryName = '';
            if (entry.category_id) {
              const { data: cat } = await supabaseAdmin
                .from('wishpedia_categories')
                .select('name')
                .eq('id', entry.category_id)
                .single();
              categoryName = cat?.name || '';
            }
            
            // Fetch associated images
            const { data: images } = await supabaseAdmin
              .from('wishpedia_entry_images')
              .select('angle, original_name')
              .eq('entry_id', result.source_id)
              .order('sort_order');
            
            // Build public URLs for images
            const imageUrls = (images || []).map(img => {
              const storagePath = `${result.source_id}/${img.original_name}`;
              return {
                angle: img.angle,
                url: `${supabaseUrl}/storage/v1/object/public/wishpedia-media/${storagePath}`,
              };
            });
            
            sourceDetails = {
              name: entry.name,
              category: categoryName,
              description: entry.description,
              type: 'entry',
              image_urls: imageUrls,
            };
          }
        }
        
        return {
          ...result,
          source: sourceDetails,
        };
      })
    );
    
    return new Response(
      JSON.stringify({ 
        success: true,
        results: enrichedResults,
        count: enrichedResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error searching knowledge:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
