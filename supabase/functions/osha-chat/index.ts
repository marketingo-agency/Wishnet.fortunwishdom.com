/**
 * Osha Chat Edge Function
 *
 * Governed chatbot for Fortun Wishnet.
 * - Only accessible to authenticated users (not admin-only)
 * - Mandatory Heart + Brain retrieval before every response
 * - Heart always wins over Brain
 * - Audit logging for every turn
 * - Image generation when enabled in settings
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { sanitizeForPrompt } from '../_shared/sanitize.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';
import { getAgentPrompts } from '../_shared/system-prompts.ts';

// SEC-004: 20 requests per minute per user (governed chatbot, heavier per-request)
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

// SEC-003: CORS tightened from wildcard to allowed origins list
let corsHeaders: Record<string, string> = getCorsHeaders(null);

// AGENT-017: Generate a unique request ID for tracing/debugging
function generateRequestId(): string {
  return crypto.randomUUID();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OshaSettings {
  default_mode: string;
  default_language: string;
  auto_detect_language: boolean;
  default_verbosity: string;
  response_structure: string;
  hallucination_control: boolean;
  heart_strictness: string;
  refusal_style: string;
  safety_guard_mode: boolean;
  retrieval_depth: string;
  context_window_messages: number;
  internal_audit_logging: boolean;
  bubble_enabled: boolean;
  bubble_scope: string;
  bubble_greeting: string;
  bubble_quick_starters: Array<{ label: string; prompt: string }>;
  bubble_remember_state: boolean;
  max_file_size_mb: number;
  max_pages_processed: number;
  chunking_strategy: string;
  preferred_file_output: string;
  citation_behavior: boolean;
  image_generation_enabled: boolean;
  image_default_size: string;
  image_aspect_ratio: string;
  image_brand_preset: string;
  file_analysis_model: string;
  file_analysis_provider: string;
  image_provider: string;
  image_model: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AttachmentContext {
  name: string;
  type: string;
  content: string; // extracted text or base64 for images
  isImage?: boolean;
}

interface RequestBody {
  action: 'chat' | 'get-settings' | 'save-settings' | 'clear-history' | 'deep-research' | 'deep-research-clarify' | 'deep-research-execute' | 'poll-research' | 'web-search' | 'save-to-brain';
  message?: string;
  mode?: string;
  conversationHistory?: ChatMessage[];
  attachments?: AttachmentContext[];
  settings?: Partial<OshaSettings>;
  responseId?: string;
  title?: string;
  content?: string;
  category?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDepthLimit(depth: string): number {
  if (depth === 'small') return 15;
  if (depth === 'large') return 50;
  return 30;
}

async function fetchHeartRules(supabaseAdmin: ReturnType<typeof createClient>): Promise<{ name: string; content: string; priority: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('heart_rules')
    .select('name, rule_content, priority, is_global, assigned_agents, is_active')
    .eq('is_active', true)
    .or('is_global.eq.true,assigned_agents.cs.{"osha"}');

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
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
): Promise<{ content: string }[]> {
  const embedding = await generateEmbedding(query, openaiKey);
  if (!embedding) return [];

  const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.2,
    match_count: limit,
    filter_source_types: ['brain_document', 'wishpedia_entry'],
    filter_agent_id: 'osha',
  });

  if (error) {
    console.error('Brain search error:', error);
    return [];
  }
  return (data || []).map((d: any) => ({ content: d.content }));
}

function buildSystemPrompt(
  heartRules: { name: string; content: string; priority: string }[],
  brainContext: { content: string }[],
  mode: string,
  settings: OshaSettings,
  agentStatuses?: { agent_id: string; is_active: boolean; model: string; provider: string }[],
  agentConfigs?: {
    promptor?: Record<string, unknown> | null;
    pixel?: Record<string, unknown> | null;
    osha?: Record<string, unknown> | null;
  },
  // AGENT-007: DB-sourced mode instructions override these defaults
  dbModeInstructions?: Record<string, string>,
): string {
  const defaultModeInstructions: Record<string, string> = {
    // Assistant modes
    guide: 'You explain clearly with step-by-step structure, examples, and onboarding-friendly language. Use headings, numbered steps, and practical examples.',
    operator: 'You are concise, action-oriented. Respond with tasks, checklists, and direct answers. Avoid preamble. Lead with the action.',
    creative: 'You are imaginative and expressive, generating novel ideas while respecting all Heart rules. Use vivid language and explore possibilities.',
    analyst: 'You are analytical and thorough. Source claims, structure outputs, reason carefully. Use tables, comparisons, and evidence-based reasoning.',
    // Ideation modes (from Muse)
    spark: 'You are in Spark mode — a rapid-fire idea generator. Generate many ideas quickly (20+ when asked). Output as numbered lists grouped by themes. Each idea: title, one-line summary, and use-case hint. Prioritize volume and variety over depth. Be bold, surprising, and creative.',
    expand: 'You are in Expand mode — a concept development expert. Take one idea and develop it into a complete concept with: messaging pillars, creative directions, do/avoid list, execution outline, and 2-3 variants. Be thorough and strategic.',
    combine: 'You are in Combine mode — a hybrid concept engineer. Merge multiple ideas into stronger hybrid concepts. For each hybrid: name, core premise, how elements fuse, unique value proposition, and execution sketch. Find non-obvious connections.',
    filter: 'You are in Filter mode — a structured idea evaluator. Score and rank ideas using these criteria: Originality (1-10), Feasibility (1-10), Brand Fit (1-10), Cost Efficiency (1-10), Time to Market (1-10), Emotional Impact (1-10), Clarity (1-10). Output a scoring table, shortlist top 3-5, and explain your reasoning.',
    workshop: 'You are in Workshop mode — a brainstorming facilitator. Guide the user through a structured creative session: 1) Ask opening questions to understand goals, 2) Generate ideas based on answers, 3) Help refine and shortlist, 4) Produce a Workshop Summary with key decisions and next actions.',
  };

  // AGENT-007: merge DB overrides over defaults
  const modeInstructions = { ...defaultModeInstructions, ...dbModeInstructions };

  const verbosityInstructions: Record<string, string> = {
    short: 'Keep responses brief and to the point — 1-3 short paragraphs maximum.',
    standard: 'Provide complete, well-structured responses of appropriate length.',
    detailed: 'Provide comprehensive, in-depth responses with full context and examples.',
  };

  const strictnessInstructions: Record<string, string> = {
    enforce_and_propose: 'If a request violates Heart rules: refuse the violating part, explain briefly, and propose a compliant alternative.',
    enforce_and_redirect: 'If a request violates Heart rules: refuse firmly and redirect to what you can help with.',
    always_enforce: 'Always enforce Heart rules strictly. Refuse any request that violates them without exception.',
  };

  const refusalStyles: Record<string, string> = {
    soft: 'When refusing, use gentle, understanding language.',
    neutral: 'When refusing, use clear, professional language.',
    firm: 'When refusing, use direct, firm language.',
  };

  const heartSection = heartRules.length > 0
    ? `## MANDATORY HEART RULES — ALWAYS ENFORCE, ALWAYS TAKE PRECEDENCE\n${heartRules.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}\n\n`
    : `## HEART RULES\nNo specific Heart rules loaded. Default to strict, safe, brand-respectful behavior.\n\n`;

  const brainSection = brainContext.length > 0
    ? `## BRAND KNOWLEDGE (from Fortun Mastermind Brain & Wishpedia)\nUse this as authoritative context. This includes Fortun universe characters, creatures, and brand knowledge from Wishpedia. Do not contradict it.\n${brainContext.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}\n\n`
    : `## BRAND KNOWLEDGE\nNo specific Brain context retrieved for this query. If the user asks about Fortun-specific facts you don't have, say so honestly and suggest they add the information to the Brain knowledge base.\n\n`;

  // ── Build dynamic agent registry ──────────────────────────────────────────
  const agentMeta: Record<string, { name: string; role: string; capabilities: string }> = {
    nexus: { name: 'Nexus', role: 'LLM Control Center', capabilities: 'Test LLM provider connections (OpenAI, Gemini), configure agent settings (model, provider, temperature, max tokens, system prompt), manage quick prompts, view provider status.' },
    promptor: { name: 'Promptor', role: 'Prompt Engineer AI', capabilities: 'Create and optimize prompts for text, image, social media copy, social media images, and video. Outputs structured briefs with full/short prompts, QA checklists, negatives, variants, and compliance notes. Uses Heart rules and Brain knowledge for brand-aware prompt engineering.' },
    osha: { name: 'Osha (you)', role: 'AI Assistant, Ideation & Research Agent', capabilities: '10 modes (Guide, Operator, Creative, Analyst, Spark, Expand, Combine, Filter, Workshop, Deep Research). File analysis (PDF, DOCX, XLSX, images via Gemini). Image generation (OpenAI/Gemini). Web search (permission-based). Website URL analysis. Save responses to Brain. Mermaid diagram rendering. Up to 10,000-message history.' },
    pixel: { name: 'Pixel', role: 'Visual Creator AI', capabilities: 'AI image and video generation for social media, presentations, and marketing. Blueprint system for reusable visual styles (palette, composition, typography, style rules). Brand-aware visuals using Heart rules and Brain knowledge. Multiple modes: Quick Create, Campaign Pack, Brand Suite, Editorial.' },
    echo: { name: 'Echo', role: 'Customer Support AI', capabilities: 'Handles customer support via Gmail, tickets, and embeddable chatbot. (Coming Soon — not yet active)' },
    pulse: { name: 'Pulse', role: 'Community Manager AI', capabilities: 'Manages social media interactions, replies to comments/messages, schedules posts across platforms. (Coming Soon — not yet active)' },
  };

  // Helper to format config fields
  const formatConfig = (cfg: Record<string, unknown> | null | undefined, keys: string[]): string => {
    if (!cfg) return '';
    const parts: string[] = [];
    for (const key of keys) {
      if (key in cfg && cfg[key] !== null && cfg[key] !== undefined) {
        parts.push(`${key}: ${cfg[key]}`);
      }
    }
    return parts.length > 0 ? `\n  Current User Configuration: ${parts.join(', ')}` : '';
  };

  const agentConfigKeys: Record<string, string[]> = {
    promptor: ['default_language', 'default_output_type', 'default_verbosity', 'heart_strictness', 'include_short_prompt', 'include_negatives', 'include_qa_checklist', 'image_aspect_ratio', 'video_duration_default', 'social_platform_default', 'retrieval_depth'],
    pixel: ['default_mode', 'default_language', 'image_provider', 'image_model', 'default_aspect_ratio', 'default_resolution', 'image_generation_enabled', 'video_generation_enabled', 'heart_strictness', 'retrieval_depth'],
    osha: ['default_mode', 'default_language', 'retrieval_depth', 'image_generation_enabled', 'image_provider', 'image_model', 'hallucination_control', 'heart_strictness', 'max_file_size_mb', 'max_pages_processed'],
  };

  let agentRegistryLines = '';
  for (const [agentId, meta] of Object.entries(agentMeta)) {
    const dbRow = agentStatuses?.find(a => a.agent_id === agentId);
    const status = dbRow ? (dbRow.is_active ? '✅ Active' : '❌ Inactive') : (agentId === 'echo' || agentId === 'pulse' ? '🔜 Coming Soon' : '⚪ Not configured');
    const modelInfo = dbRow ? ` | Model: ${dbRow.model} (${dbRow.provider})` : '';
    const configData = agentConfigs?.[agentId as keyof typeof agentConfigs];
    const configLine = formatConfig(configData, agentConfigKeys[agentId] || []);
    agentRegistryLines += `- **${meta.name}** — ${meta.role} | Status: ${status}${modelInfo}\n  Capabilities: ${meta.capabilities}${configLine}\n`;
  }

  const platformKnowledge = `## PLATFORM KNOWLEDGE — FORTUN WISHNET

Fortun Wishnet is a private business platform for AI-powered content creation, knowledge management, marketing, product catalog, and community management. Below is the complete platform architecture. Use this to answer any question about the platform, its tools, agents, or features.

### AI Agents Registry (live from database)
${agentRegistryLines}
### MasterMind System
MasterMind is the platform's knowledge and compliance engine with three pillars:
- **Brain** — Knowledge base organized into categories (Brand, Products, Support, Operations) and sections (General or Agent-specific). Each section holds documents (PDF, text, images) that are vectorized into embeddings for semantic retrieval (RAG). Agents query Brain for brand-accurate context before every response.
- **Heart** — Compliance rule engine. Rules have names, content, priorities (low/medium/high/critical), categories, and can be global or assigned to specific agents. Heart rules ALWAYS override Brain knowledge and LLM output ("Heart always wins").
- **Vector Store** — RAG embeddings viewer. Shows all vectorized chunks from Brain documents and Heart rules with their metadata, similarity scores, and processing status.

### Files Manager
Upload, organize, and manage files with sectors (folders), tags, file versioning, pinning, trash/restore, and storage quota tracking. Supports PDF inline preview, file inspector with metadata, and configurable allowed file types and size limits.

### Other Platform Modules
- **Taskforce** — Task and project management (coming soon)
- **Marketing Hub** — Marketing planning and operations (coming soon)
- **Fortun Wishdom** — Product catalog with categories: Main, Plushes, Figurines, Cards, Stocks

- **Dashboard** — Platform overview and quick access to all modules
- **Settings** — Account settings, branding (logos, favicon, app title), LLM provider configuration (OpenAI, Gemini API keys, model selection), user management with role-based permissions (admin/agent roles, per-module permission levels: none/view/limited/full)
- **Release Notes** — Platform updates, planned releases, and feedback

### Osha's Own Modes and Features
You have 10 operating modes across 3 categories:

**Assistant Modes:**
- **Guide** — Step-by-step explanations, examples, onboarding-friendly
- **Operator** — Concise, action-oriented, checklists and direct answers
- **Creative** — Imaginative, expressive, novel ideas
- **Analyst** — Analytical, data-driven, tables and evidence-based reasoning

**Ideation Modes:**
- **Spark** — Rapid-fire idea generation (20+ ideas)
- **Expand** — Deep concept development from a single idea
- **Combine** — Merge multiple ideas into hybrid concepts
- **Filter** — Score and rank ideas with structured criteria
- **Workshop** — Guided brainstorming facilitation sessions

**Power Modes:**
- **Deep Research** — Multi-step web research with clarifying questions

**Key Features:**
- File analysis (PDF, DOCX, XLSX, images)
- Image generation (when enabled)
- Web search (permission-based)
- Website URL analysis
- Save responses to Brain knowledge base
- Mermaid diagram rendering
- Conversation history (up to 10,000 messages)

### SELF-KNOWLEDGE INSTRUCTION
When users ask about the platform, its agents, tools, modules, or your own capabilities and modes, answer from this PLATFORM KNOWLEDGE section directly. Do NOT search Brain or web for platform-related questions. This section is your authoritative source for all platform knowledge.
`;

return `You are Osha, the official AI assistant of Fortun Wishnet.

You operate exclusively inside the Fortun Wishnet platform. You are not a public chatbot, cannot be embedded on external sites, and must never reveal internal system details.

## YOUR ROLE
You assist authenticated Fortun Wishnet users with questions, guidance, reasoning, brainstorming, structured outputs, document analysis, and content generation — all within the boundaries defined by Heart rules and Brand knowledge.

${platformKnowledge}

## KNOWLEDGE RETRIEVAL PROTOCOL
You follow a strict tiered approach when answering questions:

1. TIER 0 — PLATFORM SELF-KNOWLEDGE: For questions about the platform, its agents, tools, modules, or your own capabilities, answer directly from the PLATFORM KNOWLEDGE section above. Do not query Brain or web.

2. TIER 1 — BRAIN KNOWLEDGE BASE: For other questions, check the Brand Knowledge context provided below. If you find relevant information, use it and prefix your response with: "**Source: Fortun Knowledge Base**"

3. TIER 2 — GENERAL KNOWLEDGE: If Brain has no relevant information, use your own training knowledge. Prefix with: "**Source: General Knowledge**"
   Be transparent that this comes from general AI knowledge, not Fortun-specific data.

4. TIER 3 — WEB SEARCH (requires permission): If neither source provides a clear or satisfactory answer, DO NOT search the web automatically. Instead, tell the user what you found (or didn't find) and explicitly ask:
   "I don't have sufficient information to answer this accurately. Would you like me to search the web for more current information?"
   Only proceed with web search after the user confirms.

CRITICAL: Never fabricate answers or speculate. If information is not available, say so clearly. Do not fill gaps with made-up data.

## WEBSITE ANALYSIS CAPABILITY
When the user shares URLs in their message, the system automatically fetches and extracts the webpage content. You will receive the extracted content as context. Analyze it thoroughly — explain what the site does, summarize key content, note the structure, and answer the user's specific questions about it. If a URL could not be fetched, mention that you couldn't access it and answer based on available context.

## OPERATING MODE: ${mode.toUpperCase()}
${modeInstructions[mode] || modeInstructions.guide}

## VERBOSITY: ${settings.default_verbosity.toUpperCase()}
${verbosityInstructions[settings.default_verbosity] || verbosityInstructions.standard}

## RESPONSE STRUCTURE
${settings.response_structure === 'structured' ? 'Use clear headings, sections, and structured outputs.' : settings.response_structure === 'bullet' ? 'Format responses using clear bullet points and sub-bullets for readability. Use bold text for key terms.' : 'Use natural prose with markdown formatting for readability.'}

${heartSection}${brainSection}## ENFORCEMENT
${strictnessInstructions[settings.heart_strictness] || strictnessInstructions.enforce_and_propose}
${refusalStyles[settings.refusal_style] || refusalStyles.neutral}

## HALLUCINATION CONTROL
${settings.hallucination_control ? 'If you do not have authoritative information from Brain or Heart, say so clearly. Do not invent Fortun canon, brand facts, or policies. Ask the user for clarification or suggest adding the information to the knowledge base.' : 'Provide your best response based on available context.'}

## SAFETY
${settings.safety_guard_mode ? 'When uncertain whether a response is Heart-compliant, produce the safest compliant output and ask the user for any missing constraints.' : ''}

## LANGUAGE
${(() => {
  const langMap: Record<string, string> = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', pt: 'Portuguese', it: 'Italian', nl: 'Dutch', ar: 'Arabic', tr: 'Turkish', ru: 'Russian', pl: 'Polish', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', sv: 'Swedish', id: 'Indonesian', th: 'Thai' };
  const langName = langMap[settings.default_language] || 'English';
  return settings.auto_detect_language
    ? `Auto-detect the user's language from their message and respond in the same language. If uncertain, default to ${langName}.`
    : `Always respond in ${langName}.`;
})()}

## FILE ANALYSIS DEFAULT
${settings.preferred_file_output ? `When a user attaches a file without specifying what they want, default to providing a "${settings.preferred_file_output}" of the file content. The user can override this by specifying a different output type in their message.` : ''}

## CITATIONS
${settings.citation_behavior ? 'When using information from Brain Knowledge or attached files, include inline source references in the format [Source: document name] or [Source: section title]. This helps the user trace information back to its origin.' : 'Do not include source citation references in responses unless the user explicitly asks for them.'}

## MARKDOWN
Always render responses using proper markdown: headings, lists, tables, code blocks, blockquotes, bold/italic as appropriate.

## IDENTITY
- You are Osha. Never claim to be GPT, ChatGPT, Claude, Gemini, or any other AI.
- You are powered by Fortun Wishnet's AI infrastructure.
- You do not expose internal IDs, vector chunks, or database references to users.`;
}

// ─── URL Content Fetcher via Jina Reader ──────────────────────────────────────

async function fetchUrlContent(url: string): Promise<{ url: string; content: string } | null> {
  // AGENT-018: Validate URL length and format before fetching
  if (url.length > 2000) {
    console.warn(`[osha-chat] URL rejected: exceeds 2000 chars (${url.length})`);
    return null;
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`[osha-chat] URL rejected: invalid protocol ${parsed.protocol}`);
      return null;
    }
  } catch {
    console.warn(`[osha-chat] URL rejected: malformed URL`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/markdown' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    return { url, content: text.slice(0, 30000) };
  } catch {
    return null;
  }
}

function detectUrlsInMessage(message: string): string[] {
  const regex = /https?:\/\/[^\s<>"')\]]+/gi;
  const matches = message.match(regex) || [];
  return matches.slice(0, 3); // Max 3 URLs
}

function detectImageIntent(message: string): boolean {
  const imageKeywords = [
    'generate image', 'create image', 'make image', 'draw', 'visualize',
    'generate a picture', 'create a picture', 'illustrate', 'design an image',
    'generate photo', 'create photo', 'make a visual', 'generate visual',
    'create artwork', 'generate artwork', 'dall-e', 'image of',
  ];
  const lower = message.toLowerCase();
  return imageKeywords.some(k => lower.includes(k));
}

// ─── Image Prompt Builder — injects Brain knowledge + Heart rules ──────────────

async function buildImagePrompt(
  userMessage: string,
  brainContext: { content: string }[],
  heartRules: { name: string; content: string; priority: string }[],
  brandPreset: string,
  openaiKey: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  depthLimit: number,
): Promise<string> {
  // Perform a targeted image-focused re-query to maximize visual descriptor recall
  let visualChunks: { content: string }[] = [];
  if (openaiKey) {
    const imageQuery = `${userMessage} visual appearance design look character style colors`;
    try {
      visualChunks = await searchBrain(supabaseAdmin, imageQuery, openaiKey, depthLimit);
    } catch {
      // Non-fatal — fall back to existing brainContext
    }
  }

  // Merge existing brainContext with targeted visual chunks, deduplicate
  const seen = new Set<string>();
  const allChunks: { content: string }[] = [];
  for (const chunk of [...brainContext, ...visualChunks]) {
    if (!seen.has(chunk.content)) {
      seen.add(chunk.content);
      allChunks.push(chunk);
    }
  }

  // Build visual knowledge section (cap at ~2500 chars total)
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
      visualKnowledge = `\n\nVISUAL CONTEXT (use this to accurately depict the subject):\n${parts.join('\n---\n')}`;
    }
  }

  // Build Heart constraints section (brand-safety and visual rules only)
  let heartConstraints = '';
  if (heartRules.length > 0) {
    const visualRelevantKeywords = ['brand', 'visual', 'image', 'color', 'style', 'logo', 'content', 'appropriate', 'safe', 'guideline', 'identity', 'design', 'illustration', 'character', 'art'];
    const relevant = heartRules.filter(r => {
      const text = `${r.name} ${r.content}`.toLowerCase();
      return visualRelevantKeywords.some(kw => text.includes(kw));
    });
    // Fall back to all rules if none matched visual keywords
    const rulesForConstraints = relevant.length > 0 ? relevant : heartRules.slice(0, 5);
    heartConstraints = `\n\nBRAND COMPLIANCE CONSTRAINTS:\n${rulesForConstraints.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}`;
  }

  const brandStyle = brandPreset && brandPreset !== 'default' ? `\n\nBRAND STYLE: ${brandPreset}` : '';

  return `${userMessage}${visualKnowledge}${brandStyle}${heartConstraints}\n\nStyle: professional, high-quality digital illustration, brand-consistent, appropriate for all audiences.`;
}

// ─── PDF Extraction via Gemini native PDF support ─────────────────────────────

async function extractPdfWithGemini(fileName: string, base64Content: string, geminiKey: string, model = 'gemini-2.0-flash', maxPages = 50): Promise<string> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  const pageInstruction = maxPages && maxPages < 9999
    ? `Please extract and return the text content from the first ${maxPages} pages of this PDF document. If the document has fewer than ${maxPages} pages, extract all pages.`
    : 'Please extract and return ALL the text content from this PDF document.';

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: base64Content,
            },
          },
          {
            text: `${pageInstruction} Preserve the structure as much as possible including headings, paragraphs, tables, and lists. Return only the extracted text content without any commentary.`,
          },
        ],
      }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini PDF extraction failed: ${errText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── PDF Extraction via OpenAI vision ─────────────────────────────────────────

async function extractPdfWithOpenAI(fileName: string, base64Content: string, openaiKey: string, model = 'gpt-4o', maxPages = 50): Promise<string> {
  const pageInstruction = maxPages && maxPages < 9999
    ? `Please extract and return the text content from the first ${maxPages} pages of this PDF document. If the document has fewer than ${maxPages} pages, extract all pages.`
    : 'Please extract and return ALL the text content from this PDF document.';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'file',
            file: {
              filename: fileName,
              file_data: `data:application/pdf;base64,${base64Content}`,
            },
          },
          {
            type: 'text',
            text: `${pageInstruction} Preserve the structure as much as possible including headings, paragraphs, tables, and lists. Return only the extracted text content without any commentary.`,
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI PDF extraction failed: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Simple PDF Generator ─────────────────────────────────────────────────────

// ── Structured line types for rich PDF rendering ──
interface PdfLine {
  text: string;
  type: 'heading' | 'table-block' | 'body' | 'empty';
  level?: number; // heading level 1-6
  tableData?: { headers: string[]; rows: string[][]; colWidths: number[] };
}

function generateSimplePdf(text: string, title: string): Uint8Array {
  // ── Sanitize Unicode to ASCII for WinAnsiEncoding ──
  function sanitize(s: string): string {
    return s
      .replace(/\u2022/g, '-')
      .replace(/\u2014/g, '--')
      .replace(/\u2013/g, '-')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\u2026/g, '...')
      .replace(/[^\x00-\x7F]/g, '');
  }

  // PDF text encoding helper
  function pdfEscape(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  // ── Strip inline markdown only (preserve structure) ──
  function stripInline(s: string): string {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  // ── Approximate text width in points (Helvetica) ──
  function approxTextWidth(str: string, fontSize: number): number {
    // Helvetica average char width is ~0.52 * fontSize
    return str.length * fontSize * 0.52;
  }

  // ── Truncate text to fit in a given width ──
  function truncateToFit(str: string, maxWidth: number, fontSize: number): string {
    const avgCharWidth = fontSize * 0.52;
    const maxChars = Math.floor(maxWidth / avgCharWidth);
    if (str.length <= maxChars) return str;
    return str.slice(0, maxChars - 2) + '..';
  }

  // ── Parse markdown into structured lines ──
  function parseMarkdown(input: string): PdfLine[] {
    const lines = input.split('\n');
    const result: PdfLine[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line
      if (trimmed === '') {
        result.push({ text: '', type: 'empty' });
        i++;
        continue;
      }

      // Heading
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = sanitize(stripInline(headingMatch[2]));
        result.push({ text: headingText, type: 'heading', level });
        i++;
        continue;
      }

      // Table block (lines starting and ending with |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        // Parse cells
        const allRows: string[][] = [];
        let hasHeader = false;
        for (let r = 0; r < tableLines.length; r++) {
          const cells = tableLines[r].split('|').slice(1, -1).map(c => sanitize(stripInline(c.trim())));
          if (cells.every(c => /^[:\-\s]+$/.test(c) || c === '')) {
            hasHeader = true;
            continue; // skip separator row
          }
          allRows.push(cells);
        }
        if (allRows.length > 0) {
          const colCount = Math.max(...allRows.map(r => r.length));
          // Normalize all rows to same column count
          const normalizedRows = allRows.map(r => {
            const row = [...r];
            while (row.length < colCount) row.push('');
            return row;
          });
          const headers = hasHeader ? normalizedRows[0] : [];
          const dataRows = hasHeader ? normalizedRows.slice(1) : normalizedRows;

          // Calculate proportional column widths in points
          const availableWidth = 512; // 612 - 50 - 50
          const cellPadding = 10; // 5 on each side
          const maxContentLengths: number[] = [];
          for (let c = 0; c < colCount; c++) {
            let maxLen = headers[c]?.length || 3;
            for (const row of dataRows) {
              maxLen = Math.max(maxLen, (row[c] || '').length);
            }
            maxContentLengths.push(maxLen);
          }
          const totalLen = maxContentLengths.reduce((a, b) => a + b, 0) || 1;
          const minColWidth = 50;
          const colWidths = maxContentLengths.map(len => {
            return Math.max(minColWidth, Math.floor((len / totalLen) * availableWidth));
          });
          // Normalize to fit exactly in available width
          const totalColWidth = colWidths.reduce((a, b) => a + b, 0);
          if (totalColWidth !== availableWidth) {
            const scale = availableWidth / totalColWidth;
            for (let c = 0; c < colWidths.length; c++) {
              colWidths[c] = Math.floor(colWidths[c] * scale);
            }
            // Distribute remainder to last column
            const diff = availableWidth - colWidths.reduce((a, b) => a + b, 0);
            colWidths[colWidths.length - 1] += diff;
          }

          result.push({
            text: '',
            type: 'table-block',
            tableData: { headers, rows: dataRows, colWidths },
          });
          result.push({ text: '', type: 'empty' });
        }
        continue;
      }

      // Code block
      if (trimmed.startsWith('```')) {
        i++; // skip opening fence
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          result.push({ text: sanitize(lines[i]), type: 'body' });
          i++;
        }
        if (i < lines.length) i++; // skip closing fence
        result.push({ text: '', type: 'empty' });
        continue;
      }

      // Horizontal rule
      if (/^[-*_]{3,}$/.test(trimmed)) {
        result.push({ text: '', type: 'empty' });
        i++;
        continue;
      }

      // List items
      if (/^\s*[-*+]\s+/.test(line)) {
        result.push({ text: sanitize('  - ' + stripInline(trimmed.replace(/^[-*+]\s+/, ''))), type: 'body' });
        i++;
        continue;
      }

      // Numbered list
      if (/^\s*\d+\.\s+/.test(line)) {
        const numMatch = trimmed.match(/^(\d+\.)\s+(.*)/);
        if (numMatch) {
          result.push({ text: sanitize('  ' + numMatch[1] + ' ' + stripInline(numMatch[2])), type: 'body' });
        } else {
          result.push({ text: sanitize(stripInline(trimmed)), type: 'body' });
        }
        i++;
        continue;
      }

      // Blockquote
      if (trimmed.startsWith('>')) {
        result.push({ text: sanitize(stripInline(trimmed.replace(/^>\s*/, ''))), type: 'body' });
        i++;
        continue;
      }

      // Regular body text
      result.push({ text: sanitize(stripInline(trimmed)), type: 'body' });
      i++;
    }

    return result;
  }

  const structuredLines = parseMarkdown(text);

  // ── Font & layout constants ──
  const BODY_SIZE = 11;
  const BODY_LINE_H = 14;
  const H1_SIZE = 15;
  const H2_SIZE = 13;
  const H3_SIZE = 12;
  const HEADING_LINE_H = 18;
  const TABLE_FONT_SIZE = 9;
  const TABLE_ROW_H = 14;
  const TABLE_HEADER_ROW_H = 16;
  const TITLE_SIZE = 16;
  const marginLeft = 50;
  const marginTop = 50;
  const marginBottom = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxBodyChars = 85;
  const CELL_PAD = 5;

  // ── Word-wrap a single structured line into multiple lines preserving type ──
  function wrapLine(line: PdfLine): PdfLine[] {
    if (line.type === 'empty' || line.type === 'table-block') return [line];
    if (line.text.length <= maxBodyChars) return [line];

    const words = line.text.split(' ');
    const result: PdfLine[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).length > maxBodyChars && current.length > 0) {
        result.push({ ...line, text: current });
        current = word;
      } else {
        current = current ? current + ' ' + word : word;
      }
    }
    if (current) result.push({ ...line, text: current });
    return result;
  }

  // Wrap all lines
  const allLines: PdfLine[] = [];
  for (const line of structuredLines) {
    allLines.push(...wrapLine(line));
  }

  // ── Calculate table block height ──
  function tableBlockHeight(td: { headers: string[]; rows: string[][]; }): number {
    const headerH = td.headers.length > 0 ? TABLE_HEADER_ROW_H : 0;
    return headerH + td.rows.length * TABLE_ROW_H + 4; // 4pt padding
  }

  // ── Paginate based on varying line heights ──
  interface PageContent { lines: PdfLine[]; }
  const pages: PageContent[] = [];
  let currentPage: PdfLine[] = [];
  let currentY = pageHeight - marginTop;
  let isFirstPage = true;

  // Account for title on first page
  if (isFirstPage) {
    currentY -= TITLE_SIZE + BODY_LINE_H * 2;
  }

  for (const line of allLines) {
    let lineH = BODY_LINE_H;
    if (line.type === 'heading') {
      lineH = HEADING_LINE_H + (line.level && line.level <= 2 ? 8 : 4);
    } else if (line.type === 'table-block' && line.tableData) {
      lineH = tableBlockHeight(line.tableData);
    } else if (line.type === 'empty') {
      lineH = BODY_LINE_H * 0.6;
    }

    if (currentY - lineH < marginBottom) {
      pages.push({ lines: currentPage });
      currentPage = [];
      currentY = pageHeight - marginTop;
      isFirstPage = false;
    }

    currentPage.push(line);
    currentY -= lineH;
  }
  if (currentPage.length > 0) pages.push({ lines: currentPage });
  if (pages.length === 0) pages.push({ lines: [{ text: '', type: 'empty' }] });

  // ── Build PDF objects ──
  const objects: string[] = [];
  let objCount = 0;

  function addObj(content: string): number {
    objCount++;
    objects.push(`${objCount} 0 obj\n${content}\nendobj`);
    return objCount;
  }

  // Obj 1: Catalog
  addObj('<< /Type /Catalog /Pages 2 0 R >>');

  // Obj 2: Pages (placeholder)
  const pagesObjIndex = objects.length;
  addObj('');

  // Obj 3: F1 - Helvetica (body)
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f1Num = objCount;

  // Obj 4: F2 - Helvetica-Bold (title + headings + table headers)
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const f2Num = objCount;

  // Create page objects
  const pageObjNums: number[] = [];

  for (let p = 0; p < pages.length; p++) {
    const pageLines = pages[p].lines;
    let stream = '';
    let curY = pageHeight - marginTop;
    let inText = false; // track BT/ET state

    function beginText() {
      if (!inText) { stream += 'BT\n'; inText = true; }
    }
    function endText() {
      if (inText) { stream += 'ET\n'; inText = false; }
    }

    if (p === 0) {
      // Title in bold
      beginText();
      stream += `/F2 ${TITLE_SIZE} Tf\n`;
      stream += `${marginLeft} ${curY} Td\n`;
      stream += `(${pdfEscape(sanitize(title))}) Tj\n`;
      curY -= TITLE_SIZE + BODY_LINE_H;
      endText();
      // Draw a line under title
      stream += `0.7 G\n0.5 w\n${marginLeft} ${curY + 4} m ${pageWidth - marginLeft} ${curY + 4} l S\n0 G\n`;
      curY -= BODY_LINE_H * 0.5;
    }

    for (const line of pageLines) {
      if (line.type === 'empty') {
        curY -= Math.round(BODY_LINE_H * 0.6);
        continue;
      }

      if (line.type === 'heading') {
        const level = line.level || 1;
        const fontSize = level <= 1 ? H1_SIZE : level === 2 ? H2_SIZE : H3_SIZE;
        const extraSpaceBefore = level <= 2 ? 8 : 4;
        curY -= extraSpaceBefore;
        beginText();
        stream += `/F2 ${fontSize} Tf\n`;
        stream += `${marginLeft} ${curY} Td\n`;
        stream += `(${pdfEscape(line.text)}) Tj\n`;
        endText();
        curY -= HEADING_LINE_H;
        continue;
      }

      if (line.type === 'table-block' && line.tableData) {
        endText(); // ensure we're outside BT/ET
        const td = line.tableData;
        const { headers, rows, colWidths } = td;
        const hasHeaders = headers.length > 0;
        const totalRows = (hasHeaders ? 1 : 0) + rows.length;
        const tableStartY = curY;

        // Calculate x positions for columns
        const colX: number[] = [marginLeft];
        for (let c = 0; c < colWidths.length; c++) {
          colX.push(colX[c] + colWidths[c]);
        }
        const tableRight = colX[colX.length - 1];

        // ── Draw table grid ──
        // Header background (light gray fill)
        if (hasHeaders) {
          stream += `0.93 g\n`; // light gray fill
          stream += `${marginLeft} ${tableStartY - TABLE_HEADER_ROW_H} ${tableRight - marginLeft} ${TABLE_HEADER_ROW_H} re f\n`;
          stream += `0 g\n`; // reset to black
        }

        // Horizontal lines
        stream += `0.5 G\n0.4 w\n`;
        // Top border
        stream += `${marginLeft} ${tableStartY} m ${tableRight} ${tableStartY} l S\n`;
        // Line below header
        let lineY = tableStartY;
        if (hasHeaders) {
          lineY -= TABLE_HEADER_ROW_H;
          stream += `${marginLeft} ${lineY} m ${tableRight} ${lineY} l S\n`;
        }
        // Lines below each data row
        for (let r = 0; r < rows.length; r++) {
          lineY -= TABLE_ROW_H;
          stream += `${marginLeft} ${lineY} m ${tableRight} ${lineY} l S\n`;
        }

        // Vertical lines (all columns)
        const tableBottomY = tableStartY - (hasHeaders ? TABLE_HEADER_ROW_H : 0) - rows.length * TABLE_ROW_H;
        for (let c = 0; c <= colWidths.length; c++) {
          stream += `${colX[c]} ${tableStartY} m ${colX[c]} ${tableBottomY} l S\n`;
        }

        stream += `0 G\n`; // reset stroke to black

        // ── Render cell text ──
        beginText();
        // Header row
        if (hasHeaders) {
          stream += `/F2 ${TABLE_FONT_SIZE} Tf\n`;
          const headerTextY = tableStartY - TABLE_HEADER_ROW_H + 4;
          for (let c = 0; c < headers.length; c++) {
            const cellText = truncateToFit(headers[c], colWidths[c] - CELL_PAD * 2, TABLE_FONT_SIZE);
            stream += `${colX[c] + CELL_PAD} ${headerTextY} Td\n`;
            stream += `(${pdfEscape(cellText)}) Tj\n`;
            // Reset position for next absolute Td
            stream += `${-(colX[c] + CELL_PAD)} ${-headerTextY} Td\n`;
          }
        }

        // Data rows
        stream += `/F1 ${TABLE_FONT_SIZE} Tf\n`;
        let rowTopY = tableStartY - (hasHeaders ? TABLE_HEADER_ROW_H : 0);
        for (let r = 0; r < rows.length; r++) {
          const textY = rowTopY - TABLE_ROW_H + 4;
          for (let c = 0; c < rows[r].length && c < colWidths.length; c++) {
            const cellText = truncateToFit(rows[r][c] || '', colWidths[c] - CELL_PAD * 2, TABLE_FONT_SIZE);
            stream += `${colX[c] + CELL_PAD} ${textY} Td\n`;
            stream += `(${pdfEscape(cellText)}) Tj\n`;
            stream += `${-(colX[c] + CELL_PAD)} ${-textY} Td\n`;
          }
          rowTopY -= TABLE_ROW_H;
        }
        endText();

        curY = tableStartY - (hasHeaders ? TABLE_HEADER_ROW_H : 0) - rows.length * TABLE_ROW_H - 4;
        continue;
      }

      // Body text
      beginText();
      stream += `/F1 ${BODY_SIZE} Tf\n`;
      stream += `${marginLeft} ${curY} Td\n`;
      stream += `(${pdfEscape(line.text)}) Tj\n`;
      endText();
      curY -= BODY_LINE_H;
    }

    endText(); // close any open text block

    const streamBytes = new TextEncoder().encode(stream);
    addObj(`<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);
    const contentObjNum = objCount;

    addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${f1Num} 0 R /F2 ${f2Num} 0 R >> >> >>`);
    pageObjNums.push(objCount);
  }

  // Update Pages object
  const kidsStr = pageObjNums.map(n => `${n} 0 R`).join(' ');
  objects[pagesObjIndex] = `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjNums.length} >>\nendobj`;

  // Build final PDF
  const header = '%PDF-1.4\n';
  const body = objects.join('\n') + '\n';
  const xrefOffset = header.length + body.length;

  let xref = `xref\n0 ${objCount + 1}\n`;
  xref += '0000000000 65535 f \n';
  let offset = header.length;
  for (const obj of objects) {
    xref += String(offset).padStart(10, '0') + ' 00000 n \n';
    offset += obj.length + 1;
  }

  const trailer = `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const pdfString = header + body + xref + trailer;
  return new TextEncoder().encode(pdfString);
}


Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  // AGENT-017: Request tracing — attach x-request-id to all responses
  const requestId = generateRequestId();
  const responseHeaders = { ...corsHeaders, 'x-request-id': requestId, 'Access-Control-Expose-Headers': 'x-request-id' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: responseHeaders });
  }

  console.log(`[osha-chat] request=${requestId} method=${req.method} url=${req.url}`);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // User-scoped client (respects RLS)
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service-role client (for writes to audit logs, reading llm_settings)
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // Verify auth via getUser (server round-trip, validates token properly)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = user.id;

  // SEC-004: rate limit check
  if (rateLimiter.check(userId)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
      { status: 429, headers: { ...responseHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action } = body;

  // ── GET SETTINGS ────────────────────────────────────────────────────────────
  if (action === 'get-settings') {
    const { data, error } = await supabase
      .from('osha_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ settings: data }), {
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── SAVE SETTINGS ───────────────────────────────────────────────────────────
  if (action === 'save-settings') {
    const { settings } = body;
    if (!settings) {
      return new Response(JSON.stringify({ error: 'settings required' }), {
        status: 400,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await supabase
      .from('osha_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from('osha_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('osha_settings')
        .insert({ ...settings, user_id: userId })
        .select()
        .single();
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ settings: result.data }), {
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── CLEAR HISTORY ───────────────────────────────────────────────────────────
  if (action === 'clear-history') {
    const { error } = await supabase
      .from('osha_messages')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── DEEP RESEARCH CLARIFY ─────────────────────────────────────────────────────
  if (action === 'deep-research-clarify') {
    const { message } = body;
    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), {
        status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: llmSettings } = await supabaseAdmin.from('llm_settings').select('*').limit(1).maybeSingle();
    const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key required' }), {
        status: 503, headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const conversationHistory = body.conversationHistory || [];
    const recentHistory = conversationHistory.slice(-10);

    try {
      const clarifyRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          max_tokens: 500,
          messages: [
            {
              role: 'system',
              content: `You are a research planning assistant. The user wants to conduct deep research on a topic. Based on their message and conversation history, generate exactly 3 targeted clarifying questions that will help focus and improve the research.

Format your response EXACTLY as:
Before I dive into the research, let me ask a few questions to make sure I cover exactly what you need:

1. [Question about scope/focus]
2. [Question about specific aspects they care about]
3. [Question about desired depth or angle]

Feel free to answer all three, or just the ones you find relevant. You can also just say "go ahead" if you want me to start right away with my best judgment.`,
            },
            ...recentHistory.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
            { role: 'user', content: message },
          ],
        }),
      });

      if (!clarifyRes.ok) {
        const errData = await clarifyRes.json();
        throw new Error(errData.error?.message || 'Failed to generate clarifying questions');
      }

      const clarifyData = await clarifyRes.json();
      const questions = clarifyData.choices?.[0]?.message?.content?.trim() || '';

      // Save the user message and the clarification questions to chat history
      await supabase.from('osha_messages').insert({ user_id: userId, role: 'user', content: message, mode: 'deep-research' });
      await supabase.from('osha_messages').insert({ user_id: userId, role: 'assistant', content: questions, mode: 'deep-research' });

      return new Response(JSON.stringify({ questions }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // ── DEEP RESEARCH EXECUTE ───────────────────────────────────────────────────
  if (action === 'deep-research-execute') {
    const originalTopic = body.message || '';
    const clarificationAnswers = body.content || '';
    if (!originalTopic) {
      return new Response(JSON.stringify({ error: 'message (original topic) required' }), {
        status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: llmSettings } = await supabaseAdmin.from('llm_settings').select('*').limit(1).maybeSingle();
    const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key required for deep research' }), {
        status: 503, headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const selectedModel = llmSettings?.openai_deep_research_model || 'o3-deep-research';
    const conversationHistory = body.conversationHistory || [];

    // Check if user said "go ahead" / short answer — skip reformulation
    const shortAnswerRegex = /^(go ahead|just do it|start|begin|proceed|let's go|do it|sure|yes|ok|okay|yep|yup|go|lancez|allez|oui|commence)[.!]?$/i;
    const isShortAnswer = shortAnswerRegex.test(clarificationAnswers.trim());

    let resolvedTopic = originalTopic;

    if (!isShortAnswer && clarificationAnswers) {
      // Use fast model to formulate an optimized research query
      try {
        const recentHistory = conversationHistory.slice(-10);
        const formulateRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            max_tokens: 500,
            messages: [
              {
                role: 'system',
                content: 'Based on the original research request, the conversation history, and the user\'s clarification answers, create an optimized, detailed research query. Be specific, include all relevant context, scope, and angles the user wants covered. Return ONLY the research query, nothing else.',
              },
              ...recentHistory.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
              { role: 'user', content: `Original research request: ${originalTopic}\n\nMy clarification answers: ${clarificationAnswers}` },
            ],
          }),
        });
        if (formulateRes.ok) {
          const formulateData = await formulateRes.json();
          const formulated = formulateData.choices?.[0]?.message?.content?.trim();
          if (formulated) resolvedTopic = formulated;
        }
      } catch (e) {
        console.error('Research formulation failed, using original topic:', e);
      }
    } else if (conversationHistory.length > 0) {
      // Still resolve pronouns for "go ahead" case
      try {
        const recentHistory = conversationHistory.slice(-10);
        const resolutionRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            max_tokens: 200,
            messages: [
              {
                role: 'system',
                content: 'Given the conversation history and the user\'s research request, rewrite the request as a clear, explicit research query. Resolve any pronouns. Return ONLY the rewritten query.',
              },
              ...recentHistory.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
              { role: 'user', content: originalTopic },
            ],
          }),
        });
        if (resolutionRes.ok) {
          const resolutionData = await resolutionRes.json();
          const resolved = resolutionData.choices?.[0]?.message?.content?.trim();
          if (resolved) resolvedTopic = resolved;
        }
      } catch (e) {
        console.error('Topic resolution failed:', e);
      }
    }

    console.log(`Deep research execute — resolved topic: "${resolvedTopic}" (original: "${originalTopic}")`);

    // Save user's clarification answers
    if (clarificationAnswers) {
      await supabase.from('osha_messages').insert({ user_id: userId, role: 'user', content: clarificationAnswers, mode: 'deep-research' });
    }

    // Fetch Heart + Brain
    const heartRules = await fetchHeartRules(supabaseAdmin);
    const depthLimit = 30;
    const brainContext = await searchBrain(supabaseAdmin, resolvedTopic, openaiKey, depthLimit);

    const contextPrefix = heartRules.length > 0
      ? `IMPORTANT BRAND RULES TO FOLLOW:\n${heartRules.map(r => `- ${r.name}: ${r.content}`).join('\n')}\n\n`
      : '';
    const brainPrefix = brainContext.length > 0
      ? `BRAND CONTEXT:\n${brainContext.map(c => c.content).join('\n')}\n\n`
      : '';

    const enrichedMessage = `${contextPrefix}${brainPrefix}RESEARCH REQUEST:\n${resolvedTopic}`;

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: selectedModel,
          input: enrichedMessage,
          tools: [{ type: 'web_search_preview' }],
          background: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Failed to start research');
      }

      const data = await response.json();

      if (data.status === 'completed') {
        const content = data.output_text || data.output?.[0]?.content?.[0]?.text || '';
        await supabase.from('osha_messages').insert({ user_id: userId, role: 'assistant', content, mode: 'deep-research' });
        if ((await supabase.from('osha_settings').select('internal_audit_logging').eq('user_id', userId).maybeSingle()).data?.internal_audit_logging !== false) {
          await supabaseAdmin.from('osha_audit_logs').insert({
            user_id: userId, heart_rules_used: heartRules, brain_chunks_used: brainContext.length,
            compliance_status: 'pass', compliance_notes: 'Deep research completed', llm_provider: 'openai', llm_model: selectedModel,
          });
        }
        return new Response(JSON.stringify({ status: 'completed', content, resolvedTopic }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ responseId: data.id, status: data.status, resolvedTopic }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ── DEEP RESEARCH (legacy, kept for backward compat) ──────────────────────────
  if (action === 'deep-research') {
    const { message } = body;
    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), {
        status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: llmSettings } = await supabaseAdmin.from('llm_settings').select('*').limit(1).maybeSingle();
    const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key required for deep research' }), {
        status: 503, headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const selectedModel = llmSettings?.openai_deep_research_model || 'o3-deep-research';

    // Step 1: Resolve the actual research topic using a fast model
    const conversationHistory = body.conversationHistory || [];
    let resolvedTopic = message;
    if (conversationHistory.length > 0) {
      try {
        const recentHistory = conversationHistory.slice(-10);
        const resolutionRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            max_tokens: 200,
            messages: [
              {
                role: 'system',
                content: 'Given the conversation history and the user\'s latest message, rewrite the message as a clear, explicit research query. If the user refers to something from the conversation (e.g., "that", "it", "the topic above"), resolve it to the actual subject. Return ONLY the rewritten query, nothing else. Do not add quotes or prefixes.',
              },
              ...recentHistory.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
              { role: 'user', content: message },
            ],
          }),
        });
        if (resolutionRes.ok) {
          const resolutionData = await resolutionRes.json();
          const resolved = resolutionData.choices?.[0]?.message?.content?.trim();
          if (resolved) resolvedTopic = resolved;
        }
      } catch (e) {
        console.error('Topic resolution failed, using raw message:', e);
      }
    }

    console.log(`Resolved research topic: "${resolvedTopic}" (original: "${message}")`);

    // Step 2: Fetch Heart + Brain for context-enriched research prompt
    const heartRules = await fetchHeartRules(supabaseAdmin);
    const depthLimit = 30;
    const brainContext = await searchBrain(supabaseAdmin, resolvedTopic, openaiKey, depthLimit);

    const contextPrefix = heartRules.length > 0
      ? `IMPORTANT BRAND RULES TO FOLLOW:\n${heartRules.map(r => `- ${r.name}: ${r.content}`).join('\n')}\n\n`
      : '';
    const brainPrefix = brainContext.length > 0
      ? `BRAND CONTEXT:\n${brainContext.map(c => c.content).join('\n')}\n\n`
      : '';

    const enrichedMessage = `${contextPrefix}${brainPrefix}RESEARCH REQUEST:\n${resolvedTopic}`;

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: selectedModel,
          input: enrichedMessage,
          tools: [{ type: 'web_search_preview' }],
          background: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Failed to start research');
      }

      const data = await response.json();

      // Save user message with the resolved topic
      await supabase.from('osha_messages').insert({ user_id: userId, role: 'user', content: resolvedTopic, mode: 'deep-research' });

      if (data.status === 'completed') {
        const content = data.output_text || data.output?.[0]?.content?.[0]?.text || '';
        await supabase.from('osha_messages').insert({ user_id: userId, role: 'assistant', content, mode: 'deep-research' });
        if ((await supabase.from('osha_settings').select('internal_audit_logging').eq('user_id', userId).maybeSingle()).data?.internal_audit_logging !== false) {
          await supabaseAdmin.from('osha_audit_logs').insert({
            user_id: userId, heart_rules_used: heartRules, brain_chunks_used: brainContext.length,
            compliance_status: 'pass', compliance_notes: 'Deep research completed', llm_provider: 'openai', llm_model: selectedModel,
          });
        }
        return new Response(JSON.stringify({ status: 'completed', content, resolvedTopic }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ responseId: data.id, status: data.status, resolvedTopic }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ── POLL RESEARCH ───────────────────────────────────────────────────────────
  if (action === 'poll-research') {
    const { responseId } = body;
    if (!responseId) {
      return new Response(JSON.stringify({ error: 'responseId required' }), { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: llmSettings } = await supabaseAdmin.from('llm_settings').select('*').limit(1).maybeSingle();
    const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';

    try {
      const response = await fetch(`https://api.openai.com/v1/responses/${responseId}`, {
        method: 'GET', headers: { Authorization: `Bearer ${openaiKey}` },
      });
      if (!response.ok) throw new Error('Failed to poll research');

      const data = await response.json();

      if (data.status === 'completed') {
        const content = data.output_text || data.output?.[0]?.content?.[0]?.text || '';
        await supabase.from('osha_messages').insert({ user_id: userId, role: 'assistant', content, mode: 'deep-research' });
        return new Response(JSON.stringify({ status: 'completed', content }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
      }

      if (data.status === 'failed' || data.status === 'cancelled') {
        return new Response(JSON.stringify({ status: data.status, error: data.error?.message || 'Research failed' }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ status: data.status }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ── WEB SEARCH ──────────────────────────────────────────────────────────────
  if (action === 'web-search') {
    const { message } = body;
    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: llmSettings } = await supabaseAdmin.from('llm_settings').select('*').limit(1).maybeSingle();
    const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key required for web search' }), { status: 503, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }

    const heartRules = await fetchHeartRules(supabaseAdmin);
    const brainContext = await searchBrain(supabaseAdmin, message, openaiKey, 15);

    const systemPrompt = `You are Osha, the AI assistant of Fortun Wishnet. You have web search capabilities. Always provide sources and citations for your findings. Format responses with markdown.\n\n${heartRules.length > 0 ? `MANDATORY HEART RULES:\n${heartRules.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}\n\n` : ''}${brainContext.length > 0 ? `BRAND CONTEXT:\n${brainContext.map(c => c.content).join('\n')}\n\n` : ''}`;

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          instructions: systemPrompt,
          input: message,
          tools: [{ type: 'web_search_preview' }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Web search failed');
      }

      const data = await response.json();
      const content = data.output_text || data.output?.[0]?.content?.[0]?.text || 'No results found.';

      // Persist messages
      await supabase.from('osha_messages').insert({ user_id: userId, role: 'user', content: message, mode: 'web-search' });
      const { data: assistantMsg } = await supabase.from('osha_messages').insert({ user_id: userId, role: 'assistant', content, mode: 'web-search' }).select().single();

      // Audit
      await supabaseAdmin.from('osha_audit_logs').insert({
        user_id: userId, message_id: assistantMsg?.id || null, heart_rules_used: heartRules,
        brain_chunks_used: brainContext.length, compliance_status: 'pass',
        compliance_notes: 'Web search via gpt-4o with web_search_preview', llm_provider: 'openai', llm_model: 'gpt-4o',
      });

      return new Response(JSON.stringify({ content }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ── SAVE TO BRAIN (AI-cleaned PDF) ──────────────────────────────────────────
  if (action === 'save-to-brain') {
    const { title, content: docContent, category, destination, description: docDescription } = body as any;
    if (!docContent || !title) {
      return new Response(JSON.stringify({ error: 'title and content required' }), { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }

    // Safety: reject anything mentioning Heart rules
    const lowerTitle = title.toLowerCase();
    const lowerContent = docContent.toLowerCase();
    if (lowerTitle.includes('heart rule') || lowerContent.includes('heart rule')) {
      return new Response(JSON.stringify({ error: 'Osha cannot modify Heart rules. Heart rules are read-only.' }), { status: 403, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      // Get OpenAI key for AI cleaning
      const { data: llmSettings } = await supabaseAdmin.from('llm_settings').select('*').limit(1).maybeSingle();
      const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';

      // Step 1: AI-clean the content + generate filename
      let cleanedContent = docContent;
      let suggestedFilename = '';
      if (openaiKey) {
        try {
          const cleanRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              max_tokens: 4096,
              temperature: 0.1,
              messages: [
                {
                  role: 'system',
                  content: `Clean this text for storage in a knowledge base. Remove any metadata tags, source attributions (like "Source: General Knowledge", "Source: LLM", "Source: Brain", "Source: Fortun Knowledge Base"), internal status markers, timestamps that are not part of the content, and formatting artifacts that are not part of the actual content. Remove any "Osha" self-references or chat context markers. Keep all substantive information intact. Preserve markdown formatting (headings, lists, tables, bold, italic).

Also suggest a short, descriptive filename (no extension, lowercase, use hyphens, max 50 chars) that describes this content.

Return your response as JSON with this exact format:
{"cleanedContent": "the cleaned text here", "suggestedFilename": "descriptive-filename-here"}

IMPORTANT: The cleanedContent must contain the full cleaned text. The suggestedFilename should be concise and descriptive.`,
                },
                { role: 'user', content: docContent },
              ],
            }),
          });
          if (cleanRes.ok) {
            const cleanData = await cleanRes.json();
            const raw = cleanData.choices?.[0]?.message?.content?.trim();
            if (raw) {
              try {
                // Robust JSON extraction with multiple fallbacks
                let cleaned = raw
                  .replace(/```json\s*/gi, '')
                  .replace(/```\s*/g, '')
                  .trim();

                const jsonStart = cleaned.search(/[\{\[]/);
                const jsonEnd = cleaned.lastIndexOf('}');

                if (jsonStart !== -1 && jsonEnd !== -1) {
                  let jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
                  // Fix common JSON issues
                  jsonStr = jsonStr
                    .replace(/,\s*}/g, '}')
                    .replace(/,\s*]/g, ']')
                    .replace(/[\x00-\x1F\x7F]/g, ' ');

                  try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.cleanedContent) cleanedContent = parsed.cleanedContent;
                    if (parsed.suggestedFilename) suggestedFilename = parsed.suggestedFilename;
                  } catch {
                    // JSON still invalid -- extract filename via regex fallback
                    const fnMatch = raw.match(/"suggestedFilename"\s*:\s*"([^"]{1,60})"/i);
                    if (fnMatch) suggestedFilename = fnMatch[1];

                    // Extract cleanedContent via regex too
                    const ccMatch = raw.match(/"cleanedContent"\s*:\s*"([\s\S]+?)"\s*[,}]\s*"suggestedFilename"/i);
                    if (ccMatch) {
                      cleanedContent = ccMatch[1]
                        .replace(/\\n/g, '\n')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');
                    } else {
                      cleanedContent = raw;
                    }
                  }
                } else {
                  cleanedContent = raw;
                }
              } catch {
                // Complete failure -- use original content, no filename
                cleanedContent = raw;
              }
            }
          }
        } catch { /* non-fatal, use original content */ }
      }

      // Sanitize suggested filename
      if (suggestedFilename) {
        suggestedFilename = suggestedFilename
          .toLowerCase()
          .replace(/[^a-z0-9\-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 50);
      }

      // Step 2: Resolve destination section
      let sectionId: string;
      let restrictedAgents: string[] | null = null;
      const dest = destination || 'general';

      if (dest === 'general') {
        const { data: sections } = await supabaseAdmin.from('brain_sections').select('id').eq('type', 'general').limit(1);
        if (!sections || sections.length === 0) {
          return new Response(JSON.stringify({ error: 'No General Knowledge section found' }), { status: 404, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
        }
        sectionId = sections[0].id;
      } else {
        const { data: sections } = await supabaseAdmin.from('brain_sections').select('id').eq('agent_id', dest).limit(1);
        if (!sections || sections.length === 0) {
          return new Response(JSON.stringify({ error: `No section found for agent "${dest}"` }), { status: 404, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
        }
        sectionId = sections[0].id;
        restrictedAgents = [dest];
      }

      // Step 3: Generate PDF
      const pdfBytes = generateSimplePdf(cleanedContent, title);

      // Step 4: Upload PDF to storage with AI-generated or fallback filename
      const fileName = suggestedFilename ? `${suggestedFilename}.pdf` : `osha-saved-${Date.now()}.pdf`;
      const storagePath = `${dest === 'general' ? 'general' : dest}/${fileName}`;

      const { error: uploadErr } = await supabaseAdmin.storage.from('brain-documents').upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: false });
      if (uploadErr) throw new Error('Failed to upload document: ' + uploadErr.message);

      // Step 5: Insert brain_documents row
      const { data: doc, error: insertErr } = await supabaseAdmin.from('brain_documents').insert({
        section_id: sectionId,
        name: suggestedFilename || title,
        original_name: fileName,
        storage_path: storagePath,
        mime_type: 'application/pdf',
        size: pdfBytes.byteLength,
        category: category || 'brand',
        uploaded_by: userId,
        description: docDescription || 'Saved by Osha AI Assistant',
        restricted_agents: restrictedAgents,
      }).select().single();

      if (insertErr) throw new Error('Failed to create document: ' + insertErr.message);

      // Step 6: Trigger embeddings
      try {
        if (openaiKey && doc) {
          await fetch(`${supabaseUrl}/functions/v1/process-embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ sourceId: doc.id, sourceType: 'brain_document' }),
          });
        }
      } catch { /* non-fatal */ }

      // Audit
      await supabaseAdmin.from('osha_audit_logs').insert({
        user_id: userId, heart_rules_used: [], brain_chunks_used: 0,
        compliance_status: 'pass', compliance_notes: `Saved cleaned PDF "${title}" to Brain (${dest})`,
        llm_provider: 'openai', llm_model: 'gpt-4o-mini',
      });

      return new Response(JSON.stringify({ success: true, documentId: doc?.id, fileName: suggestedFilename || title }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ── CHAT ────────────────────────────────────────────────────────────────────
  if (action !== 'chat') {
    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { message, conversationHistory = [], attachments = [] } = body;
  if (!message) {
    return new Response(JSON.stringify({ error: 'message required' }), {
      status: 400,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Load user settings (with defaults if none exist)
  const { data: userSettings } = await supabase
    .from('osha_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const settings: OshaSettings = {
    default_mode: 'guide',
    default_language: 'en',
    auto_detect_language: true,
    default_verbosity: 'standard',
    response_structure: 'plain',
    hallucination_control: true,
    heart_strictness: 'enforce_and_propose',
    refusal_style: 'neutral',
    safety_guard_mode: true,
    retrieval_depth: 'medium',
    context_window_messages: 20,
    internal_audit_logging: true,
    bubble_enabled: true,
    bubble_scope: 'app_wide',
    bubble_greeting: "Hi! I'm Osha, your Fortun Wishnet assistant. How can I help?",
    bubble_quick_starters: [],
    bubble_remember_state: true,
    max_file_size_mb: 10,
    max_pages_processed: 50,
    chunking_strategy: 'recursive',
    preferred_file_output: 'summary',
    citation_behavior: false,
    image_generation_enabled: false,
    image_default_size: '1024x1024',
    image_aspect_ratio: '1:1',
    image_brand_preset: 'default',
    file_analysis_model: 'gemini-2.0-flash',
    image_provider: 'openai',
    image_model: 'gpt-image-1',
    ...(userSettings || {}),
  };

  const mode = body.mode || settings.default_mode;
  const depthLimit = getDepthLimit(settings.retrieval_depth);
  const retrievalStart = Date.now();

  // Load LLM settings (admin-scoped)
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
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Step 1: Retrieve Heart Rules (mandatory) ────────────────────────────────
  const heartRules = await fetchHeartRules(supabaseAdmin);

  // ── Step 2: Retrieve Brain Context (multi-query parallel search) ─────────────
  let brainContext: { content: string }[] = [];
  if (openaiKey) {
    // Query 1: raw user message; Query 2: last assistant message (for follow-up context)
    const lastAssistant = [...conversationHistory].reverse().find(m => m.role === 'assistant');
    const queries: Promise<{ content: string }[]>[] = [
      searchBrain(supabaseAdmin, message, openaiKey, depthLimit),
    ];
    if (lastAssistant && lastAssistant.content && lastAssistant.content !== message) {
      queries.push(searchBrain(supabaseAdmin, lastAssistant.content.slice(0, 500), openaiKey, depthLimit));
    }
    const results = await Promise.all(queries);
    // Deduplicate by content string
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

  // ── Step 2.5: Fetch agent statuses + per-agent configs for platform knowledge
  let agentStatuses: { agent_id: string; is_active: boolean; model: string; provider: string }[] = [];
  let agentConfigs: { promptor?: Record<string, unknown> | null; pixel?: Record<string, unknown> | null; osha?: Record<string, unknown> | null } = {};
  try {
    const [agentRes, promptorRes, pixelRes, oshaConfigRes] = await Promise.all([
      supabaseAdmin.from('agent_settings').select('agent_id, is_active, model, provider'),
      supabaseAdmin.from('promptor_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('pixel_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('osha_settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    agentStatuses = agentRes.data || [];
    agentConfigs = {
      promptor: promptorRes.data as Record<string, unknown> | null,
      pixel: pixelRes.data as Record<string, unknown> | null,
      osha: oshaConfigRes.data as Record<string, unknown> | null,
    };
  } catch (e) {
    console.error('Agent settings fetch error:', e);
  }

  // ── Step 3: Build system prompt ─────────────────────────────────────────────
  // AGENT-007: fetch mode instructions from DB (falls back to hardcoded defaults)
  const dbModePrompts = await getAgentPrompts(supabaseAdmin, 'osha', {});
  const systemPrompt = buildSystemPrompt(heartRules, brainContext, mode, settings, agentStatuses, agentConfigs, dbModePrompts);

  // ── Step 4: Build messages array — AGENT-006: cap at last 50 messages ───────
  // At gpt-4o pricing (~$2.50/1M input), 10,000 uncapped messages would cost
  // ~$1.25 per turn. 50 messages preserves good conversational context while
  // keeping cost under ~$0.06/turn.
  const MAX_HISTORY = 50;
  const contextHistory = conversationHistory.length > MAX_HISTORY
    ? conversationHistory.slice(-MAX_HISTORY)
    : conversationHistory;

  // Build user content — include attachments context if any
  let userContent: string | object[] = message;
  const pdfAttachments = attachments.filter(a => a.type === 'application/pdf');
  const textAttachments = attachments.filter(a => !a.isImage && a.type !== 'application/pdf');
  const imageAttachments = attachments.filter(a => a.isImage && a.type !== 'application/pdf');

  // Extract text from PDFs using Gemini native PDF support
  let pdfExtractedText = '';
  for (const pdf of pdfAttachments) {
    if (pdf.content) {
      try {
        const useOpenAI = (settings.file_analysis_provider || 'gemini') === 'openai';
        const extractKey = useOpenAI ? openaiKey : geminiKey;
        const providerLabel = useOpenAI ? 'OpenAI' : 'Gemini';
        if (!extractKey) {
          pdfExtractedText += `## DOCUMENT: ${pdf.name}\n[PDF processing requires ${providerLabel} API key — not configured.]\n\n---\n\n`;
          continue;
        }
        console.log(`Extracting PDF: ${pdf.name} (${Math.round(pdf.content.length * 0.75 / 1024)}KB) via ${providerLabel}`);
        const extracted = useOpenAI
          ? await extractPdfWithOpenAI(pdf.name, pdf.content, extractKey, settings.file_analysis_model || 'gpt-4o', settings.max_pages_processed || 50)
          : await extractPdfWithGemini(pdf.name, pdf.content, extractKey, settings.file_analysis_model || 'gemini-2.0-flash', settings.max_pages_processed || 50);
        if (extracted) {
          pdfExtractedText += `## USER-PROVIDED DOCUMENT: ${pdf.name} (application/pdf)\n${extracted.slice(0, 30000)}\n\n---\n\n`;
        } else {
          pdfExtractedText += `## DOCUMENT: ${pdf.name}\n[No text could be extracted from this PDF.]\n\n---\n\n`;
        }
      } catch (e: any) {
        console.error(`PDF extraction error for ${pdf.name}:`, e.message);
        pdfExtractedText += `## DOCUMENT: ${pdf.name}\n[Could not extract text from this document: ${e.message}]\n\n---\n\n`;
      }
    }
  }

  if (textAttachments.length > 0 || pdfExtractedText) {
    const attachmentText = textAttachments
      .map(a => `## USER-PROVIDED DOCUMENT: ${a.name} (${a.type})\n${a.content.slice(0, 30000)}`)
      .join('\n\n---\n\n');
    const combinedDocs = [pdfExtractedText, attachmentText].filter(Boolean).join('\n\n');
    userContent = `${combinedDocs}## USER QUESTION\n${message}`;
  }

  // If image attachments, build vision content array
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

  // ── Step 4b: Detect and fetch URLs in message ────────────────────────────────
  const detectedUrls = detectUrlsInMessage(message);
  let analyzedUrls = false;
  if (detectedUrls.length > 0 && typeof userContent === 'string') {
    console.log(`Detected ${detectedUrls.length} URL(s) in message, fetching content...`);
    const urlResults = await Promise.all(detectedUrls.map(u => fetchUrlContent(u)));
    const successfulFetches = urlResults.filter(Boolean) as { url: string; content: string }[];
    if (successfulFetches.length > 0) {
      analyzedUrls = true;
      const urlContext = successfulFetches
        .map(r => `## WEBPAGE: ${r.url}\n${r.content}`)
        .join('\n\n---\n\n');
      userContent = `${urlContext}\n\n---\n\n## USER QUESTION\n${userContent}`;
    }
  }

  // ── Step 5: Check image generation intent ───────────────────────────────────
  const wantsImage = detectImageIntent(message);

  if (wantsImage) {
    if (!settings.image_generation_enabled) {
      // Refuse image generation — Heart/settings say no
      const refusalMsg = "Image generation is currently disabled in your Osha settings. I can help you describe what you'd like visually in text format, or you can enable image generation in Osha Settings → Image Generation if you have the appropriate permissions.";

      // Save messages
      const { data: userMsg } = await supabase.from('osha_messages').insert({
        user_id: userId, role: 'user', content: message, mode,
      }).select().single();
      const { data: assistantMsg } = await supabase.from('osha_messages').insert({
        user_id: userId, role: 'assistant', content: refusalMsg, mode, is_image: false,
      }).select().single();

      if (settings.internal_audit_logging) {
        await supabaseAdmin.from('osha_audit_logs').insert({
          user_id: userId,
          message_id: assistantMsg?.id || null,
          heart_rules_used: heartRules,
          brain_chunks_used: brainContext.length,
          compliance_status: 'refused',
          compliance_notes: 'Image generation disabled by settings',
          retrieval_ms: retrievalMs,
          llm_provider: 'none',
          llm_model: 'none',
        });
      }

      return new Response(JSON.stringify({
        content: refusalMsg,
        audit: { heartCount: heartRules.length, brainCount: brainContext.length, complianceStatus: 'refused' },
      }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve image provider + model from per-Osha settings (with global fallbacks)
    const imageProvider = settings.image_provider || 'openai';
    const imageModel = settings.image_model || (imageProvider === 'gemini' ? 'gemini-2.5-flash-image' : 'gpt-image-1');
    const imagePrompt = await buildImagePrompt(
      message,
      brainContext,
      heartRules,
      settings.image_brand_preset,
      openaiKey,
      supabaseAdmin,
      depthLimit,
    );

    try {
      let imageBlob: Blob;

      if (imageProvider === 'gemini') {
        // ── Gemini image generation ──────────────────────────────────────────
        if (!geminiKey) throw new Error('Gemini API key not configured. Please add it in LLM Settings.');
        const geminiImgUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${geminiKey}`;
        const geminiImgRes = await fetch(geminiImgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
            generationConfig: { responseModalities: ['image', 'text'] },
          }),
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
        // ── OpenAI image generation ──────────────────────────────────────────
        if (!openaiKey) throw new Error('OpenAI API key not configured. Please add it in LLM Settings.');
        const imageRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: imageModel,
            prompt: imagePrompt,
            n: 1,
            size: settings.image_default_size,
            // response_format intentionally omitted — gpt-image-1 and newer models
            // do not accept this parameter; dall-e-3 defaults to 'url' when omitted.
          }),
        });
        if (!imageRes.ok) throw new Error(await imageRes.text());
        const imageData = await imageRes.json();
        const imageResult = imageData.data?.[0];
        if (!imageResult) throw new Error('No image returned');
        if (imageResult.url) {
          imageBlob = await fetch(imageResult.url).then(r => r.blob());
        } else if (imageResult.b64_json) {
          const binary = atob(imageResult.b64_json);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          imageBlob = new Blob([bytes], { type: 'image/png' });
        } else {
          throw new Error('No image URL or base64 data returned');
        }
      }

      // Persist image to Supabase Storage (mirror of Nexus pattern)
      let permanentImageUrl = '';
      try {
        const supabaseServiceClient = createClient(supabaseUrl, serviceKey);
        const imagePath = `${userId}/osha-images/${Date.now()}_osha.png`;
        const { error: uploadErr } = await supabaseServiceClient.storage
          .from('files')
          .upload(imagePath, imageBlob, { contentType: 'image/png', upsert: false });

        if (!uploadErr) {
          // SEC-019: files bucket is private — use signed URL (7-day expiry)
          const { data: signedData } = await supabaseServiceClient.storage.from('files').createSignedUrl(imagePath, 60 * 60 * 24 * 7);
          permanentImageUrl = signedData?.signedUrl || '';

          // Save to files table for Files Manager
          const { data: sectors } = await supabase.from('sectors').select('id, name').eq('user_id', userId);
          let oshasSectorId = sectors?.find((s: any) => s.name === 'Osha AI')?.id;
          if (!oshasSectorId) {
            const { data: newSector } = await supabase.from('sectors').insert({ user_id: userId, name: 'Osha AI', color: '#0EA5E9' }).select().single();
            oshasSectorId = newSector?.id;
          }

          await supabase.from('files').insert({
            user_id: userId,
            name: `osha-${Date.now()}.png`,
            original_name: `osha-${Date.now()}.png`,
            storage_path: imagePath,
            mime_type: 'image/png',
            size: imageBlob.size,
            sector_id: oshasSectorId || null,
          });
        }
      } catch (e) {
        console.error('Image persistence error:', e);
      }

      const imageCaption = `Here's the image I generated based on your request.`;

      await supabase.from('osha_messages').insert({ user_id: userId, role: 'user', content: message, mode }).select().single();
      const { data: assistantMsg } = await supabase.from('osha_messages').insert({
        user_id: userId, role: 'assistant', content: imageCaption, mode, is_image: true, image_url: permanentImageUrl,
      }).select().single();

      if (settings.internal_audit_logging) {
        await supabaseAdmin.from('osha_audit_logs').insert({
          user_id: userId,
          message_id: assistantMsg?.id || null,
          heart_rules_used: heartRules,
          brain_chunks_used: brainContext.length,
          compliance_status: 'pass',
          compliance_notes: `Image generated via ${imageProvider}/${imageModel}`,
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
      }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });

    } catch (e: any) {
      const errMsg = `I encountered an error generating the image: ${e.message}. Please try again or describe what you'd like in text instead.`;
      return new Response(JSON.stringify({ content: errMsg, audit: { heartCount: heartRules.length, brainCount: brainContext.length, complianceStatus: 'pass' } }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // ── Step 6: Detect if web search would help ─────────────────────────────────
  const useGemini = !openaiKey && !!geminiKey;
  let responseContent = '';
  let complianceStatus = 'pass';
  let llmProvider = useGemini ? 'gemini' : 'openai';
  let llmModel = useGemini ? (llmSettings?.gemini_text_model || 'gemini-1.5-pro') : (llmSettings?.openai_text_model || 'gpt-4o');

  // Path A: Explicit web search requests
  const WEB_SEARCH_PHRASES = ['search the web', 'search online', 'look it up online', 'look online', 'yes search', 'yes, search', 'go ahead and search', 'please search', 'search for it', 'web search', 'google it', 'find it online'];

  // Path B: Simple confirmations — only trigger if previous assistant message offered web search
  const WEB_SEARCH_CONFIRMATIONS = ['yes', 'sure', 'go ahead', 'please do', 'do it', 'ok', 'okay', 'yeah', 'yep', 'yea', 'absolutely', 'definitely', 'please', 'yes please', 'sure thing', 'go for it'];
  const WEB_SEARCH_OFFER_SIGNALS = ['search the web', 'would you like me to search', 'want me to search', 'shall i search', 'search online'];

  const lowerMessage = message.toLowerCase().trim();
  const lastAssistantContent = ([...conversationHistory].reverse().find(m => m.role === 'assistant')?.content || '').toLowerCase();
  const previousOfferedWebSearch = WEB_SEARCH_OFFER_SIGNALS.some(signal => lastAssistantContent.includes(signal));

  const explicitRequest = WEB_SEARCH_PHRASES.some(phrase => lowerMessage.includes(phrase));
  const confirmedSearch = previousOfferedWebSearch && WEB_SEARCH_CONFIRMATIONS.some(c => lowerMessage === c || lowerMessage === c + '.' || lowerMessage === c + '!');
  const needsWebSearch = openaiKey && (explicitRequest || confirmedSearch);

  let usedWebSearch = false;

  try {
    if (needsWebSearch && !useGemini) {
      // Use OpenAI Responses API with web_search_preview for live information
      usedWebSearch = true;
      // Build input with conversation history so the model has full context
      const responsesInput = [
        ...contextHistory.map(m => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: 'user',
          content: typeof userContent === 'string' ? userContent : message,
        },
      ];

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: llmModel,
          instructions: systemPrompt,
          input: responsesInput,
          tools: [{ type: 'web_search_preview' }],
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      // Find the actual message output (not web_search_call)
      const messageOutput = data.output?.find(
        (item: any) => item.type === 'message'
      );
      const textContent = messageOutput?.content?.find(
        (c: any) => c.type === 'output_text'
      );
      responseContent = data.output_text
        || textContent?.text
        || 'No response generated.';
    } else if (useGemini) {
      const geminiMessages = [
        ...contextHistory,
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
          generationConfig: { maxOutputTokens: 4096 },
        }),
      });

      if (!geminiRes.ok) throw new Error(await geminiRes.text());
      const geminiData = await geminiRes.json();
      responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    } else {
      const openaiMessages: object[] = [
        { role: 'system', content: systemPrompt },
        ...contextHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userContent },
      ];

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: llmModel,
          messages: openaiMessages,
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      if (!openaiRes.ok) throw new Error(await openaiRes.text());
      const openaiData = await openaiRes.json();
      responseContent = openaiData.choices?.[0]?.message?.content || 'No response generated.';
    }

    // Basic Heart compliance check: flag if response might contain refusal signal from LLM itself
    const refusalSignals = ['i cannot', 'i am unable to', 'i must refuse', 'that violates'];
    const lowerResponse = responseContent.toLowerCase();
    if (refusalSignals.some(s => lowerResponse.startsWith(s))) {
      complianceStatus = 'adjusted';
    }

  } catch (e: any) {
    console.error('Chat completion error:', e);
    responseContent = `I encountered an error processing your request. Please try again. (${e.message})`;
    complianceStatus = 'adjusted';
  }

  // ── Step 7: Persist messages ─────────────────────────────────────────────────
  await supabase.from('osha_messages').insert({
    user_id: userId, role: 'user', content: message, mode,
    attachments: attachments.map(a => ({ name: a.name, type: a.type, size: 0 })),
  });

  const { data: assistantMsg } = await supabase.from('osha_messages').insert({
    user_id: userId, role: 'assistant', content: responseContent, mode, is_image: false,
  }).select().single();

  // ── Step 8: Audit log ────────────────────────────────────────────────────────
  if (settings.internal_audit_logging) {
    await supabaseAdmin.from('osha_audit_logs').insert({
      user_id: userId,
      message_id: assistantMsg?.id || null,
      heart_rules_used: heartRules,
      brain_chunks_used: brainContext.length,
      compliance_status: complianceStatus,
      retrieval_ms: retrievalMs,
      llm_provider: llmProvider,
      llm_model: llmModel,
      compliance_notes: [usedWebSearch ? 'User-requested web search used' : '', analyzedUrls ? 'URL analysis used' : ''].filter(Boolean).join('; ') || null,
    });
  }

  const sourceUsed = usedWebSearch ? 'web' : brainContext.length > 0 ? 'brain' : 'llm';

  return new Response(JSON.stringify({
    content: responseContent,
    usedWebSearch,
    analyzedUrls,
    sourceUsed,
    audit: {
      heartCount: heartRules.length,
      brainCount: brainContext.length,
      complianceStatus,
    },
  }), { headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
});
