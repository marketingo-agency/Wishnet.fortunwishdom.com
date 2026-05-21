/**
 * Process OCR Edge Function
 * 
 * Accepts pre-rendered page images (from client-side PDF rendering)
 * and processes them via OpenAI Vision for text extraction,
 * then chunks and embeds the extracted text.
 * 
 * Supports `append` mode for batched multi-call processing of large PDFs.
 * When append=true, existing embeddings are NOT deleted, allowing incremental accumulation.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://esm.sh/zod@3.23.8';
import { chunkText } from '../_shared/chunker.ts';
import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';
// SEC-003: CORS comes from the shared allowlist (computed per-request inside the handler).
// SEC-004: 10 requests per minute per user — vision OCR is expensive (gpt-4o per page).
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PageImageSchema = z.object({
  page_number: z.number().int().min(1).max(500),
  image_base64: z.string().min(1).max(10_000_000), // ~7.5MB max per image
  mime_type: z.enum(['image/png', 'image/jpeg']),
});

const RequestBodySchema = z.object({
  document_id: z.string().regex(UUID_RE, 'Invalid UUID format'),
  page_images: z.array(PageImageSchema).min(1).max(50),
  append: z.boolean().optional().default(false),
});

const MAX_REQUEST_BODY_BYTES = 100 * 1024 * 1024; // 100MB max (base64 images are large)

interface PageResult {
  page_number: number;
  text: string;
  success: boolean;
  error?: string;
}

// Extract text from a single image using OpenAI Vision
async function extractTextFromImage(
  imageBase64: string,
  mimeType: string,
  pageNumber: number,
  openaiKey: string,
  describeMode = false
): Promise<{ text: string; error?: string }> {
  try {
    console.log(`Processing page ${pageNumber} with OpenAI Vision (describe=${describeMode})...`);

    // Standalone images (describeMode): produce a rich visual description PLUS any
    // OCR text, so picture-only images become findable by semantic search.
    // PDF pages (default): pure OCR, preserving document structure.
    const promptText = describeMode
      ? 'You are indexing an image for a searchable knowledge base. First write a detailed visual description: subject, scene, composition, style, colors, notable objects/characters, mood, and any logos or symbols. Then, on a new line starting with "TEXT:", transcribe ALL text visible in the image verbatim (write "TEXT: (none)" if there is no text). Be thorough and specific so the image can be retrieved by meaning.'
      : 'Extract all text from this document page. Return only the extracted text content, preserving the structure and formatting as much as possible. If there are tables, format them clearly. If there is no text, return an empty string.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: promptText
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }],
        max_tokens: TOKEN_BUDGETS.OCR_EXTRACTION,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Vision API error for page ${pageNumber}:`, errorData);
      return { text: '', error: 'Vision processing failed' };
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    console.log(`Page ${pageNumber}: extracted ${text.length} characters`);
    
    return { text };
  } catch (error) {
    console.error(`Error processing page ${pageNumber}:`, error);
    return { text: '', error: 'Internal error' };
  }
}

// RAG-005: chunkText imported from _shared/chunker.ts

// Generate embeddings using OpenAI — batched to avoid timeouts
async function generateEmbeddingsBatched(
  texts: string[],
  openaiKey: string,
  batchSize = 50
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(`Generating embeddings for batch ${Math.floor(i / batchSize) + 1} (${batch.length} chunks)...`);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: batch,
        dimensions: 1536,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Embedding API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    allEmbeddings.push(...data.data.map((item: { embedding: number[] }) => item.embedding));
  }

  return allEmbeddings;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // Verify auth via getUser (server round-trip, validates token properly)
    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SEC-004: rate limit (vision OCR is expensive)
    if (rateLimiter.check(user.id)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a minute and try again.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    // Check Content-Length before parsing
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_REQUEST_BODY_BYTES) {
      return new Response(
        JSON.stringify({ error: `Request body too large (${contentLength} bytes). Max: ${MAX_REQUEST_BODY_BYTES} bytes` }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.json();
    const parsed = RequestBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { document_id, page_images, append } = parsed.data;

    console.log(`Processing OCR for document ${document_id}: ${page_images.length} pages, append=${append}`);

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get document info for metadata
    const { data: document, error: docError } = await supabase
      .from('brain_documents')
      .select('name, category, section_id, restricted_agents, mime_type, storage_path')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // A standalone image document (vs. PDF pages rendered to images) gets the
    // richer describe+OCR treatment so picture-only content is searchable.
    const isStandaloneImage = (document.mime_type || '').startsWith('image/');

    // Process each page with Vision API sequentially
    const pageResults: PageResult[] = [];
    for (const page of page_images.sort((a, b) => a.page_number - b.page_number)) {
      const result = await extractTextFromImage(
        page.image_base64,
        page.mime_type,
        page.page_number,
        openaiKey,
        isStandaloneImage
      );
      
      pageResults.push({
        page_number: page.page_number,
        text: result.text,
        success: !result.error,
        error: result.error,
      });
    }

    const fullText = pageResults
      .filter(r => r.success && r.text.length > 0)
      .map(r => `--- Page ${r.page_number} ---\n${r.text}`)
      .join('\n\n');

    console.log(`Total extracted text: ${fullText.length} characters from ${pageResults.filter(r => r.success).length} pages`);

    if (fullText.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          chunks: 0,
          pages_processed: 0,
          total_pages: page_images.length,
          characters_extracted: 0,
          page_results: pageResults
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only delete existing embeddings on the FIRST batch (append=false)
    // Subsequent batches accumulate results instead of overwriting
    if (!append) {
      console.log(`First batch — deleting existing embeddings for document ${document_id}`);
      const { error: deleteError } = await supabase
        .from('knowledge_embeddings')
        .delete()
        .eq('source_type', 'brain_document')
        .eq('source_id', document_id);

      if (deleteError) {
        console.error('Error deleting old embeddings:', deleteError);
      }
    } else {
      console.log(`Append mode — keeping existing embeddings, adding new chunks`);
    }

    // Get current max chunk_index for append mode to avoid conflicts
    let chunkIndexOffset = 0;
    if (append) {
      const { data: existingChunks } = await supabase
        .from('knowledge_embeddings')
        .select('chunk_index')
        .eq('source_type', 'brain_document')
        .eq('source_id', document_id)
        .order('chunk_index', { ascending: false })
        .limit(1);

      if (existingChunks && existingChunks.length > 0) {
        chunkIndexOffset = existingChunks[0].chunk_index + 1;
      }
    }

    const chunkResults = chunkText(fullText);
    // Extract content strings for the embedding API
    const chunkTexts = chunkResults.map(c => c.content);
    console.log(`Created ${chunkResults.length} chunks from this batch`);

    if (chunkResults.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          chunks: 0,
          pages_processed: pageResults.filter(r => r.success).length,
          total_pages: page_images.length,
          characters_extracted: fullText.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embeddings in batches of 50 to stay within limits
    const embeddings = await generateEmbeddingsBatched(chunkTexts, openaiKey, 50);
    console.log(`Generated ${embeddings.length} embeddings`);

    const metadata = {
      document_name: document.name,
      category: document.category,
      section_id: document.section_id,
      restricted_agents: document.restricted_agents,
      extraction_method: isStandaloneImage ? 'vision_describe' : 'ocr_vision',
      page_count: page_images.length,
      // Multimodal: flag image docs and carry the storage path so retrieval can
      // mint a signed URL and attach the actual image to vision-model calls.
      is_image: isStandaloneImage,
      mime_type: document.mime_type,
      storage_path: document.storage_path,
    };

    const embeddingRecords = chunkResults.map((chunk, index) => ({
      source_type: 'brain_document' as const,
      source_id: document_id,
      chunk_index: chunkIndexOffset + chunk.index,
      content: chunk.content,
      embedding: JSON.stringify(embeddings[index]),
      metadata,
    }));

    const { error: insertError } = await supabase
      .from('knowledge_embeddings')
      .insert(embeddingRecords);

    if (insertError) {
      console.error('Error inserting embeddings:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store embeddings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully stored ${embeddingRecords.length} embeddings for document ${document_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        chunks: embeddingRecords.length,
        pages_processed: pageResults.filter(r => r.success).length,
        total_pages: page_images.length,
        characters_extracted: fullText.length,
        page_results: pageResults.map(r => ({
          page: r.page_number,
          success: r.success,
          chars: r.text.length,
          error: r.error,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OCR processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
