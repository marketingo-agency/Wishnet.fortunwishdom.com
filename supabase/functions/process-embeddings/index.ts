/**
 * Process Embeddings Edge Function
 *
 * Extracts text from Brain documents and Heart rules,
 * chunks the content, generates embeddings using OpenAI,
 * and stores them in the knowledge_embeddings table.
 *
 * Supported formats:
 * - DOCX (via fflate - lightweight unzip)
 * - Excel/Spreadsheets (via SheetJS)
 * - Text files (TXT, MD, JSON, CSV, HTML)
 *
 * Note: PDFs and images require client-side OCR via the process-ocr function
 *
 * RAG-013: OpenAI API key sourcing
 * This function reads OPENAI_API_KEY from the Deno env var (set in Supabase
 * dashboard > Edge Functions > Secrets). This is consistent with all other
 * edge functions after SEC-001 dropped the key columns from the llm_settings
 * DB table. All functions now use env vars exclusively for API keys.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { z } from 'https://esm.sh/zod@3.23.8';
import { chunkText, type ChunkResult } from '../_shared/chunker.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RequestBodySchema = z.object({
  action: z.enum(['process_document', 'process_rule', 'process_entry', 'delete', 'reprocess_all']),
  source_type: z.enum(['brain_document', 'heart_rule', 'wishpedia_entry']),
  source_id: z.string().regex(UUID_RE, 'Invalid UUID format').optional(),
});

// Safety limits to prevent memory exhaustion
const MAX_TEXT_LENGTH = 300000; // ~300k chars max
const MAX_CHUNKS = 150; // Cap chunks per document
const BATCH_SIZE = 50; // RAG-007: bumped from 3 → 50 for ~25x faster indexing
const MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024; // 5MB max request body

// Paginated delete: removes all matching rows in batches to avoid the 1000-row PostgREST limit
// deno-lint-ignore no-explicit-any
async function deleteAllEmbeddings(supabase: any, sourceId: string): Promise<number> {
  let totalDeleted = 0;
  const PAGE_SIZE = 500;

  while (true) {
    // Fetch a batch of IDs to delete
    const { data: rows, error: fetchError } = await supabase
      .from('knowledge_embeddings')
      .select('id')
      .eq('source_id', sourceId)
      .limit(PAGE_SIZE);

    if (fetchError) {
      throw new Error(`Failed to query embeddings for deletion: ${fetchError.message}`);
    }

    if (!rows || rows.length === 0) break;

    const ids = rows.map((r: { id: string }) => r.id);
    const { error: deleteError } = await supabase
      .from('knowledge_embeddings')
      .delete()
      .in('id', ids);

    if (deleteError) {
      throw new Error(`Failed to delete embeddings batch: ${deleteError.message}`);
    }

    totalDeleted += ids.length;
    console.log(`[DELETE] Removed ${ids.length} rows (total: ${totalDeleted})`);

    // If we got fewer than PAGE_SIZE, we're done
    if (rows.length < PAGE_SIZE) break;
  }

  return totalDeleted;
}

// RAG-005: chunkText imported from _shared/chunker.ts

// Efficiently serialize embedding vector to string
function serializeVector(embedding: number[]): string {
  // Build string manually to reduce intermediate allocations
  let result = '[';
  for (let i = 0; i < embedding.length; i++) {
    if (i > 0) result += ',';
    result += embedding[i].toString();
  }
  result += ']';
  return result;
}

// Generate embeddings using OpenAI
async function generateEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  console.log(`[EMBED] Requesting embeddings for ${texts.length} texts...`);
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`[EMBED] Received ${data.data.length} embeddings`);
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

// Extract text from DOCX using fflate (lightweight unzip)
async function extractDocxText(fileData: Blob): Promise<string> {
  console.log('[DOCX] Starting extraction with fflate...');
  
  try {
    // Use fflate - much lighter than JSZip
    const fflate = await import('https://esm.sh/fflate@0.8.2');
    
    console.log('[DOCX] Converting to arrayBuffer...');
    const arrayBuffer = await fileData.arrayBuffer();
    console.log(`[DOCX] ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
    
    // Unzip synchronously - fflate is efficient
    console.log('[DOCX] Unzipping...');
    const uint8Array = new Uint8Array(arrayBuffer);
    const unzipped = fflate.unzipSync(uint8Array);
    
    // Find and extract word/document.xml
    const docXmlKey = Object.keys(unzipped).find(k => k === 'word/document.xml');
    if (!docXmlKey) {
      console.log('[DOCX] No word/document.xml found');
      return '';
    }
    
    console.log('[DOCX] Decoding document.xml...');
    const docXml = new TextDecoder().decode(unzipped[docXmlKey]);
    console.log(`[DOCX] XML length: ${docXml.length} chars`);
    
    // Free memory immediately
    // @ts-ignore - help GC
    unzipped[docXmlKey] = null;
    
    // Extract text from XML - remove tags and get text content
    const text = docXml
      // Remove XML declaration and processing instructions
      .replace(/<\?[^?]*\?>/g, '')
      // Extract text from w:t tags (Word text elements)
      .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1')
      // Replace paragraph and break markers with newlines
      .replace(/<w:p[^>]*>/g, '\n')
      .replace(/<w:br[^>]*>/g, '\n')
      // Remove all remaining XML tags
      .replace(/<[^>]+>/g, '')
      // Decode XML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`[DOCX] Extracted: ${text.length} characters`);
    return text;
  } catch (error) {
    console.error('[DOCX] Extraction failed:', error);
    return '';
  }
}

// Extract text from spreadsheets using SheetJS
async function extractSpreadsheetText(fileData: Blob): Promise<string> {
  console.log('[XLSX] Starting extraction...');
  
  try {
    // @ts-ignore - dynamic import with types
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    const allText: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        allText.push(`Sheet: ${sheetName}\n${csv}`);
      }
    }
    
    const fullText = allText.join('\n\n');
    console.log(`[XLSX] Extracted: ${workbook.SheetNames.length} sheets, ${fullText.length} chars`);
    return fullText;
  } catch (error) {
    console.error('[XLSX] Extraction failed:', error);
    return '';
  }
}


// Main text extraction function with multi-format support
// deno-lint-ignore no-explicit-any
async function extractTextFromFile(
  supabase: any,
  storagePath: string,
  mimeType: string,
  openaiKey: string
): Promise<string> {
  console.log(`[EXTRACT] File: ${storagePath} (${mimeType})`);
  
  // Download the file
  console.log('[EXTRACT] Downloading...');
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('brain-documents')
    .download(storagePath);
  
  if (downloadError) {
    throw new Error(`Failed to download file: ${downloadError.message}`);
  }
  console.log(`[EXTRACT] Downloaded: ${fileData.size} bytes`);

  // Handle plain text files
  if (mimeType.includes('text/plain') || mimeType.includes('text/markdown')) {
    const text = await fileData.text();
    console.log(`[EXTRACT] Plain text: ${text.length} chars`);
    return text;
  }
  
  // Handle JSON files
  if (mimeType.includes('application/json')) {
    const jsonContent = await fileData.text();
    try {
      const parsed = JSON.parse(jsonContent);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonContent;
    }
  }
  
  // Handle HTML files
  if (mimeType.includes('text/html')) {
    const html = await fileData.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`[EXTRACT] HTML: ${text.length} chars`);
    return text;
  }
  
  // Handle CSV files
  if (mimeType.includes('text/csv')) {
    const text = await fileData.text();
    console.log(`[EXTRACT] CSV: ${text.length} chars`);
    return text;
  }
  
  // Handle PDF files - require client-side OCR to avoid memory limits
  if (mimeType.includes('application/pdf')) {
    console.log('[EXTRACT] PDF detected - requires client-side OCR');
    return '';
  }
  
  // Handle Word documents (DOCX)
  if (mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml') ||
      mimeType.includes('application/msword')) {
    return await extractDocxText(fileData);
  }
  
  // Handle Excel and spreadsheets
  if (mimeType.includes('spreadsheet') || 
      mimeType.includes('excel') || 
      mimeType.includes('.sheet') ||
      mimeType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml') ||
      mimeType.includes('application/vnd.ms-excel')) {
    return await extractSpreadsheetText(fileData);
  }
  
  // Handle images - require client-side OCR
  if (mimeType.startsWith('image/')) {
    console.log('[EXTRACT] Image detected - requires client-side OCR');
    return '';
  }
  
  // Try to read as text for unknown types
  try {
    const text = await fileData.text();
    console.log(`[EXTRACT] Unknown type as text: ${text.length} chars`);
    return text;
  } catch {
    console.log(`[EXTRACT] Could not extract from ${mimeType}`);
    return '';
  }
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
    const { action, source_type, source_id } = parsed.data;
    
    console.log(`[MAIN] action=${action}, source_type=${source_type}, source_id=${source_id}`);
    
    // Handle delete action
    if (action === 'delete') {
      if (!source_id) {
        throw new Error('source_id required for delete action');
      }
      
      const deletedCount = await deleteAllEmbeddings(supabaseAdmin, source_id);
      console.log(`[MAIN] Deleted ${deletedCount} embeddings for source_id=${source_id}`);
      
      return new Response(
        JSON.stringify({ success: true, deleted: source_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process document
    if (action === 'process_document' && source_type === 'brain_document') {
      if (!source_id) {
        throw new Error('source_id required for process_document action');
      }
      
      // Fetch document details
      const { data: doc, error: docError } = await supabaseAdmin
        .from('brain_documents')
        .select('*')
        .eq('id', source_id)
        .single();
      
      if (docError || !doc) {
        throw new Error(`Document not found: ${docError?.message || 'Unknown error'}`);
      }
      
      console.log(`[MAIN] Processing: ${doc.name} (${doc.mime_type})`);
      
      // Extract text with new multi-format support
      let text = await extractTextFromFile(supabaseAdmin, doc.storage_path, doc.mime_type, openaiKey);
      
      if (!text || text.trim().length === 0) {
        console.log('[MAIN] No text extracted, skipping embedding generation');
        return new Response(
          JSON.stringify({ success: true, message: 'No text content to embed', chunks: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Safety: cap text length to prevent memory exhaustion
      let truncated = false;
      if (text.length > MAX_TEXT_LENGTH) {
        console.log(`[MAIN] Text too large (${text.length} chars), truncating to ${MAX_TEXT_LENGTH}`);
        text = text.slice(0, MAX_TEXT_LENGTH);
        truncated = true;
      }
      
      // Chunk the text
      const chunks = chunkText(text);
      console.log(`[MAIN] Created ${chunks.length} chunks${truncated ? ' (truncated)' : ''}`);
      
      if (chunks.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No chunks created', chunks: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Delete existing embeddings for this document (paginated)
      await deleteAllEmbeddings(supabaseAdmin, source_id);
      
      // Build metadata once
      const metadata = {
        name: doc.name,
        category: doc.category,
        section_id: doc.section_id,
        restricted_agents: doc.restricted_agents,
        mime_type: doc.mime_type,
      };
      
      // Process in small batches with error recovery
      let insertedCount = 0;
      let failedBatches = 0;
      const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
      
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const texts = batch.map((c) => c.content);

        try {
          console.log(`[MAIN] Batch ${batchNum}/${totalBatches}: generating embeddings...`);
          const embeddings = await generateEmbeddings(texts, openaiKey);

          console.log(`[MAIN] Batch ${batchNum}/${totalBatches}: inserting...`);
          const insertData = batch.map((chunk, j) => ({
            source_type: 'brain_document' as const,
            source_id: source_id,
            chunk_index: chunk.index,
            content: chunk.content,
            embedding: serializeVector(embeddings[j]),
            metadata,
          }));

          const { error: insertError } = await supabaseAdmin
            .from('knowledge_embeddings')
            .insert(insertData);

          if (insertError) {
            console.error(`[MAIN] Batch ${batchNum} insert failed: ${insertError.message}`);
            failedBatches++;
            continue;
          }

          insertedCount += insertData.length;
          console.log(`[MAIN] Batch ${batchNum}/${totalBatches}: done (total: ${insertedCount})`);
        } catch (batchError) {
          console.error(`[MAIN] Batch ${batchNum} failed:`, batchError);
          failedBatches++;
          continue; // Skip failed batch, proceed with remaining
        }
      }

      if (insertedCount === 0 && failedBatches > 0) {
        throw new Error(`All ${failedBatches} embedding batches failed`);
      }

      console.log(`[MAIN] Success: ${insertedCount} embeddings for ${doc.name}${failedBatches > 0 ? ` (${failedBatches} batches failed)` : ''}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          document: doc.name,
          chunks: insertedCount,
          failed_batches: failedBatches,
          truncated
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process rule
    if (action === 'process_rule' && source_type === 'heart_rule') {
      if (!source_id) {
        throw new Error('source_id required for process_rule action');
      }
      
      // Fetch rule details
      const { data: rule, error: ruleError } = await supabaseAdmin
        .from('heart_rules')
        .select('*')
        .eq('id', source_id)
        .single();
      
      if (ruleError || !rule) {
        throw new Error(`Rule not found: ${ruleError?.message || 'Unknown error'}`);
      }
      
      console.log(`[MAIN] Processing rule: ${rule.name}`);
      
      // Combine rule content with context
      const fullContent = [
        `Rule: ${rule.name}`,
        rule.description ? `Description: ${rule.description}` : '',
        `Category: ${rule.category}`,
        `Content: ${rule.rule_content}`,
      ].filter(Boolean).join('\n\n');
      
      // Chunk the text (rules are usually smaller, might be single chunk)
      const chunks = chunkText(fullContent);
      console.log(`[MAIN] Created ${chunks.length} chunks for rule`);
      
      // Delete existing embeddings for this rule (paginated)
      await deleteAllEmbeddings(supabaseAdmin, source_id);
      
      if (chunks.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No chunks created', chunks: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Generate embeddings (rules are small, can do in one batch)
      const texts = chunks.map(c => c.content);
      const embeddings = await generateEmbeddings(texts, openaiKey);
      
      // Build metadata
      const metadata = {
        name: rule.name,
        category: rule.category,
        priority: rule.priority,
        is_global: rule.is_global,
        assigned_agents: rule.assigned_agents,
        is_active: rule.is_active,
      };
      
      // Insert embeddings
      const insertData = chunks.map((chunk, i) => ({
        source_type: 'heart_rule' as const,
        source_id: source_id,
        chunk_index: chunk.index,
        content: chunk.content,
        embedding: serializeVector(embeddings[i]),
        metadata,
      }));
      
      const { error: insertError } = await supabaseAdmin
        .from('knowledge_embeddings')
        .insert(insertData);
      
      if (insertError) {
        throw new Error(`Failed to insert rule embeddings: ${insertError.message}`);
      }
      
      console.log(`[MAIN] Success: ${insertData.length} embeddings for rule ${rule.name}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          rule: rule.name,
          chunks: insertData.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process Wishpedia entry
    if (action === 'process_entry' && source_type === 'wishpedia_entry') {
      if (!source_id) {
        throw new Error('source_id required for process_entry action');
      }
      
      // Fetch entry with category
      const [entryResult, imagesResult] = await Promise.all([
        supabaseAdmin
          .from('wishpedia_entries')
          .select('*, wishpedia_categories(*)')
          .eq('id', source_id)
          .single(),
        supabaseAdmin
          .from('wishpedia_entry_images')
          .select('*')
          .eq('entry_id', source_id)
          .order('sort_order', { ascending: true }),
      ]);
      
      if (entryResult.error || !entryResult.data) {
        throw new Error(`Wishpedia entry not found: ${entryResult.error?.message || 'Unknown error'}`);
      }
      
      const entry = entryResult.data;
      const images = imagesResult.data || [];
      const category = entry.wishpedia_categories;
      
      console.log(`[MAIN] Processing Wishpedia entry: ${entry.name} (${images.length} images)`);
      
      // Build public URLs for images
      const storageBaseUrl = `${supabaseUrl}/storage/v1/object/public/wishpedia-media`;
      const imageInventory = images.map((img: { angle: string | null; storage_path: string; original_name: string }) => {
        const url = `${storageBaseUrl}/${img.storage_path}`;
        const label = img.angle ? img.angle.toUpperCase() : 'Gallery';
        return { angle: label, url, name: img.original_name };
      });
      
      // Build structured text for embedding
      const textParts = [
        `Character/Entry: ${entry.name}`,
        category ? `Category: ${category.name}` : '',
        entry.description ? `Description: ${entry.description}` : '',
      ];
      
      // Add image inventory as text so it becomes searchable
      if (imageInventory.length > 0) {
        textParts.push('Visual References:');
        for (const img of imageInventory) {
          textParts.push(`- ${img.angle} view: ${img.name} (${img.url})`);
        }
      }
      
      const fullContent = textParts.filter(Boolean).join('\n\n');
      
      if (!fullContent || fullContent.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No content to embed', chunks: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Chunk the text
      const chunks = chunkText(fullContent);
      console.log(`[MAIN] Created ${chunks.length} chunks for Wishpedia entry`);
      
      // Delete existing embeddings (paginated)
      await deleteAllEmbeddings(supabaseAdmin, source_id);
      
      if (chunks.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No chunks created', chunks: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Generate embeddings
      const texts = chunks.map(c => c.content);
      const embeddings = await generateEmbeddings(texts, openaiKey);
      
      // Build metadata with image URLs for retrieval
      const metadata = {
        entry_name: entry.name,
        category_name: category?.name || 'Uncategorized',
        category_id: entry.category_id,
        image_urls: imageInventory,
        has_angle_views: category?.has_angle_views || false,
      };
      
      // Insert embeddings
      const insertData = chunks.map((chunk, i) => ({
        source_type: 'wishpedia_entry' as const,
        source_id: source_id,
        chunk_index: chunk.index,
        content: chunk.content,
        embedding: serializeVector(embeddings[i]),
        metadata,
      }));
      
      const { error: insertError } = await supabaseAdmin
        .from('knowledge_embeddings')
        .insert(insertData);
      
      if (insertError) {
        throw new Error(`Failed to insert Wishpedia embeddings: ${insertError.message}`);
      }
      
      console.log(`[MAIN] Success: ${insertData.length} embeddings for Wishpedia entry ${entry.name}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          entry: entry.name,
          chunks: insertData.length,
          images: imageInventory.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error(`Unknown action: ${action}`);
    
  } catch (error) {
    console.error('[ERROR]', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
