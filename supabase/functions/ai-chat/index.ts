import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeForPrompt } from '../_shared/sanitize.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';

// SEC-004: 30 requests per minute per user
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

// SEC-003: CORS tightened from wildcard to allowed origins list
// corsHeaders is set per-request in Deno.serve based on the Origin header
let corsHeaders: Record<string, string> = getCorsHeaders(null);

interface RequestBody {
  action: 'chat' | 'test-connection' | 'generate-image' | 'generate-video' | 'start-research' | 'poll-research' | 'check-keys';
  provider: 'openai' | 'gemini';
  model?: string;
  message?: string;
  apiKey?: string;
  temperature?: number;
  systemPrompt?: string;
  isDeepResearch?: boolean;
  responseId?: string; // For polling deep research status
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// OpenAI capability mappings - specific models requested by user
const OPENAI_TEXT_CAPABLE = ['gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'gpt-4o', 'gpt-4o-mini'];
const OPENAI_DEEP_RESEARCH_CAPABLE = ['o3-deep-research', 'o4-mini-deep-research'];
const OPENAI_IMAGE_CAPABLE = ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'];
const OPENAI_VIDEO_CAPABLE = ['sora-2', 'sora-2-pro'];

// Gemini capability mappings
const GEMINI_TEXT_CAPABLE = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'];
const GEMINI_IMAGE_CAPABLE = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
const GEMINI_VIDEO_CAPABLE = ['veo-3.1-generate-preview'];

// Retry helper with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5, baseDelayMs = 1000): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Don't retry client errors (4xx) except 429 (rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      // Retry on 429 (rate limit) and 5xx (server errors including 503 high demand)
      if ((response.status === 429 || response.status >= 500) && i < maxRetries - 1) {
        const delay = Math.min(Math.pow(2, i) * baseDelayMs, 60000); // cap at 60s
        console.log(`Server error ${response.status}, retrying in ${delay / 1000}s... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        const delay = Math.min(Math.pow(2, i) * 1000, 16000);
        console.log(`Network error, retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// ─── Nexus knowledge helpers ─────────────────────────────────────────────────

async function fetchNexusHeartRules(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data } = await supabaseAdmin
    .from('heart_rules')
    .select('name, category, rule_content, priority')
    .eq('is_active', true)
    .or('is_global.eq.true,assigned_agents.cs.{"nexus"}');
  // AGENT-003: sanitize rule content before prompt interpolation
  return (data || []).map((r: any) => ({
    name: sanitizeForPrompt(r.name),
    category: r.category,
    rule_content: sanitizeForPrompt(r.rule_content),
    priority: r.priority,
  }));
}

async function generateEmbeddingForNexus(text: string, openaiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 2000) }),
  });
  if (!res.ok) throw new Error('Embedding generation failed');
  const json = await res.json();
  return json.data[0].embedding;
}

async function searchBrainForNexus(
  supabaseAdmin: ReturnType<typeof createClient>,
  query: string,
  openaiKey: string
): Promise<{ content: string }[]> {
  try {
    const embedding = await generateEmbeddingForNexus(query, openaiKey);
    const { data } = await supabaseAdmin.rpc('match_knowledge', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: 0.3,
      match_count: 8,
      filter_source_types: ['brain_document', 'wishpedia_entry'],
      filter_agent_id: null,
    });
    return (data || []) as { content: string }[];
  } catch (err) {
    console.warn('Brain search failed, continuing without context:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // SEC-003: set CORS headers based on request origin
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify auth via getUser (server round-trip, validates token properly)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = user.id;

    // SEC-004: rate limit check
    if (rateLimiter.check(userId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Parse request body first so we can gate by action
    const body: RequestBody = await req.json();
    const { action, provider, model, message, apiKey: providedApiKey, responseId } = body;

    // AGENT-002: only require admin for settings actions (test-connection, check-keys).
    // Chat, image gen, video gen, and research are open to all authenticated users.
    const ADMIN_ONLY_ACTIONS = ['test-connection', 'check-keys'];
    if (ADMIN_ONLY_ACTIONS.includes(action)) {
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError || roleData?.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`AI Chat request: action=${action}, provider=${provider}, requestedModel=${model}`);

    // Get LLM settings from database
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('llm_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Failed to fetch LLM settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch LLM settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle check-keys — returns which providers have keys configured (DB or env)
    if (action === 'check-keys') {
      return new Response(
        JSON.stringify({
          openai: !!(settings.openai_api_key || Deno.env.get('OPENAI_API_KEY')),
          gemini: !!(settings.gemini_api_key || Deno.env.get('GEMINI_API_KEY')),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle test connection - uses provided API key OR DB key OR env secret
    if (action === 'test-connection') {
      const testApiKey = providedApiKey || (provider === 'openai'
        ? (settings.openai_api_key || Deno.env.get('OPENAI_API_KEY'))
        : (settings.gemini_api_key || Deno.env.get('GEMINI_API_KEY')));
      
      if (!testApiKey) {
        return new Response(
          JSON.stringify({ error: `No API key configured for ${provider}. Please add it in LLM Settings or Supabase Edge Function secrets.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Testing ${provider} connection...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        if (provider === 'openai') {
          const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${testApiKey}`,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI test failed:', response.status, errorText);
            
            if (response.status === 401) {
              throw new Error('Invalid API key. Please check your OpenAI API key.');
            } else if (response.status === 429) {
              throw new Error('Rate limit exceeded. Please try again later.');
            } else {
              throw new Error(`OpenAI API error: ${response.status}`);
            }
          }

          const data = await response.json();
          const modelIds = data.data?.map((m: { id: string }) => m.id) || [];
          console.log(`OpenAI connection successful. Found ${modelIds.length} models.`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'OpenAI connection successful', 
              models: modelIds.length,
              availableModels: modelIds
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Gemini test - list models
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${testApiKey}`, {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini test failed:', response.status, errorText);
            
            if (response.status === 400 || response.status === 403) {
              throw new Error('Invalid API key. Please check your Gemini API key.');
            } else if (response.status === 429) {
              throw new Error('Rate limit exceeded. Please try again later.');
            } else {
              throw new Error(`Gemini API error: ${response.status}`);
            }
          }

          const data = await response.json();
          const modelIds = data.models?.map((m: { name: string }) => m.name.replace('models/', '')) || [];
          console.log(`Gemini connection successful. Found ${modelIds.length} models.`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Gemini connection successful', 
              models: modelIds.length,
              availableModels: modelIds
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Connection test timed out');
          return new Response(
            JSON.stringify({ error: 'Connection test timed out. Please try again.' }),
            { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw error;
      }
    }

    // Get API key: DB first, then env secret fallback
    const apiKey = provider === 'openai' 
      ? (settings.openai_api_key || Deno.env.get('OPENAI_API_KEY')) 
      : (settings.gemini_api_key || Deno.env.get('GEMINI_API_KEY'));

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `No API key configured for ${provider}. Please add it in LLM Settings or Supabase Edge Function secrets.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle start-research action (async deep research - returns response ID immediately)
    if (action === 'start-research') {
      if (!message) {
        return new Response(
          JSON.stringify({ error: 'Message is required for deep research' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const selectedModel = model || settings.openai_deep_research_model || 'o3-deep-research';
      console.log(`Starting deep research: model=${selectedModel}`);

      try {
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            input: message,
            tools: [{ type: 'web_search_preview' }],
            background: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI start-research error:', errorData);
          const msg = errorData.error?.message || 'Failed to start deep research';
          throw new Error(msg);
        }

        const data = await response.json();
        console.log(`Deep research started: id=${data.id}, status=${data.status}`);
        
        return new Response(
          JSON.stringify({ 
            responseId: data.id,
            status: data.status, // 'queued', 'in_progress', 'completed', 'failed'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error starting research';
        console.error('start-research error:', msg);
        return new Response(
          JSON.stringify({ error: msg }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle poll-research action (check status of async deep research)
    if (action === 'poll-research') {
      if (!responseId) {
        return new Response(
          JSON.stringify({ error: 'Response ID is required for polling' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Polling deep research: responseId=${responseId}`);

      try {
        const response = await fetch(`https://api.openai.com/v1/responses/${responseId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI poll-research error:', errorData);
          const msg = errorData.error?.message || 'Failed to poll deep research';
          throw new Error(msg);
        }

        const data = await response.json();
        console.log(`Deep research poll: status=${data.status}`);
        
        if (data.status === 'completed') {
          // Extract content from completed response
          const content = data.output_text || data.output?.[0]?.content?.[0]?.text || data.output || '';
          return new Response(
            JSON.stringify({ 
              status: 'completed',
              content,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (data.status === 'failed' || data.status === 'cancelled') {
          return new Response(
            JSON.stringify({ 
              status: data.status,
              error: data.error?.message || 'Research failed',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Still in progress
        return new Response(
          JSON.stringify({ 
            status: data.status, // 'queued', 'in_progress'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error polling research';
        console.error('poll-research error:', msg);
        return new Response(
          JSON.stringify({ error: msg }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle chat action
    if (action === 'chat') {
      if (!message) {
        return new Response(
          JSON.stringify({ error: 'Message is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const selectedModel = model || (provider === 'openai' ? settings.openai_text_model : settings.gemini_text_model);
      console.log(`Chat: provider=${provider}, resolvedModel=${selectedModel}`);

      // Validate model capability (includes deep research models for text)
      const allTextModels = [...OPENAI_TEXT_CAPABLE, ...OPENAI_DEEP_RESEARCH_CAPABLE];
      if (provider === 'openai' && !allTextModels.includes(selectedModel)) {
        console.warn(`Model ${selectedModel} not in verified text-capable list, proceeding anyway...`);
      }
      if (provider === 'gemini' && !GEMINI_TEXT_CAPABLE.includes(selectedModel)) {
        console.warn(`Model ${selectedModel} not in verified text-capable list, proceeding anyway...`);
      }

      // ── Inject Heart rules + Brain knowledge into the system prompt ──────────
      // Only for text chat (not image/video/research). Runs in parallel.
      const openaiKeyForEmbedding = Deno.env.get('OPENAI_API_KEY') || '';
      const [heartRules, brainChunks] = await Promise.all([
        fetchNexusHeartRules(supabaseAdmin),
        searchBrainForNexus(supabaseAdmin, message, openaiKeyForEmbedding),
      ]);

      let augmentedSystemPrompt = body.systemPrompt || 'You are a helpful AI assistant.';

      if (heartRules.length > 0) {
        const rulesText = heartRules
          .map(r => `- [${r.name}] ${r.rule_content}`)
          .join('\n');
        augmentedSystemPrompt =
          `MANDATORY COMPLIANCE RULES (must always follow, no exceptions):\n${rulesText}\n\n${augmentedSystemPrompt}`;
      }

      if (brainChunks.length > 0) {
        const brainText = brainChunks.map(c => c.content).join('\n\n');
        augmentedSystemPrompt += `\n\nBRAND & WISHPEDIA KNOWLEDGE BASE (includes Fortun universe characters, creatures, and brand context — use as authoritative source):\n${brainText}`;
      }

      console.log(`Nexus: injecting ${heartRules.length} Heart rules + ${brainChunks.length} Brain chunks`);
      // ────────────────────────────────────────────────────────────────────────

      if (provider === 'openai') {
        // Deep research models use the /v1/responses endpoint
        const isDeepResearchModel = OPENAI_DEEP_RESEARCH_CAPABLE.includes(selectedModel);
        
        if (isDeepResearchModel) {
          // Use the Responses API for deep research models
          // Deep research models require web_search_preview tool
          console.log(`Using /v1/responses endpoint for deep research model: ${selectedModel}`);
          
          const response = await fetchWithRetry('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: selectedModel,
              input: message,
              tools: [{ type: 'web_search_preview' }],
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI responses error:', errorData);
            
            const msg = errorData.error?.message || 'OpenAI API request failed';
            
            if (msg.includes('does not exist') || msg.includes('not found')) {
              return new Response(
                JSON.stringify({ 
                  error: `Model "${selectedModel}" not found`,
                  hint: 'Try o3-deep-research or o4-mini-deep-research. Run Test Connection to see available models.'
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            throw new Error(msg);
          }

          const data = await response.json();
          // The responses API returns output_text or output array
          const content = data.output_text || data.output?.[0]?.content?.[0]?.text || data.output || '';
          return new Response(
            JSON.stringify({ content }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Standard chat completions API for regular models
        // Newer models (o4, gpt-5) use max_completion_tokens
        const isNewerModel = selectedModel.startsWith('o4') || 
                            selectedModel.startsWith('gpt-5');
        
        const tokenParam = isNewerModel 
          ? { max_completion_tokens: 4096 }
          : { max_tokens: 2048 };

        // Get temperature from already-parsed body; use augmented system prompt
        const temperature = body.temperature ?? 0.7;
        const systemPrompt = augmentedSystemPrompt;

        // Build multi-turn messages array with full conversation history
        const historyMessages = (body.conversationHistory || [])
          .map((m: { role: 'user' | 'assistant'; content: string }) => ({
            role: m.role,
            content: m.content,
          }));

        const messages = [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...historyMessages,
          { role: 'user', content: message },
        ];

        const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages,
            temperature,
            ...tokenParam,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI chat error:', errorData);
          
          const msg = errorData.error?.message || 'OpenAI API request failed';
          
          // Check for model not found errors
          if (msg.includes('does not exist') || msg.includes('not found')) {
            return new Response(
              JSON.stringify({ 
                error: `Model "${selectedModel}" not found`,
                hint: 'Try gpt-4o-mini or gpt-4o. Run Test Connection to see available models.'
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          throw new Error(msg);
        }

        const data = await response.json();
        return new Response(
          JSON.stringify({ content: data.choices[0].message.content }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Gemini - normalize model name
        const modelName = selectedModel.replace(/^models\//, '');
        
        // Get temperature from already-parsed body; use augmented system prompt
        const temperature = body.temperature ?? 0.7;
        const systemPrompt = augmentedSystemPrompt;

        // Build multi-turn contents with full conversation history
        // Gemini uses 'model' instead of 'assistant' for assistant role
        const historyContents = (body.conversationHistory || [])
          .map((m: { role: 'user' | 'assistant'; content: string }) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }));

        const requestBody: Record<string, unknown> = {
          contents: [
            ...historyContents,
            { role: 'user', parts: [{ text: message }] },
          ],
          generationConfig: {
            temperature,
          },
        };
        
        if (systemPrompt) {
          requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
        }

        const response = await fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Gemini chat error:', errorData);

          const msg = errorData?.error?.message || 'Gemini API request failed';
          const isModelNotFound = typeof msg === 'string' &&
            (msg.includes('is not found') || msg.includes('not supported for generateContent'));

          if (isModelNotFound) {
            return new Response(
              JSON.stringify({
                error: `Model "${modelName}" not found`,
                hint: 'Try gemini-2.5-flash or gemini-3-pro-preview. Run Test Connection to see available models.'
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          throw new Error(msg);
        }

        const data = await response.json();
        return new Response(
          JSON.stringify({ content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle image generation
    if (action === 'generate-image') {
      if (!message) {
        return new Response(
          JSON.stringify({ error: 'Prompt is required for image generation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (provider === 'openai') {
        const selectedModel = model || settings.openai_image_model || 'gpt-image-1';
        console.log(`Image gen: provider=openai, resolvedModel=${selectedModel}`);

        // Validate model capability
        if (!OPENAI_IMAGE_CAPABLE.includes(selectedModel)) {
          return new Response(
            JSON.stringify({ 
              error: `Model "${selectedModel}" is not an image generation model`,
              hint: 'Use gpt-image-1.5, gpt-image-1, or gpt-image-1-mini for image generation.'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const response = await fetchWithRetry('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            prompt: message,
            n: 1,
            size: '1024x1024',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI image error:', errorData);
          
          const msg = errorData.error?.message || 'Image generation failed';
          
          if (msg.includes('does not exist') || msg.includes('not found')) {
            return new Response(
              JSON.stringify({ 
                error: `Model "${selectedModel}" not available`,
                hint: 'Try gpt-image-1 or gpt-image-1.5. Run Test Connection to verify available models.'
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          throw new Error(msg);
        }

        const data = await response.json();
        
        // Handle both URL and base64 responses
        const imageData = data.data[0];
        const imageUrl = imageData.url 
          ? imageData.url 
          : imageData.b64_json 
            ? `data:image/png;base64,${imageData.b64_json}` 
            : null;

        if (!imageUrl) {
          throw new Error('No image data received from OpenAI');
        }

        return new Response(
          JSON.stringify({ imageUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Gemini native image generation
        const selectedModel = model || settings.gemini_image_model || 'gemini-2.5-flash-image';
        const modelName = selectedModel.replace(/^models\//, '');
        
        console.log(`Image gen: provider=gemini, resolvedModel=${modelName}`);

        // Validate model capability — no fallback, each model is tested independently
        if (!GEMINI_IMAGE_CAPABLE.includes(modelName)) {
          return new Response(
            JSON.stringify({ 
              error: `Model "${modelName}" does not support native image generation`,
              hint: 'Use gemini-2.5-flash-image or gemini-3-pro-image-preview for Gemini image generation.'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Attempting Gemini image generation with model: ${modelName}`);

        let geminiImageResponse: Response;

        try {
          // gemini-3-pro-image-preview (thinking model) requires responseModalities + longer timeout + slower retries
          // gemini-2.5-flash-image (GA stable) uses plain contents body with 25s timeout
          const isThinkingModel = modelName === 'gemini-3-pro-image-preview';
          const timeoutMs = isThinkingModel ? 90000 : 25000;
          const retryDelayMs = isThinkingModel ? 5000 : 1000;

          const requestBody = isThinkingModel
            ? JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: message }] }],
                generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
              })
            : JSON.stringify({
                contents: [{ parts: [{ text: message }] }],
              });

          geminiImageResponse = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: requestBody,
              signal: AbortSignal.timeout(timeoutMs),
            },
            2,
            retryDelayMs
          );
        } catch (fetchErr) {
          const errName = fetchErr instanceof Error ? fetchErr.name : '';
          const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          const isTimeout = errName === 'TimeoutError' || errMsg.includes('timed out') || errMsg.includes('Signal timed out');
          console.error(`Gemini image fetch error (model=${modelName}):`, errMsg);

          return new Response(
            JSON.stringify({
              success: false,
              error: isTimeout
                ? `Model "${modelName}" did not respond in time. It may be experiencing high demand — please try again later.`
                : `Gemini image generation failed: ${errMsg}`,
              hint: 'Try switching to OpenAI image generation for more reliability.',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!geminiImageResponse.ok) {
          const errorData = await geminiImageResponse.json();
          console.error(`Gemini image error (model=${modelName}):`, errorData);

          const msg = (errorData as { error?: { message?: string } })?.error?.message || 'Gemini image generation failed';
          const isModelNotFound = typeof msg === 'string' &&
            (msg.includes('is not found') || msg.includes('not supported'));
          const isHighDemand = (typeof msg === 'string' &&
            (msg.includes('high demand') || msg.includes('UNAVAILABLE') || (errorData as { error?: { code?: number } })?.error?.code === 503)) ||
            (errorData as { error?: { status?: string } })?.error?.status === 'UNAVAILABLE' ||
            geminiImageResponse.status === 503;

          if (isModelNotFound) {
            return new Response(
              JSON.stringify({
                error: `Model "${modelName}" not found or not available for your API key.`,
                hint: 'Use gemini-2.5-flash-image (GA stable) or gemini-3-pro-image-preview (preview). Run Test Connection to verify available models.'
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (isHighDemand) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Model "${modelName}" is currently experiencing high demand. Please try again in a few moments.`,
                hint: 'This is a temporary Gemini API issue. Try again or switch to OpenAI image generation.'
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          throw new Error(msg);
        }

        const data = await geminiImageResponse.json();
        console.log(`Gemini image response from model ${modelName}:`, Object.keys(data));
        
        // Extract image from response parts
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(
          (part: { inlineData?: { mimeType?: string } }) => part.inlineData?.mimeType?.startsWith('image/')
        );
        
        if (!imagePart?.inlineData?.data) {
          const textPart = parts.find((part: { text?: string }) => part.text);
          const errorMsg = textPart?.text || 'No image generated. The model may not support image generation or the prompt was filtered.';
          
          return new Response(
            JSON.stringify({ 
              error: errorMsg,
              hint: 'Try a different prompt or check if your API key has image generation enabled.'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const mimeType = imagePart.inlineData.mimeType || 'image/png';
        const imageUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;
        
        return new Response(
          JSON.stringify({ imageUrl, usedModel: modelName }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle video generation
    if (action === 'generate-video') {
      if (!message) {
        return new Response(
          JSON.stringify({ error: 'Prompt is required for video generation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ── OpenAI Sora — /v1/videos polling flow ────────────────────────────
      if (provider === 'openai') {
        const selectedModel = model || settings.openai_video_model || 'sora-2';
        console.log(`Video gen: provider=openai, resolvedModel=${selectedModel}`);

        if (!OPENAI_VIDEO_CAPABLE.includes(selectedModel)) {
          return new Response(
            JSON.stringify({ 
              error: `Model "${selectedModel}" is not a supported OpenAI video model.`,
              hint: 'Use sora-2 or sora-2-pro.'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Step 1: Submit video generation job — POST /v1/videos with multipart form
        console.log(`Submitting Sora video job: ${selectedModel}`);
        const formData = new FormData();
        formData.append('model', selectedModel);
        formData.append('prompt', message);

        const submitRes = await fetch('https://api.openai.com/v1/videos', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: formData,
        });

        if (!submitRes.ok) {
          const errorData = await submitRes.json().catch(() => ({ error: { message: 'Failed to submit video job' } }));
          console.error('OpenAI video submit error:', errorData);
          const msg = errorData.error?.message || 'Video generation failed';
          return new Response(
            JSON.stringify({ error: msg, hint: 'Ensure your OpenAI account has Sora access.' }),
            { status: submitRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const submitData = await submitRes.json();
        const videoId = submitData.id;
        console.log(`Sora job submitted: id=${videoId}, status=${submitData.status}`);

        if (!videoId) {
          return new Response(
            JSON.stringify({ error: 'No video job ID returned from OpenAI' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If already completed (rare)
        if (submitData.status === 'completed') {
          const videoUrl = `https://api.openai.com/v1/videos/${videoId}/content`;
          return new Response(JSON.stringify({ videoUrl, requiresAuth: true, openaiVideoId: videoId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Step 2: Poll GET /v1/videos/{id} every 5s, max 5 minutes
        const maxAttempts = 60;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(r => setTimeout(r, 5000));

          const pollRes = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });

          if (!pollRes.ok) {
            console.error(`Sora poll error (attempt ${i + 1}):`, pollRes.status);
            continue;
          }

          const pollData = await pollRes.json();
          console.log(`Sora poll ${i + 1}: status=${pollData.status}`);

          if (pollData.status === 'completed') {
            // Per OpenAI docs: download content via GET /v1/videos/{id}/content
            const videoUrl = `https://api.openai.com/v1/videos/${videoId}/content`;
            return new Response(JSON.stringify({ videoUrl, requiresAuth: true, openaiVideoId: videoId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          if (pollData.status === 'failed' || pollData.status === 'cancelled') {
            return new Response(
              JSON.stringify({ error: `Video generation ${pollData.status}: ${pollData.error?.message || 'Unknown error'}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          // status: 'queued' | 'in_progress' — keep polling
        }

        return new Response(
          JSON.stringify({ error: 'Video generation timed out after 5 minutes' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ── Gemini Veo — predictLongRunning polling flow ──────────────────────
      if (provider === 'gemini') {
        const selectedModel = model || settings.gemini_video_model || 'veo-3.1-generate-preview';
        console.log(`Video gen: provider=gemini, resolvedModel=${selectedModel}`);

        if (!GEMINI_VIDEO_CAPABLE.includes(selectedModel)) {
          return new Response(
            JSON.stringify({ 
              error: `Model "${selectedModel}" is not a supported Gemini video model.`,
              hint: 'Only veo-3.1-generate-preview is supported for predictLongRunning.'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Step 1: Start long-running video generation
        console.log(`Submitting Veo job: ${selectedModel}`);
        const submitRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:predictLongRunning?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{ prompt: message }],
              parameters: { aspectRatio: '16:9', sampleCount: 1 },
            }),
          }
        );

        if (!submitRes.ok) {
          const errorData = await submitRes.json().catch(() => ({ error: { message: 'Failed to submit Veo job' } }));
          console.error('Gemini Veo submit error:', errorData);
          const msg = errorData.error?.message || 'Veo video generation failed';
          return new Response(
            JSON.stringify({ error: msg, hint: 'Ensure your Google API account has Veo access.' }),
            { status: submitRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const submitData = await submitRes.json();
        const operationName = submitData.name;
        console.log(`Veo operation started: ${operationName}`);

        if (!operationName) {
          return new Response(
            JSON.stringify({ error: 'No operation name returned from Gemini Veo' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Step 2: Poll operation status every 10s, max 10 minutes
        const maxVeoAttempts = 60;
        for (let i = 0; i < maxVeoAttempts; i++) {
          await new Promise(r => setTimeout(r, 10000));

          const pollRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`,
            { method: 'GET' }
          );

          if (!pollRes.ok) {
            console.error(`Veo poll error (attempt ${i + 1}):`, pollRes.status);
            continue;
          }

          const pollData = await pollRes.json();
          console.log(`Veo poll ${i + 1}: done=${pollData.done}`);

          if (pollData.done) {
            if (pollData.error) {
              return new Response(
                JSON.stringify({ error: `Veo generation failed: ${pollData.error.message || JSON.stringify(pollData.error)}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            // Extract video bytes from response
            const videos = pollData.response?.videos || pollData.response?.generateVideoResponse?.generatedSamples;
            const videoBytes = videos?.[0]?.video?.videoBytes || videos?.[0]?.videoBytes || null;

            if (!videoBytes) {
              // Check for a URI instead
              const videoUri = videos?.[0]?.video?.uri || videos?.[0]?.uri || null;
              if (videoUri) {
                return new Response(JSON.stringify({ videoUrl: videoUri }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
              }
              console.log('Veo completed response structure:', JSON.stringify(pollData, null, 2));
              return new Response(
                JSON.stringify({ error: 'Veo generation completed but no video bytes returned', rawResponse: pollData }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            // Convert base64 to data URL
            const videoUrl = `data:video/mp4;base64,${videoBytes}`;
            return new Response(JSON.stringify({ videoUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          // Not done yet — keep polling
        }

        return new Response(
          JSON.stringify({ error: 'Veo video generation timed out after 10 minutes' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Unsupported provider for video generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('AI Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
