/**
 * Search Knowledge Edge Function
 * 
 * Performs vector similarity search on the knowledge_embeddings table
 * to find relevant Brain documents and Heart rules for AI agents.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
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
  // RAG-011: lowered from 0.7 to 0.5 — text-embedding-3-small cosine
  // similarities are generally lower than ada-002, so 0.7 was too aggressive
  threshold: z.number().min(0).max(1).optional().default(0.5),
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
    // Verify auth via getUser (server round-trip, validates token properly)
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
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
    
    // RAG-004: hybrid search — combine vector similarity + BM25 full-text
    const { data: results, error: searchError } = await supabaseAdmin
      .rpc('match_knowledge_hybrid', {
        query_embedding: embeddingString,
        query_text: query,
        match_threshold: threshold,
        match_count: limit,
        filter_source_types: source_types || null,
        filter_agent_id: agent_id || null,
        vector_weight: 0.7,
        text_weight: 0.3,
      });

    if (searchError) {
      // Fallback to original vector-only search if hybrid fails
      console.warn('Hybrid search failed, falling back to vector-only:', searchError.message);
      const { data: fallbackResults, error: fallbackError } = await supabaseAdmin
        .rpc('match_knowledge', {
          query_embedding: embeddingString,
          match_threshold: threshold,
          match_count: limit,
          filter_source_types: source_types || null,
          filter_agent_id: agent_id || null,
        });
      if (fallbackError) throw new Error(`Search failed: ${fallbackError.message}`);
      var searchResults: SearchResult[] = fallbackResults || [];
    } else {
      var searchResults: SearchResult[] = results || [];
    }
    console.log(`Found ${searchResults.length} matching chunks (hybrid)`);
    
    // RAG-008: batch enrichment queries by source_type instead of N+1 per result
    const docIds = [...new Set(searchResults.filter(r => r.source_type === 'brain_document').map(r => r.source_id))];
    const ruleIds = [...new Set(searchResults.filter(r => r.source_type === 'heart_rule').map(r => r.source_id))];
    const entryIds = [...new Set(searchResults.filter(r => r.source_type === 'wishpedia_entry').map(r => r.source_id))];

    // 3 batched queries instead of up to 30 individual ones
    const [docsResult, rulesResult, entriesResult] = await Promise.all([
      docIds.length > 0
        ? supabaseAdmin.from('brain_documents').select('id, name, category, description').in('id', docIds)
        : Promise.resolve({ data: [] }),
      ruleIds.length > 0
        ? supabaseAdmin.from('heart_rules').select('id, name, category, description, is_active').in('id', ruleIds)
        : Promise.resolve({ data: [] }),
      entryIds.length > 0
        ? supabaseAdmin.from('wishpedia_entries').select('id, name, description, category_id').in('id', entryIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Build lookup maps
    const docMap = new Map((docsResult.data || []).map((d: any) => [d.id, d]));
    const ruleMap = new Map((rulesResult.data || []).map((r: any) => [r.id, r]));
    const entryMap = new Map((entriesResult.data || []).map((e: any) => [e.id, e]));

    // Batch-fetch wishpedia categories + images if needed
    const categoryIds = [...new Set((entriesResult.data || []).map((e: any) => e.category_id).filter(Boolean))];
    const [categoriesResult, imagesResult] = await Promise.all([
      categoryIds.length > 0
        ? supabaseAdmin.from('wishpedia_categories').select('id, name').in('id', categoryIds)
        : Promise.resolve({ data: [] }),
      entryIds.length > 0
        ? supabaseAdmin.from('wishpedia_entry_images').select('entry_id, angle, original_name').in('entry_id', entryIds).order('sort_order')
        : Promise.resolve({ data: [] }),
    ]);

    const categoryMap = new Map((categoriesResult.data || []).map((c: any) => [c.id, c.name]));
    const imagesByEntry = new Map<string, any[]>();
    for (const img of (imagesResult.data || [])) {
      const list = imagesByEntry.get(img.entry_id) || [];
      list.push(img);
      imagesByEntry.set(img.entry_id, list);
    }

    // Enrich results using lookup maps (zero additional queries)
    const enrichedResults = searchResults.map((result) => {
      let source: Record<string, unknown> = {};

      if (result.source_type === 'brain_document') {
        const doc = docMap.get(result.source_id);
        if (doc) source = { name: doc.name, category: doc.category, description: doc.description, type: 'document' };
      } else if (result.source_type === 'heart_rule') {
        const rule = ruleMap.get(result.source_id);
        if (rule) source = { name: rule.name, category: rule.category, description: rule.description, is_active: rule.is_active, type: 'rule' };
      } else if (result.source_type === 'wishpedia_entry') {
        const entry = entryMap.get(result.source_id);
        if (entry) {
          const images = imagesByEntry.get(result.source_id) || [];
          source = {
            name: entry.name,
            category: categoryMap.get(entry.category_id) || '',
            description: entry.description,
            type: 'entry',
            image_urls: images.map((img: any) => ({
              angle: img.angle,
              url: `${supabaseUrl}/storage/v1/object/public/wishpedia-media/${result.source_id}/${img.original_name}`,
            })),
          };
        }
      }

      return { ...result, source };
    });

    // RAG-012: apply source-type weighting — heart_rules are authoritative
    // brand guidelines and should rank above documents at equal similarity
    const SOURCE_WEIGHT: Record<string, number> = {
      heart_rule: 1.15,       // +15% boost for rules (brand authority)
      brain_document: 1.0,    // baseline
      wishpedia_entry: 1.05,  // slight boost for product knowledge
    };
    const weightedResults = enrichedResults
      .map(r => ({
        ...r,
        weighted_similarity: r.similarity * (SOURCE_WEIGHT[r.source_type] || 1.0),
      }))
      .sort((a, b) => b.weighted_similarity - a.weighted_similarity);

    return new Response(
      JSON.stringify({
        success: true,
        results: weightedResults,
        count: weightedResults.length,
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
