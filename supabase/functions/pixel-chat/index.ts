/**
 * Pixel Chat Edge Function
 *
 * Visual Creator AI for Fortun Wishnet.
 * Operating Law: Heart (mandatory, always wins) → Brain → Generate
 *
 * Media-first: always generates images unless user explicitly asks for text-only help.
 * Uses global Active Provider Selection from llm_settings for image generation.
 * Full unrestricted access to the entire vector store (no agent filtering, no depth limits).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { sanitizeForPrompt, stripDashes } from '../_shared/sanitize.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';
import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';

// SEC-004: 10 requests per minute per user (image generation, expensive)
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

// SEC-003: CORS tightened from wildcard to allowed origins list
let corsHeaders: Record<string, string> = getCorsHeaders(null);

// ─── Types ────────────────────────────────────────────────────────────────────

interface PixelSettings {
  default_language: string;
  default_verbosity: string;
  heart_strictness: string;
  refusal_style: string;
  safety_guard_mode: boolean;
  allowed_vocabulary: string[];
  blocked_vocabulary: string[];
  allowed_themes: string[];
  blocked_themes: string[];
  default_aesthetic: string;
  palette_behavior: string;
  texture_level: string;
  lighting: string;
  detail_level: string;
  internal_audit_logging: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AttachmentContext {
  name: string;
  type: string;
  content: string;
  isImage?: boolean;
}

interface BlueprintContext {
  id?: string;
  name: string;
  format?: string;
  aspect_ratio?: string;
  composition_rules?: string;
  style_rules?: string;
  typography_vibe?: string;
  element_rules?: string;
  negative_constraints?: string;
  export_specs?: string;
  palette?: Record<string, string>;
}

interface RequestBody {
  action: 'chat' | 'get-settings' | 'save-settings' | 'clear-history' | 'get-blueprints' | 'save-blueprint' | 'delete-blueprint' | 'generate-blueprint';
  message?: string;
  mode?: string;
  conversationHistory?: ChatMessage[];
  attachments?: AttachmentContext[];
  settings?: Partial<PixelSettings>;
  blueprint?: Partial<BlueprintContext>;
  blueprintId?: string;
  styleLock?: boolean;
  lastBlueprintSummary?: string;
  selectedPostType?: string;
  selectedSize?: { width: number; height: number; ratio: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchHeartRules(supabaseAdmin: ReturnType<typeof createClient>): Promise<{ name: string; content: string; priority: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('heart_rules')
    .select('name, rule_content, priority, is_global, assigned_agents, is_active')
    .eq('is_active', true)
    .or('is_global.eq.true,assigned_agents.cs.{"pixel"}');

  if (error) {
    console.error('Heart rules fetch error:', error);
    return [];
  }

  // AGENT-003: sanitize rule content before prompt interpolation
  return (data || []).map((r: any) => ({
    name: sanitizeForPrompt(r.name),
    content: sanitizeForPrompt(r.rule_content),
    priority: r.priority,
  }));
}

async function generateEmbedding(text: string, openaiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

async function searchBrain(
  supabaseAdmin: ReturnType<typeof createClient>,
  query: string,
  openaiKey: string,
  limit: number,
): Promise<{ content: string; imageUrl?: string }[]> {
  const embedding = await generateEmbedding(query, openaiKey);
  if (!embedding) return [];

  const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
    query_embedding: JSON.stringify(embedding),
    query_text: query, // hybrid vector+BM25 (single overload)
    match_threshold: 0.2,
    match_count: limit,
  });

  if (error) {
    console.error('Brain search error:', error);
    return [];
  }

  // Multimodal: mint short-lived signed URLs for Brain image chunks so Pixel can
  // use the actual images as references / image-to-image sources. Dedup by path.
  const rows = (data || []) as any[];
  const signedCache = new Map<string, string>();
  const results: { content: string; imageUrl?: string }[] = [];
  for (const d of rows) {
    let imageUrl: string | undefined;
    const sp: string | undefined = d.metadata?.storage_path;
    if (d.metadata?.is_image && sp) {
      if (!signedCache.has(sp)) {
        const { data: signed } = await supabaseAdmin.storage
          .from('brain-documents')
          .createSignedUrl(sp, 300);
        if (signed?.signedUrl) signedCache.set(sp, signed.signedUrl);
      }
      imageUrl = signedCache.get(sp);
    }
    // SEC: sanitize Brain content before it reaches the prompt (prompt-injection defense).
    results.push({ content: sanitizeForPrompt(d.content), imageUrl });
  }
  return results;
}

/**
 * Search Wishpedia entries specifically for character/universe visual references.
 * Returns structured results with image URLs for visual grounding.
 */
async function searchWishpedia(
  supabaseAdmin: ReturnType<typeof createClient>,
  query: string,
  openaiKey: string,
  supabaseUrl: string,
): Promise<{ name: string; content: string; imageUrls: { angle: string; url: string }[] }[]> {
  const embedding = await generateEmbedding(query, openaiKey);
  if (!embedding) return [];

  const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 10,
    filter_source_types: ['wishpedia_entry'],
  });

  if (error) {
    console.error('Wishpedia search error:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Deduplicate by source_id and enrich with images
  const seenSourceIds = new Set<string>();
  const results: { name: string; content: string; imageUrls: { angle: string; url: string }[] }[] = [];

  for (const chunk of data) {
    if (seenSourceIds.has(chunk.source_id)) continue;
    seenSourceIds.add(chunk.source_id);

    const entryName = chunk.metadata?.entry_name || 'Unknown';
    const metaImageUrls = chunk.metadata?.image_urls;

    let imageUrls: { angle: string; url: string }[] = [];
    if (Array.isArray(metaImageUrls) && metaImageUrls.length > 0) {
      imageUrls = metaImageUrls;
    } else {
      // Fallback: fetch images from DB
      const { data: images } = await supabaseAdmin
        .from('wishpedia_entry_images')
        .select('angle, original_name')
        .eq('entry_id', chunk.source_id)
        .order('sort_order');

      imageUrls = (images || []).map((img: any) => ({
        angle: img.angle || 'unknown',
        url: `${supabaseUrl}/storage/v1/object/public/wishpedia-media/${chunk.source_id}/${img.original_name}`,
      }));
    }

    results.push({
      name: entryName,
      content: chunk.content,
      imageUrls,
    });
  }

  return results;
}

function detectRegenerationIntent(message: string): boolean {
  const regenKeywords = [
    'regenerate', 'redo', 'retry', 'change the', 'make it',
    'adjust', 'modify', 'update the', 'edit the', 'try again',
    'another version', 'new version', 'same but', 'tweak', 'redo this',
    'can you change', 'i want to change', 'different color',
    'different background', 'more vibrant', 'less', 'brighter', 'darker',
    'keep the same but', 'do it again', 'one more', 'change color',
    'change background', 'make the', 'add more', 'remove the',
  ];
  const lower = message.toLowerCase().trim();
  return regenKeywords.some(k => lower.includes(k));
}

function detectTextOnlyIntent(message: string): boolean {
  // If the user wants to regenerate/edit a previous image, this is NOT text-only
  if (detectRegenerationIntent(message)) return false;

  const textKeywords = [
    'explain', 'help', 'what is', 'how to', 'tell me', 'list',
    'describe in words', 'no image', 'text only', 'advice', 'suggest',
    'compare', 'analyze', 'what are', 'how do', 'why', 'when',
    'can you explain', 'what does', 'define', 'summarize', 'summary',
  ];
  const lower = message.toLowerCase().trim();
  return textKeywords.some(k => lower.includes(k));
}

function detectVideoIntent(message: string): boolean {
  const videoKeywords = [
    'video', 'reel', 'clip', 'animation', 'motion', 'footage', 'mp4',
    'animate', 'moving', 'cinematic', 'timelapse', 'time-lapse',
  ];
  const lower = message.toLowerCase().trim();
  return videoKeywords.some(k => lower.includes(k));
}

function detectDiagramIntent(message: string): boolean {
  const keywords = [
    'diagram', 'flowchart', 'flow chart', 'mindmap', 'mind map', 'roadmap',
    'road map', 'funnel', 'chart', 'decision tree', 'sequence', 'structure',
    'pipeline', 'process map', 'workflow', 'storyboard', 'shot list', 'timeline',
    'content calendar', 'layout blueprint', 'design spec',
  ];
  const lower = message.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function enrichMessageForRegeneration(
  message: string,
  conversationHistory: ChatMessage[],
): string {
  if (!detectRegenerationIntent(message) || !conversationHistory || conversationHistory.length === 0) {
    return message;
  }

  const reversed = [...conversationHistory].reverse();
  const lastUserMsg = reversed.find(m => m.role === 'user');
  const lastAssistantMsg = reversed.find(m => m.role === 'assistant');

  if (!lastUserMsg) return message;

  const parts = [`ORIGINAL CREATIVE BRIEF: ${lastUserMsg.content}`];
  if (lastAssistantMsg) {
    parts.push(`PREVIOUS OUTPUT DESCRIPTION: ${lastAssistantMsg.content.slice(0, 300)}`);
  }
  parts.push(`REQUESTED MODIFICATIONS: ${message}`);
  parts.push('Generate a NEW image that keeps the core concept from the original brief but applies the requested modifications.');

  return parts.join('\n\n');
}

function buildPixelSystemPrompt(
  heartRules: { name: string; content: string; priority: string }[],
  brainContext: { content: string }[],
  mode: string,
  settings: PixelSettings,
  wantsDiagram: boolean,
  activeBlueprintContext?: string,
  selectedPostType?: string,
  selectedSize?: { width: number; height: number; ratio: string },
): string {

  const verbosityInstructions: Record<string, string> = {
    short: 'Keep responses focused and concise. Minimal preamble. Actionable outputs only.',
    standard: 'Provide complete, well-structured visual direction of appropriate depth.',
    detailed: 'Provide comprehensive, richly detailed visual direction with full art direction notes.',
  };

  const strictnessInstructions: Record<string, string> = {
    enforce_and_propose: 'If a request violates Heart rules: refuse the violating part, explain briefly, and propose a compliant visual alternative.',
    enforce_and_redirect: 'If a request violates Heart rules: refuse firmly and redirect to what visual help you can offer.',
    always_enforce: 'Always enforce Heart rules strictly. Refuse any non-compliant request without exception.',
  };

  const refusalStyles: Record<string, string> = {
    soft: 'When refusing, use gentle, encouraging language.',
    neutral: 'When refusing, use clear, professional language.',
    firm: 'When refusing, use direct, firm language.',
  };

  const heartSection = heartRules.length > 0
    ? `## MANDATORY HEART RULES — ABSOLUTE, ALWAYS TAKE PRECEDENCE\n${heartRules.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}\n\n`
    : `## HEART RULES\nNo specific Heart rules loaded. Default to strict, safe, brand-respectful visual direction.\n\n`;

  const brainSection = brainContext.length > 0
    ? `## FORTUN MASTERMIND BRAIN — AUTHORITATIVE BRAND KNOWLEDGE\nUse this as the source of truth for Fortun visual identity, products, characters, and brand context. Never contradict it.\n${brainContext.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}\n\n`
    : `## BRAND KNOWLEDGE\nNo specific Brain context retrieved. If the user asks about Fortun-specific visual identity or characters, say so honestly and direct them to add information to the Brain knowledge base.\n\n`;

  const wishpediaNote = `## WISHPEDIA — FORTUN UNIVERSE VISUAL CANON
Wishpedia entries are the authoritative source for Fortun universe characters, creatures, and objects.
When generating images involving any Fortun character or entity, ALWAYS use Wishpedia descriptions and reference images as the canonical visual source.
If Wishpedia image URLs are provided in the prompt context, use them as the definitive visual reference for that character's appearance, proportions, colors, and design details.\n\n`;

  const vocabularySection = [
    settings.allowed_vocabulary?.length > 0 ? `Preferred vocabulary: ${settings.allowed_vocabulary.join(', ')}` : '',
    settings.blocked_vocabulary?.length > 0 ? `Never use these words: ${settings.blocked_vocabulary.join(', ')}` : '',
    settings.allowed_themes?.length > 0 ? `Allowed visual themes: ${settings.allowed_themes.join(', ')}` : '',
    settings.blocked_themes?.length > 0 ? `Blocked visual themes (never produce): ${settings.blocked_themes.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const aestheticSection = `## VISUAL DEFAULTS
- Default aesthetic: ${settings.default_aesthetic}
- Palette behavior: ${settings.palette_behavior}
- Texture level: ${settings.texture_level}
- Lighting: ${settings.lighting}
- Detail level: ${settings.detail_level}
Apply these as defaults unless overridden by the user or a blueprint.\n\n`;

  const blueprintSection = activeBlueprintContext
    ? `## ACTIVE BLUEPRINT — APPLY TO ALL OUTPUTS\n${activeBlueprintContext}\n\n`
    : '';

  const postContextSection = selectedPostType || selectedSize
    ? `## TARGET FORMAT\n${selectedPostType ? `Post type: ${selectedPostType}` : ''}${selectedSize ? `\nDimensions: ${selectedSize.width}×${selectedSize.height} (${selectedSize.ratio})` : ''}\nGenerate the image to match this exact format and dimensions.\n\n`
    : '';

  const platformSection = `## PLATFORM: ${(mode || 'facebook').toUpperCase()}\nOptimize all visuals for ${mode || 'facebook'} platform best practices.\n\n`;

  const diagramInstruction = wantsDiagram
    ? `\n## DIAGRAM/STRUCTURE OUTPUT\nOutput diagrams, storyboards, timelines, and content calendars as Mermaid fenced code blocks:\n\`\`\`mermaid\n[your diagram here]\n\`\`\`\nFor tables (shot lists, scoring matrices, content calendars), use standard markdown tables.\n`
    : '';

  return `You are Pixel, the Visual Creator AI of Fortun Wishnet. Your PRIMARY output is generated images.

## SESSION MEMORY — UNLIMITED RECALL
Messages in the conversation may contain annotations in brackets such as
[Generated image: ...], [Generated video: ...], [Attached files: ...], and [Format: ...].
These describe media you previously created or files the user shared.
Always reference this full history when responding — you have perfect memory
of everything discussed, attached, and created in this session. If the user refers to
"the image you made earlier" or "that video", use these annotations to identify exactly
which output they mean.

## CORE DIRECTIVE
Generate an image for every creative request. Only respond with text when the user explicitly asks for explanation, help, advice, or non-visual information.
When you generate an image, include a brief caption explaining what you created.

## OPERATING LAW (mandatory — follow in this exact order every response)
1. Heart rules are ABSOLUTE. They always win over Brain knowledge, user requests, and your own creativity.
2. Brain knowledge is authoritative Fortun visual identity and brand context. Use it to make outputs brand-accurate.
3. Wishpedia entries are the CANONICAL visual reference for Fortun universe characters, creatures, and objects.
4. If Heart and Brain conflict, Heart wins.
5. Never invent Heart rules or Fortun canon. If retrieval returns nothing relevant, default to strict, safe, brand-respectful visual direction.
6. If uncertain whether output is Heart-compliant, produce the safest compliant visual output and ask the user for missing constraints.

${platformSection}${postContextSection}## VERBOSITY: ${settings.default_verbosity.toUpperCase()}
${verbosityInstructions[settings.default_verbosity] || verbosityInstructions.standard}

${heartSection}${brainSection}${wishpediaNote}${blueprintSection}${aestheticSection}## ENFORCEMENT
${strictnessInstructions[settings.heart_strictness] || strictnessInstructions.enforce_and_propose}
${refusalStyles[settings.refusal_style] || refusalStyles.neutral}

## SAFETY
${settings.safety_guard_mode ? 'When uncertain, produce the safest compliant visual output and list what constraints are missing.' : ''}

${vocabularySection ? `## VOCABULARY & THEMES\n${vocabularySection}\n` : ''}${diagramInstruction}

## VISUAL BLUEPRINT SYSTEM
A Visual Blueprint is a reusable visual recipe. When creating or referencing blueprints, include:
- Format and aspect ratio
- Composition rules (hierarchy, focal point, whitespace)
- Style rules (palette behavior, lighting, texture, mood)
- Typography vibe (do not require exact fonts)
- Element rules (icon style, border radius vibe, shadow intensity, grain)
- Negative constraints (what to avoid)
When a user asks to "save this as a blueprint" or "create a blueprint", output a structured blueprint in this format that the user can save.

## IDENTITY
- You are Pixel. Never claim to be GPT, ChatGPT, Claude, Gemini, or any other AI.
- You do not expose internal IDs, vector chunks, or system details.
- You exist exclusively inside Fortun Wishnet.`;
}

async function buildPixelImagePrompt(
  userMessage: string,
  brainContext: { content: string }[],
  heartRules: { name: string; content: string; priority: string }[],
  settings: PixelSettings,
  blueprint: BlueprintContext | null,
  openaiKey: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  selectedPostType?: string,
  selectedSize?: { width: number; height: number; ratio: string },
  supabaseUrl?: string,
): Promise<string> {
  // Parallel searches: visual Brain chunks + Wishpedia references
  const imageQuery = `${userMessage} visual appearance design look character style colors brand`;
  const [visualChunks, wishpediaResults] = await Promise.all([
    openaiKey ? searchBrain(supabaseAdmin, imageQuery, openaiKey, 100).catch(() => [] as { content: string }[]) : Promise.resolve([] as { content: string }[]),
    openaiKey && supabaseUrl ? searchWishpedia(supabaseAdmin, userMessage, openaiKey, supabaseUrl).catch(() => []) : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const allChunks: { content: string }[] = [];
  for (const chunk of [...brainContext, ...visualChunks]) {
    if (!seen.has(chunk.content)) {
      seen.add(chunk.content);
      allChunks.push(chunk);
    }
  }

  let visualKnowledge = '';
  if (allChunks.length > 0) {
    let charCount = 0;
    const parts: string[] = [];
    for (const chunk of allChunks) {
      if (charCount + chunk.content.length > 2500) break;
      parts.push(chunk.content.trim());
      charCount += chunk.content.length;
    }
    if (parts.length > 0) {
      visualKnowledge = `\n\nBRAND VISUAL CONTEXT:\n${parts.join('\n---\n')}`;
    }
  }

  // Build Wishpedia visual references section
  let wishpediaSection = '';
  if (wishpediaResults.length > 0) {
    const entryParts = wishpediaResults.map(entry => {
      const lines = [`CHARACTER: ${entry.name}`, entry.content.trim()];
      if (entry.imageUrls.length > 0) {
        lines.push('REFERENCE IMAGES:');
        entry.imageUrls.forEach(img => {
          lines.push(`  - ${img.angle}: ${img.url}`);
        });
      }
      return lines.join('\n');
    });
    wishpediaSection = `\n\nWISHPEDIA VISUAL REFERENCES — USE THESE AS CANONICAL CHARACTER DESIGNS:\n${entryParts.join('\n---\n')}`;
    console.log(`Injected ${wishpediaResults.length} Wishpedia reference(s) into image prompt`);
  }

  let heartConstraints = '';
  if (heartRules.length > 0) {
    const visualKeywords = ['brand', 'visual', 'image', 'color', 'style', 'logo', 'content', 'appropriate', 'safe', 'guideline', 'identity', 'design', 'illustration', 'character', 'art'];
    const relevant = heartRules.filter(r => {
      const text = `${r.name} ${r.content}`.toLowerCase();
      return visualKeywords.some(kw => text.includes(kw));
    });
    const rulesForConstraints = relevant.length > 0 ? relevant : heartRules.slice(0, 5);
    heartConstraints = `\n\nBRAND COMPLIANCE CONSTRAINTS:\n${rulesForConstraints.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}`;
  }

  const aestheticNote = `\n\nVISUAL STYLE: ${settings.default_aesthetic} aesthetic, ${settings.lighting} lighting, ${settings.texture_level} texture, ${settings.detail_level} detail level, ${settings.palette_behavior} palette`;

  const blueprintNote = blueprint
    ? `\n\nBLUEPRINT: ${blueprint.name}\nFormat: ${blueprint.format || 'unspecified'} | Aspect: ${blueprint.aspect_ratio || '1:1'}\nStyle: ${blueprint.style_rules || ''}\nComposition: ${blueprint.composition_rules || ''}\nTypography: ${blueprint.typography_vibe || ''}\nAvoid: ${blueprint.negative_constraints || ''}`
    : '';

  const formatNote = selectedPostType || selectedSize
    ? `\n\nCRITICAL TARGET FORMAT: ${selectedPostType || ''} ${selectedSize ? `EXACTLY ${selectedSize.width}×${selectedSize.height} pixels (${selectedSize.ratio} aspect ratio)` : ''}.\nThe ENTIRE canvas MUST be filled with content at this exact ratio. Do NOT add black bars, padding, letterboxing, or pillarboxing. The output must be a native ${selectedSize?.ratio || '1:1'} image, NOT a square with the content embedded inside it.`
    : '';

  return `${userMessage}${wishpediaSection}${visualKnowledge}${aestheticNote}${blueprintNote}${formatNote}${heartConstraints}\n\nStyle: creative, high-quality digital art, brand-consistent, appropriate for all audiences, ${settings.default_aesthetic} aesthetic.`;
}

function mapSizeToOpenAI(selectedSize?: { width: number; height: number; ratio: string }): string {
  if (!selectedSize) return '1024x1024';
  const { ratio } = selectedSize;
  // gpt-image-1 valid sizes: 1024x1024, 1536x1024, 1024x1536, auto
  if (ratio === '1:1') return '1024x1024';
  if (ratio === '9:16' || ratio === '4:5') return '1024x1536';
  if (ratio === '16:9' || ratio === '1.91:1' || ratio === '2.63:1') return '1536x1024';
  return 'auto';
}

function mapRatioToGemini(selectedSize?: { width: number; height: number; ratio: string }): string | null {
  if (!selectedSize) return null;
  const { ratio } = selectedSize;
  // Gemini supports: 1:1, 3:4, 4:3, 9:16, 16:9
  if (ratio === '1:1') return '1:1';
  if (ratio === '9:16') return '9:16';
  if (ratio === '4:5') return '3:4'; // closest vertical
  if (ratio === '16:9' || ratio === '1.91:1' || ratio === '2.63:1') return '16:9';
  return null;
}

// ─── Video post type detection ────────────────────────────────────────────────
const VIDEO_POST_TYPES = new Set(['video', 'story', 'reel']);

function isVideoPostType(postType?: string): boolean {
  if (!postType) return false;
  return VIDEO_POST_TYPES.has(postType);
}

function mapSizeToSora(selectedSize?: { width: number; height: number; ratio: string }): string {
  if (!selectedSize) return '1920x1080';
  const { ratio } = selectedSize;
  if (ratio === '9:16' || ratio === '4:5') return '1080x1920';
  if (ratio === '1:1') return '1080x1080';
  return '1920x1080'; // 16:9 and other landscape
}

function mapRatioToVeo(selectedSize?: { width: number; height: number; ratio: string }): string {
  if (!selectedSize) return '16:9';
  const { ratio } = selectedSize;
  if (ratio === '9:16' || ratio === '4:5') return '9:16';
  if (ratio === '1:1') return '1:1';
  return '16:9';
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // Verify auth via getUser (server round-trip, validates token properly)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = user.id;

  // SEC-004: rate limit check
  if (rateLimiter.check(userId)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action } = body;

  // ── GET SETTINGS ─────────────────────────────────────────────────────────────
  if (action === 'get-settings') {
    const { data, error } = await supabase
      .from('pixel_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Pixel get-settings error:', error);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ settings: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── SAVE SETTINGS ────────────────────────────────────────────────────────────
  if (action === 'save-settings') {
    const { settings } = body;
    if (!settings) {
      return new Response(JSON.stringify({ error: 'settings required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await supabase
      .from('pixel_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from('pixel_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('pixel_settings')
        .insert({ ...settings, user_id: userId })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Pixel save-settings error:', result.error);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ settings: result.data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── CLEAR HISTORY ────────────────────────────────────────────────────────────
  if (action === 'clear-history') {
    const { error } = await supabase
      .from('pixel_messages')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Pixel clear-history error:', error);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── GET BLUEPRINTS ────────────────────────────────────────────────────────────
  if (action === 'get-blueprints') {
    const { data, error } = await supabase
      .from('pixel_blueprints')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Pixel get-blueprints error:', error);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ blueprints: data || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── SAVE BLUEPRINT ────────────────────────────────────────────────────────────
  if (action === 'save-blueprint') {
    const { blueprint } = body;
    if (!blueprint || !blueprint.name) {
      return new Response(JSON.stringify({ error: 'blueprint with name required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (blueprint.id) {
      const { data, error } = await supabase
        .from('pixel_blueprints')
        .update({ ...blueprint, updated_at: new Date().toISOString() })
        .eq('id', blueprint.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Pixel update-blueprint error:', error);
        return new Response(JSON.stringify({ error: 'Internal error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ blueprint: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const { data, error } = await supabase
        .from('pixel_blueprints')
        .insert({ ...blueprint, user_id: userId })
        .select()
        .single();

      if (error) {
        console.error('Pixel insert-blueprint error:', error);
        return new Response(JSON.stringify({ error: 'Internal error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ blueprint: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // ── DELETE BLUEPRINT ──────────────────────────────────────────────────────────
  if (action === 'delete-blueprint') {
    const { blueprintId } = body;
    if (!blueprintId) {
      return new Response(JSON.stringify({ error: 'blueprintId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase
      .from('pixel_blueprints')
      .delete()
      .eq('id', blueprintId)
      .eq('user_id', userId);

    if (error) {
      console.error('Pixel delete-blueprint error:', error);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── GENERATE BLUEPRINT WITH AI ───────────────────────────────────────────────
  if (action === 'generate-blueprint') {
    const { data: llmSettingsBP } = await supabaseAdmin
      .from('llm_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const openaiKeyBP = llmSettingsBP?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
    const geminiKeyBP = llmSettingsBP?.gemini_api_key || Deno.env.get('GEMINI_API_KEY') || '';

    if (!openaiKeyBP && !geminiKeyBP) {
      return new Response(JSON.stringify({ error: 'No AI provider configured. Ask an admin to configure LLM settings.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch Heart Rules (mandatory)
    const heartRulesBP = await fetchHeartRules(supabaseAdmin);

    // Search Brain for brand visual identity context — unlimited
    let brainContextBP: { content: string }[] = [];
    if (openaiKeyBP) {
      try {
        const results = await Promise.all([
          searchBrain(supabaseAdmin, 'brand visual identity design style aesthetic', openaiKeyBP, 100),
          searchBrain(supabaseAdmin, 'color palette typography mood lighting brand guidelines', openaiKeyBP, 100),
        ]);
        const seenBP = new Set<string>();
        for (const batch of results) {
          for (const chunk of batch) {
            if (!seenBP.has(chunk.content)) {
              seenBP.add(chunk.content);
              brainContextBP.push(chunk);
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }

    const heartSection = heartRulesBP.length > 0
      ? `HEART RULES (mandatory — the blueprint MUST respect ALL of these):\n${heartRulesBP.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}`
      : 'HEART RULES: No specific rules loaded. Default to strict, safe, brand-respectful visual direction.';

    const brainSection = brainContextBP.length > 0
      ? `BRAIN KNOWLEDGE (Fortun brand context — use this to make the blueprint brand-accurate):\n${brainContextBP.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}`
      : 'BRAIN KNOWLEDGE: No specific brand context retrieved. Generate a professional, premium, brand-appropriate visual blueprint.';

    const generationPrompt = `You are Pixel, the Visual Creator AI of Fortun Wishnet. Generate a creative, brand-accurate Visual Blueprint.

${heartSection}

${brainSection}

Generate ONE creative Visual Blueprint. It must:
- Be inspired by but not copy the brand knowledge above
- Respect ALL Heart rules strictly — they are absolute
- Feel fresh, professional, and visually distinctive
- Be immediately usable as a creative production recipe
- Be specific and actionable, not generic

Respond ONLY with valid JSON (no markdown code blocks, no explanation, just the raw JSON object):
{
  "name": "creative, specific blueprint name (3-6 words)",
  "description": "one sentence describing this blueprint's visual personality and use case",
  "format": "one of: social_post, story, carousel, deck_slide, banner, thumbnail, custom",
  "aspect_ratio": "one of: 1:1, 9:16, 16:9, 4:5, 4:3, 3:4, 21:9",
  "style_rules": "palette behavior, lighting style, texture intensity, mood, atmosphere — be specific",
  "composition_rules": "visual hierarchy approach, focal point strategy, whitespace usage, grid system",
  "typography_vibe": "type personality, weight range, hierarchy approach, pairing style — no specific font names",
  "element_rules": "icon style, border radius vibe, shadow intensity, grain overlay, decorative element approach",
  "negative_constraints": "what to never include in outputs using this blueprint — be specific"
}`;

    const useGemini = !openaiKeyBP && !!geminiKeyBP;
    const textProvider = useGemini ? 'gemini' : 'openai';
    const textModel = useGemini
      ? (llmSettingsBP?.gemini_text_model || 'gemini-2.5-flash')
      : (llmSettingsBP?.openai_text_model || 'gpt-4o');

    let blueprintJSON: Record<string, string> | null = null;

    try {
      if (textProvider === 'gemini') {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${geminiKeyBP}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: generationPrompt }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: TOKEN_BUDGETS.IMAGE_PROMPT },
          }),
        });
        if (!geminiRes.ok) throw new Error(await geminiRes.text());
        const geminiData = await geminiRes.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) blueprintJSON = JSON.parse(jsonMatch[0]);
      } else {
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKeyBP}` },
          body: JSON.stringify({
            model: textModel,
            messages: [
              { role: 'system', content: 'You are a creative visual director AI. You respond only with valid JSON objects, no markdown, no code blocks.' },
              { role: 'user', content: generationPrompt },
            ],
            temperature: 0.85,
            max_tokens: TOKEN_BUDGETS.IMAGE_PROMPT,
            response_format: { type: 'json_object' },
          }),
        });
        if (!openaiRes.ok) throw new Error(await openaiRes.text());
        const openaiData = await openaiRes.json();
        const rawText = openaiData.choices?.[0]?.message?.content || '{}';
        blueprintJSON = JSON.parse(rawText);
      }
    } catch (err: any) {
      console.error('Blueprint generation error:', err);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!blueprintJSON) {
      return new Response(JSON.stringify({ error: 'AI returned an empty blueprint' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ blueprint: blueprintJSON }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── CHAT ─────────────────────────────────────────────────────────────────────
  if (action !== 'chat') {
    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { message, conversationHistory = [], attachments = [], selectedPostType, selectedSize } = body;
  if (!message) {
    return new Response(JSON.stringify({ error: 'message required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Load user settings
  const { data: userSettings } = await supabase
    .from('pixel_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const settings: PixelSettings = {
    default_language: 'en',
    default_verbosity: 'standard',
    heart_strictness: 'enforce_and_propose',
    refusal_style: 'neutral',
    safety_guard_mode: true,
    allowed_vocabulary: [],
    blocked_vocabulary: [],
    allowed_themes: [],
    blocked_themes: [],
    default_aesthetic: 'premium',
    palette_behavior: 'adaptive',
    texture_level: 'subtle',
    lighting: 'soft',
    detail_level: 'medium',
    internal_audit_logging: true,
    ...(userSettings || {}),
  };

  const mode = body.mode || 'facebook';
  const retrievalStart = Date.now();

  // Load LLM settings (for global provider selection)
  const { data: llmSettings } = await supabaseAdmin
    .from('llm_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
  const geminiKey = llmSettings?.gemini_api_key || Deno.env.get('GEMINI_API_KEY') || '';

  if (!openaiKey && !geminiKey) {
    return new Response(JSON.stringify({ error: 'No AI provider configured. Ask an admin to configure LLM settings.' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Step 1: Retrieve Heart Rules (mandatory) ──────────────────────────────
  const heartRules = await fetchHeartRules(supabaseAdmin);

  // ── Step 2: Retrieve Brain Context (unlimited, no agent filtering) ────────
  let brainContext: { content: string }[] = [];
  if (openaiKey) {
    const lastAssistant = [...conversationHistory].reverse().find(m => m.role === 'assistant');
    const queries: Promise<{ content: string }[]>[] = [
      searchBrain(supabaseAdmin, message, openaiKey, 100),
    ];
    if (lastAssistant && lastAssistant.content && lastAssistant.content !== message) {
      queries.push(searchBrain(supabaseAdmin, lastAssistant.content.slice(0, 500), openaiKey, 100));
    }
    const results = await Promise.all(queries);
    const seen = new Set<string>();
    for (const batch of results) {
      for (const chunk of batch) {
        if (!seen.has(chunk.content)) {
          seen.add(chunk.content);
          brainContext.push(chunk);
        }
      }
    }
  }

  const retrievalMs = Date.now() - retrievalStart;
  const wantsDiagram = detectDiagramIntent(message);
  const wantsTextOnly = detectTextOnlyIntent(message);

  // ── Step 3: Build system prompt ──────────────────────────────────────────
  const activeBlueprintStr = body.blueprint
    ? `Name: ${body.blueprint.name}\nFormat: ${body.blueprint.format || 'unspecified'}\nAspect Ratio: ${body.blueprint.aspect_ratio || '1:1'}\nComposition: ${body.blueprint.composition_rules || ''}\nStyle: ${body.blueprint.style_rules || ''}\nTypography: ${body.blueprint.typography_vibe || ''}\nElements: ${body.blueprint.element_rules || ''}\nAvoid: ${body.blueprint.negative_constraints || ''}`
    : undefined;

  const systemPrompt = buildPixelSystemPrompt(
    heartRules, brainContext, mode, settings, wantsDiagram,
    activeBlueprintStr, selectedPostType, selectedSize,
  );

  // ── Step 4: Build user content with attachments ──────────────────────────
  const textAttachments = attachments.filter((a: AttachmentContext) => !a.isImage && a.type !== 'application/pdf');
  const imageAttachments = attachments.filter((a: AttachmentContext) => a.isImage);
  const pdfAttachments = attachments.filter((a: AttachmentContext) => a.type === 'application/pdf');

  let userContent: string | object[] = message;

  if (textAttachments.length > 0 || pdfAttachments.length > 0) {
    const attachmentText = [...pdfAttachments, ...textAttachments]
      .map((a: AttachmentContext) => `## REFERENCE ASSET: ${a.name} (${a.type})\n${a.content.slice(0, 30000)}`)
      .join('\n\n---\n\n');
    userContent = `${attachmentText}\n\n## PIXEL REQUEST\n${message}`;
  }

  if (imageAttachments.length > 0) {
    const contentArray: object[] = [{ type: 'text', text: typeof userContent === 'string' ? userContent : message }];
    for (const img of imageAttachments) {
      const mimeType = img.type || 'image/jpeg';
      contentArray.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${img.content}`, detail: 'high' },
      });
    }
    userContent = contentArray;
  }

  // ── Step 5a: Video generation for video post types ──────────────────────
  if (!wantsTextOnly && !wantsDiagram && (isVideoPostType(selectedPostType) || detectVideoIntent(message))) {
    const videoProvider = llmSettings?.active_video_provider || 'openai';
    const videoModel = videoProvider === 'gemini'
      ? (llmSettings?.gemini_video_model || 'veo-3.1-generate-preview')
      : (llmSettings?.openai_video_model || 'sora-2');

    const enrichedVideoMessage = enrichMessageForRegeneration(message, conversationHistory);
    const videoPrompt = await buildPixelImagePrompt(
      enrichedVideoMessage, brainContext, heartRules, settings,
      body.blueprint || null, openaiKey, supabaseAdmin,
      selectedPostType, selectedSize, supabaseUrl,
    );

    try {
      let videoBlob: Blob | null = null;

      if (videoProvider === 'openai') {
        if (!openaiKey) throw new Error('OpenAI API key not configured.');
        console.log(`Pixel video gen: provider=openai, model=${videoModel}`);

        const formData = new FormData();
        formData.append('model', videoModel);
        formData.append('prompt', videoPrompt);
        const soraSize = mapSizeToSora(selectedSize);
        formData.append('size', soraSize);
        formData.append('n', '1');
        console.log(`Sora params: size=${soraSize}`);

        const submitRes = await fetch('https://api.openai.com/v1/videos', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiKey}` },
          body: formData,
        });
        if (!submitRes.ok) {
          const errData = await submitRes.json().catch(() => ({ error: { message: 'Failed to submit video job' } }));
          throw new Error(errData.error?.message || 'Video generation failed');
        }
        const submitData = await submitRes.json();
        const videoId = submitData.id;
        if (!videoId) throw new Error('No video job ID returned from OpenAI');
        console.log(`Sora job submitted: id=${videoId}`);

        // Poll for completion
        const maxAttempts = 60;
        let completed = false;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(r => setTimeout(r, 5000));
          const pollRes = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
            headers: { 'Authorization': `Bearer ${openaiKey}` },
          });
          if (!pollRes.ok) continue;
          const pollData = await pollRes.json();
          console.log(`Sora poll ${attempt + 1}: status=${pollData.status}`);
          if (pollData.status === 'completed') {
            // Download video content
            const contentRes = await fetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
              headers: { 'Authorization': `Bearer ${openaiKey}` },
            });
            if (contentRes.ok) {
              videoBlob = await contentRes.blob();
            }
            completed = true;
            break;
          }
          if (pollData.status === 'failed' || pollData.status === 'cancelled') {
            throw new Error(`Video generation ${pollData.status}: ${pollData.error?.message || 'Unknown error'}`);
          }
        }
        if (!completed) throw new Error('Video generation timed out after 5 minutes');

      } else if (videoProvider === 'gemini') {
        if (!geminiKey) throw new Error('Gemini API key not configured.');
        console.log(`Pixel video gen: provider=gemini, model=${videoModel}`);

        const veoAspect = mapRatioToVeo(selectedSize);
        const submitRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${videoModel}:predictLongRunning?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{ prompt: videoPrompt }],
              parameters: { aspectRatio: veoAspect, sampleCount: 1 },
            }),
          }
        );
        if (!submitRes.ok) {
          const errData = await submitRes.json().catch(() => ({ error: { message: 'Veo submission failed' } }));
          throw new Error(errData.error?.message || 'Veo video generation failed');
        }
        const submitData = await submitRes.json();
        const operationName = submitData.name;
        if (!operationName) throw new Error('No operation name returned from Gemini Veo');
        console.log(`Veo operation: ${operationName}`);

        const maxVeoAttempts = 60;
        let completed = false;
        for (let attempt = 0; attempt < maxVeoAttempts; attempt++) {
          await new Promise(r => setTimeout(r, 10000));
          const pollRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${geminiKey}`,
          );
          if (!pollRes.ok) continue;
          const pollData = await pollRes.json();
          console.log(`Veo poll ${attempt + 1}: done=${pollData.done}`);
          if (pollData.done) {
            if (pollData.error) throw new Error(`Veo failed: ${pollData.error.message || JSON.stringify(pollData.error)}`);
            const videos = pollData.response?.videos || pollData.response?.generateVideoResponse?.generatedSamples;
            const videoBytes = videos?.[0]?.video?.videoBytes || videos?.[0]?.videoBytes || null;
            if (videoBytes) {
              const binary = atob(videoBytes);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              videoBlob = new Blob([bytes], { type: 'video/mp4' });
            } else {
              const videoUri = videos?.[0]?.video?.uri || videos?.[0]?.uri || null;
              if (videoUri) {
                const separator = videoUri.includes('?') ? '&' : '?';
                const dlRes = await fetch(`${videoUri}${separator}key=${geminiKey}`);
                if (!dlRes.ok) {
                  throw new Error(`Failed to download Veo video: HTTP ${dlRes.status}`);
                }
                videoBlob = await dlRes.blob();
              }
            }
            completed = true;
            break;
          }
        }
        if (!completed) throw new Error('Veo video generation timed out after 10 minutes');
      } else {
        throw new Error(`Unsupported video provider: ${videoProvider}`);
      }

      if (!videoBlob) throw new Error('No video data received');

      // Validate that the blob is actually video data, not an error response
      {
        const validationBytes = new Uint8Array(await videoBlob.arrayBuffer());
        const firstChars = new TextDecoder().decode(validationBytes.slice(0, 50)).trim();
        if (firstChars.startsWith('{') || firstChars.startsWith('<') || firstChars.startsWith('<!')) {
          console.error('Video blob contains non-video data:', firstChars.slice(0, 100));
          throw new Error('Video generation failed: received an error response instead of video data');
        }
        if (videoBlob.size < 1000) {
          throw new Error('Video generation produced an invalid or empty output');
        }
        // Re-create blob from validated bytes
        videoBlob = new Blob([validationBytes], { type: 'video/mp4' });
      }

      // Persist video to storage + Files Manager
      let permanentVideoUrl = '';
      try {
        const supabaseServiceClient = createClient(supabaseUrl, serviceKey);
        const videoPath = `${userId}/pixel-videos/${Date.now()}_pixel.mp4`;
        const { error: uploadErr } = await supabaseServiceClient.storage
          .from('files')
          .upload(videoPath, videoBlob, { contentType: 'video/mp4', upsert: false });

        if (!uploadErr) {
          const { data: publicData } = supabaseServiceClient.storage.from('files').getPublicUrl(videoPath);
          permanentVideoUrl = publicData.publicUrl;

          const { data: sectors } = await supabase.from('sectors').select('id, name').eq('user_id', userId);
          let pixelSectorId = sectors?.find((s: any) => s.name === 'Pixel AI')?.id;
          if (!pixelSectorId) {
            const { data: newSector } = await supabase.from('sectors').insert({ user_id: userId, name: 'Pixel AI', color: '#EC4899' }).select().single();
            pixelSectorId = newSector?.id;
          }

          await supabase.from('files').insert({
            user_id: userId,
            name: `pixel-${Date.now()}.mp4`,
            original_name: `pixel-${Date.now()}.mp4`,
            storage_path: videoPath,
            mime_type: 'video/mp4',
            size: videoBlob.size,
            sector_id: pixelSectorId || null,
          });
        }
      } catch (e) {
        console.error('Video persistence error:', e);
      }

      const videoCaption = `Here's the video I created based on your brief.`;

      await supabase.from('pixel_messages').insert({ user_id: userId, role: 'user', content: message, mode });
      const { data: assistantMsg } = await supabase.from('pixel_messages').insert({
        user_id: userId, role: 'assistant', content: videoCaption, mode, is_image: false, is_video: true, video_url: permanentVideoUrl,
      }).select().single();

      // AGENT-008: Pixel writes to the shared osha_audit_logs table.
      // The table is shared across all agents (Osha, Pixel, Promptor) as a
      // unified audit log. Renaming it would require a migration; the name
      // is a legacy artefact from when Osha was the only agent.
      if (settings.internal_audit_logging) {
        await supabaseAdmin.from('osha_audit_logs').insert({
          user_id: userId,
          message_id: assistantMsg?.id || null,
          heart_rules_used: heartRules,
          brain_chunks_used: brainContext.length,
          compliance_status: 'pass',
          compliance_notes: `Pixel: video generated via ${videoProvider}/${videoModel}`,
          retrieval_ms: retrievalMs,
          llm_provider: videoProvider,
          llm_model: videoModel,
        });
      }

      return new Response(JSON.stringify({
        content: videoCaption,
        isImage: false,
        isVideo: true,
        videoUrl: permanentVideoUrl,
        audit: { heartCount: heartRules.length, brainCount: brainContext.length, complianceStatus: 'pass' },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (e: any) {
      console.error('Video generation error:', e);
      const errMsg = 'I encountered an error generating the video. I can provide a detailed art direction brief instead — just ask.';
      return new Response(JSON.stringify({
        content: errMsg,
        audit: { heartCount: heartRules.length, brainCount: brainContext.length, complianceStatus: 'pass' },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ── Step 5b: Media-first — generate image unless text-only intent ────────
  if (!wantsTextOnly && !wantsDiagram) {
    // Use global Active Provider Selection for image generation
    const imageProvider = llmSettings?.active_image_provider || 'openai';
    const imageModel = imageProvider === 'gemini'
      ? (llmSettings?.gemini_image_model || 'gemini-2.5-flash-image')
      : (llmSettings?.openai_image_model || 'gpt-image-1');

    const enrichedImageMessage = enrichMessageForRegeneration(message, conversationHistory);
    const imagePrompt = await buildPixelImagePrompt(
      enrichedImageMessage, brainContext, heartRules, settings,
      body.blueprint || null, openaiKey, supabaseAdmin,
      selectedPostType, selectedSize, supabaseUrl,
    );

    // Image-to-image source(s) (Fortun-owned): selected reference images + retrieved
    // Brain images. Multiple sources let Pixel combine/recreate characters and scenes.
    const sourceImages: Uint8Array[] = [];
    const MAX_SOURCE_BYTES = 5 * 1024 * 1024; // 5MB per source image
    try {
      for (const att of imageAttachments) {
        if (att.content && sourceImages.length < 4) {
          const bin = atob(att.content);
          if (bin.length > MAX_SOURCE_BYTES) continue;
          const u = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          sourceImages.push(u);
        }
      }
      const brainImgUrls = [...new Set((brainContext as { content: string; imageUrl?: string }[]).map(c => c.imageUrl).filter(Boolean) as string[])];
      for (const url of brainImgUrls) {
        if (sourceImages.length >= 4) break;
        const r = await fetch(url);
        if (!r.ok) continue;
        const buf = await r.arrayBuffer();
        if (buf.byteLength <= MAX_SOURCE_BYTES) sourceImages.push(new Uint8Array(buf));
      }
    } catch {
      // fall back to text-to-image
    }

    try {
      let imageBlob: Blob;

      if (imageProvider === 'gemini') {
        if (!geminiKey) throw new Error('Gemini API key not configured.');
        const geminiImgUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${geminiKey}`;

        // Model-specific request format
        const geminiAspect = mapRatioToGemini(selectedSize);
        const geminiImgParts: object[] = [{ text: imagePrompt }];
        for (const src of sourceImages) {
          let b = '';
          for (let i = 0; i < src.length; i++) b += String.fromCharCode(src[i]);
          geminiImgParts.unshift({ inlineData: { mimeType: 'image/png', data: btoa(b) } });
        }
        const geminiBody: any = {
          contents: [{ role: 'user', parts: geminiImgParts }],
        };
        if (imageModel === 'gemini-2.5-flash-image') {
          // Standard body, no responseModalities needed
          if (geminiAspect) {
            geminiBody.generationConfig = { aspectRatio: geminiAspect };
          }
        } else {
          const genConfig: any = { responseModalities: ['TEXT', 'IMAGE'] };
          if (geminiAspect) genConfig.aspectRatio = geminiAspect;
          geminiBody.generationConfig = genConfig;
        }

        const geminiImgRes = await fetch(geminiImgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        });
        if (!geminiImgRes.ok) throw new Error(await geminiImgRes.text());
        const geminiImgData = await geminiImgRes.json();
        const parts = geminiImgData.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
        if (!imgPart?.inlineData?.data) throw new Error('Gemini did not return an image');
        const binary = atob(imgPart.inlineData.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        imageBlob = new Blob([bytes], { type: imgPart.inlineData.mimeType || 'image/png' });
      } else {
        if (!openaiKey) throw new Error('OpenAI API key not configured.');
        const openaiSize = mapSizeToOpenAI(selectedSize);
        const runGeneration = () => fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: imageModel, prompt: imagePrompt, n: 1, size: openaiSize }),
        });

        let imageRes: Response;
        if (sourceImages.length > 0) {
          // Image-to-image (recreate / combine) via /v1/images/edits — multipart, image[].
          const form = new FormData();
          form.append('model', imageModel);
          form.append('prompt', imagePrompt);
          form.append('n', '1');
          if (openaiSize) form.append('size', openaiSize);
          sourceImages.forEach((src, i) => {
            form.append('image[]', new File([src], `source_${i}.png`, { type: 'image/png' }));
          });
          imageRes = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openaiKey}` },
            body: form,
          });
          if (!imageRes.ok) {
            console.error('Pixel image edit failed, falling back to text-to-image:', await imageRes.text());
            imageRes = await runGeneration();
          }
        } else {
          imageRes = await runGeneration();
        }
        if (!imageRes.ok) throw new Error(await imageRes.text());
        const imageData = await imageRes.json();
        const imageResult = imageData.data?.[0];
        if (!imageResult) throw new Error('No image returned');
        if (imageResult.url) {
          // SEC-04: validate host + cap size before buffering the upstream image
          const u = new URL(imageResult.url);
          if (u.protocol !== 'https:' || !(u.hostname === 'api.openai.com' || u.hostname.endsWith('.blob.core.windows.net') || u.hostname.endsWith('.oaiusercontent.com'))) {
            throw new Error('Unexpected image result host');
          }
          const imgResp = await fetch(imageResult.url);
          if (!imgResp.ok) throw new Error('Failed to fetch generated image');
          const cl = Number(imgResp.headers.get('content-length') || '0');
          if (cl && cl > 20 * 1024 * 1024) throw new Error('Generated image too large');
          const ab = await imgResp.arrayBuffer();
          if (ab.byteLength > 20 * 1024 * 1024) throw new Error('Generated image too large');
          imageBlob = new Blob([ab], { type: imgResp.headers.get('content-type') || 'image/png' });
        } else if (imageResult.b64_json) {
          const binary = atob(imageResult.b64_json);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          imageBlob = new Blob([bytes], { type: 'image/png' });
        } else {
          throw new Error('No image URL or base64 data returned');
        }
      }

      // Persist to storage + Files Manager
      let permanentImageUrl = '';
      try {
        const supabaseServiceClient = createClient(supabaseUrl, serviceKey);
        const imagePath = `${userId}/pixel-images/${Date.now()}_pixel.png`;
        const { error: uploadErr } = await supabaseServiceClient.storage
          .from('files')
          .upload(imagePath, imageBlob, { contentType: 'image/png', upsert: false });

        if (!uploadErr) {
          // BUGFIX: the 'files' bucket is PRIVATE — getPublicUrl returns a URL that
          // 403s, so the generated image couldn't be viewed/downloaded/copied.
          // Mint a signed URL instead (mirrors osha-chat, 24h TTL).
          const { data: signedData } = await supabaseServiceClient.storage.from('files').createSignedUrl(imagePath, 60 * 60 * 24);
          permanentImageUrl = signedData?.signedUrl || '';

          const { data: sectors } = await supabase.from('sectors').select('id, name').eq('user_id', userId);
          let pixelSectorId = sectors?.find((s: any) => s.name === 'Pixel AI')?.id;
          if (!pixelSectorId) {
            const { data: newSector } = await supabase.from('sectors').insert({ user_id: userId, name: 'Pixel AI', color: '#EC4899' }).select().single();
            pixelSectorId = newSector?.id;
          }

          await supabase.from('files').insert({
            user_id: userId,
            name: `pixel-${Date.now()}.png`,
            original_name: `pixel-${Date.now()}.png`,
            storage_path: imagePath,
            mime_type: 'image/png',
            size: imageBlob.size,
            sector_id: pixelSectorId || null,
          });
        }
      } catch (e) {
        console.error('Image persistence error:', e);
      }

      const imageCaption = `Here's the visual I created based on your brief.`;

      await supabase.from('pixel_messages').insert({ user_id: userId, role: 'user', content: message, mode });
      const { data: assistantMsg } = await supabase.from('pixel_messages').insert({
        user_id: userId, role: 'assistant', content: imageCaption, mode, is_image: true, image_url: permanentImageUrl,
      }).select().single();

      // AGENT-008: shared audit log table (see video block above for rationale)
      if (settings.internal_audit_logging) {
        await supabaseAdmin.from('osha_audit_logs').insert({
          user_id: userId,
          message_id: assistantMsg?.id || null,
          heart_rules_used: heartRules,
          brain_chunks_used: brainContext.length,
          compliance_status: 'pass',
          compliance_notes: `Pixel: image generated via ${imageProvider}/${imageModel}`,
          retrieval_ms: retrievalMs,
          llm_provider: imageProvider,
          llm_model: imageModel,
        });
      }

      return new Response(JSON.stringify({
        content: imageCaption,
        isImage: true,
        imageUrl: permanentImageUrl,
        audit: { heartCount: heartRules.length, brainCount: brainContext.length, complianceStatus: 'pass' },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (e: any) {
      console.error('Image generation error:', e);
      const errMsg = 'I encountered an error generating the image. I can provide a detailed art direction brief instead — just ask.';
      return new Response(JSON.stringify({
        content: errMsg,
        audit: { heartCount: heartRules.length, brainCount: brainContext.length, complianceStatus: 'pass' },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ── Step 6: Text-only chat completion (fallback for text/diagram requests) ──
  const useGemini = !openaiKey && !!geminiKey;
  let responseContent = '';
  let complianceStatus = 'pass';
  const llmProvider = useGemini ? 'gemini' : 'openai';
  const llmModel = useGemini ? (llmSettings?.gemini_text_model || 'gemini-1.5-pro') : (llmSettings?.openai_text_model || 'gpt-4o');

  try {
    if (useGemini) {
      const geminiMessages = [
        ...conversationHistory,
        { role: 'user' as const, content: typeof userContent === 'string' ? userContent : message },
      ];

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${llmModel}:generateContent?key=${geminiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: TOKEN_BUDGETS.CHAT_RESPONSE },
        }),
      });

      if (!geminiRes.ok) throw new Error(await geminiRes.text());
      const geminiData = await geminiRes.json();
      responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    } else {
      const openaiMessages: { role: string; content: string | object[] }[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userContent },
      ];

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: llmModel,
          messages: openaiMessages,
          max_tokens: TOKEN_BUDGETS.CHAT_RESPONSE,
          temperature: 0.8,
        }),
      });

      if (!openaiRes.ok) throw new Error(await openaiRes.text());
      const openaiData = await openaiRes.json();
      responseContent = openaiData.choices?.[0]?.message?.content || 'No response generated.';
    }

    if (responseContent.toLowerCase().includes('compliance: refused') || responseContent.toLowerCase().includes('**compliance:** refused')) {
      complianceStatus = 'refused';
    } else if (responseContent.toLowerCase().includes('compliance: adjusted') || responseContent.toLowerCase().includes('**compliance:** adjusted')) {
      complianceStatus = 'adjusted';
    }
  } catch (e: any) {
    console.error('Chat completion error:', e);
    responseContent = 'I encountered an error processing your request. Please try again.';
    complianceStatus = 'pass';
  }

  // stripDashes: deterministic backstop for the "No em dashes" Heart rule,
  // applied once before persist + return so it covers both.
  responseContent = stripDashes(responseContent);

  // ── Step 7: Persist messages ─────────────────────────────────────────────
  await supabase.from('pixel_messages').insert({ user_id: userId, role: 'user', content: message, mode });
  const { data: assistantMsg } = await supabase.from('pixel_messages').insert({
    user_id: userId, role: 'assistant', content: responseContent, mode,
  }).select().single();

  // AGENT-008: shared audit log table (see video block above for rationale)
  if (settings.internal_audit_logging) {
    await supabaseAdmin.from('osha_audit_logs').insert({
      user_id: userId,
      message_id: assistantMsg?.id || null,
      heart_rules_used: heartRules,
      brain_chunks_used: brainContext.length,
      compliance_status: complianceStatus,
      compliance_notes: complianceStatus !== 'pass' ? `Pixel: output ${complianceStatus} by Heart rules` : null,
      retrieval_ms: retrievalMs,
      llm_provider: llmProvider,
      llm_model: llmModel,
    });
  }

  return new Response(JSON.stringify({
    content: responseContent,
    audit: { heartCount: heartRules.length, brainCount: brainContext.length, complianceStatus },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
