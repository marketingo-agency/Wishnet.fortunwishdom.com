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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
  openaiKey: string
): Promise<{ text: string; error?: string }> {
  try {
    console.log(`Processing page ${pageNumber} with OpenAI Vision...`);
    
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
              text: 'Extract all text from this document page. Return only the extracted text content, preserving the structure and formatting as much as possible. If there are tables, format them clearly. If there is no text, return an empty string.'
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
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Vision API error for page ${pageNumber}:`, errorData);
      return { text: '', error: errorData.error?.message || 'Vision API error' };
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    console.log(`Page ${pageNumber}: extracted ${text.length} characters`);
    
    return { text };
  } catch (error) {
    console.error(`Error processing page ${pageNumber}:`, error);
    return { text: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Chunk text using recursive character splitting
function chunkText(text: string, chunkSize = 1000, overlap = 100): string[] {
  if (text.length <= chunkSize) {
    return text.trim().length > 0 ? [text.trim()] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      const slice = text.slice(start, end);
      
      const paragraphBreak = slice.lastIndexOf('\n\n');
      if (paragraphBreak > chunkSize * 0.5) {
        end = start + paragraphBreak + 2;
      } else {
        const sentenceBreak = Math.max(
          slice.lastIndexOf('. '),
          slice.lastIndexOf('! '),
          slice.lastIndexOf('? ')
        );
        if (sentenceBreak > chunkSize * 0.5) {
          end = start + sentenceBreak + 2;
        } else {
          const wordBreak = slice.lastIndexOf(' ');
          if (wordBreak > chunkSize * 0.5) {
            end = start + wordBreak + 1;
          }
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    start = end - overlap;
    
    if (start >= text.length - overlap) break;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

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
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuthClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      .select('name, category, section_id, restricted_agents')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each page with Vision API sequentially
    const pageResults: PageResult[] = [];
    for (const page of page_images.sort((a, b) => a.page_number - b.page_number)) {
      const result = await extractTextFromImage(
        page.image_base64,
        page.mime_type,
        page.page_number,
        openaiKey
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

    const chunks = chunkText(fullText);
    console.log(`Created ${chunks.length} chunks from this batch`);

    if (chunks.length === 0) {
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
    const embeddings = await generateEmbeddingsBatched(chunks, openaiKey, 50);
    console.log(`Generated ${embeddings.length} embeddings`);

    const metadata = {
      document_name: document.name,
      category: document.category,
      section_id: document.section_id,
      restricted_agents: document.restricted_agents,
      extraction_method: 'ocr_vision',
      page_count: page_images.length,
    };

    const embeddingRecords = chunks.map((content, index) => ({
      source_type: 'brain_document' as const,
      source_id: document_id,
      chunk_index: chunkIndexOffset + index,
      content,
      embedding: JSON.stringify(embeddings[index]),
      metadata,
    }));

    const { error: insertError } = await supabase
      .from('knowledge_embeddings')
      .insert(embeddingRecords);

    if (insertError) {
      console.error('Error inserting embeddings:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store embeddings', details: insertError.message }),
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
