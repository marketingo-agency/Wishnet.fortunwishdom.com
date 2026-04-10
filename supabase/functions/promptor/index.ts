/**
 * Promptor Edge Function
 *
 * Mandatory pre-step: query Brain + Heart from the vector store before any generation.
 * Heart rules always win over Brain context.
 * All runs are persisted to promptor_runs.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeForPrompt } from '../_shared/sanitize.ts';

import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';

// SEC-004: 15 requests per minute per user
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 15 });

// SEC-003: CORS tightened from wildcard to allowed origins list
let corsHeaders: Record<string, string> = getCorsHeaders(null);

// ─── Blueprint Registry ───────────────────────────────────────────────────────

const BLUEPRINTS: Record<string, Record<string, object>> = {
  text: {
    general: {
      required_slots: ['topic', 'audience', 'goal'],
      optional_slots: ['tone', 'length', 'format'],
      constraints_guidance: 'Keep language clear and on-brand. Avoid jargon unless requested.',
      output_format: 'prose or structured sections',
    },
    ad_copy: {
      required_slots: ['product', 'benefit', 'audience', 'cta'],
      optional_slots: ['urgency', 'offer', 'platform'],
      constraints_guidance: 'Lead with the primary benefit. CTA must be clear. Avoid superlatives without proof.',
      output_format: 'headline + body + CTA',
    },
    landing_page: {
      required_slots: ['product', 'value_proposition', 'audience', 'cta'],
      optional_slots: ['pain_points', 'social_proof', 'features'],
      constraints_guidance: 'Above fold must carry full value prop. Use benefit-first language.',
      output_format: 'hero + sections + cta',
    },
    email: {
      required_slots: ['subject', 'goal', 'audience', 'cta'],
      optional_slots: ['preview_text', 'personalization', 'tone'],
      constraints_guidance: 'Subject line under 50 chars. Single focused CTA. No spam triggers.',
      output_format: 'subject + preheader + body + cta',
    },
    blog_outline: {
      required_slots: ['topic', 'audience', 'goal'],
      optional_slots: ['seo_keywords', 'sections', 'tone'],
      constraints_guidance: 'Lead with value. Use H2/H3 structure. Include intro hook and conclusion.',
      output_format: 'title + intro + sections + conclusion',
    },
    product_description: {
      required_slots: ['product_name', 'features', 'audience', 'key_benefit'],
      optional_slots: ['price_tier', 'use_cases', 'materials'],
      constraints_guidance: 'Lead with benefit not feature. Sensory details for physical products.',
      output_format: 'short description + features + cta',
    },
  },
  image: {
    general_scene: {
      required_slots: ['subject', 'setting', 'mood', 'style'],
      optional_slots: ['lighting', 'color_palette', 'camera_angle', 'time_of_day'],
      constraints_guidance: 'Be specific about composition. Avoid ambiguous spatial terms.',
      output_format: 'subject, setting, style, lighting, mood, camera details',
    },
    character_portrait: {
      required_slots: ['character_description', 'mood', 'style'],
      optional_slots: ['background', 'clothing', 'lighting', 'camera'],
      constraints_guidance: 'Include age range, ethnicity if relevant. No real person names.',
      output_format: 'character + mood + style + technical details',
    },
    product_hero: {
      required_slots: ['product', 'background', 'mood', 'style'],
      optional_slots: ['props', 'lighting_style', 'brand_colors'],
      constraints_guidance: 'Product must be clearly identifiable. Clean composition. Studio or lifestyle.',
      output_format: 'product + background + lighting + style',
    },
    social_square: {
      required_slots: ['subject', 'mood', 'style', 'color_palette'],
      optional_slots: ['text_overlay_area', 'brand_elements'],
      constraints_guidance: '1:1 ratio. Leave space for text if needed. Bold, scroll-stopping composition.',
      output_format: 'composition + style + colors + technical specs',
    },
  },
  social_image: {
    announcement: {
      required_slots: ['announcement_topic', 'brand', 'mood'],
      optional_slots: ['visual_metaphor', 'color_scheme', 'text_area'],
      constraints_guidance: 'Announcement should be visually implied, not only text-dependent.',
      output_format: 'scene + brand alignment + mood + composition',
    },
    quote_card: {
      required_slots: ['quote_theme', 'brand_aesthetic', 'color_palette'],
      optional_slots: ['background_style', 'typography_feel'],
      constraints_guidance: 'Background should not overpower the text area. Legibility first.',
      output_format: 'background + typography area + brand colors',
    },
    carousel_slide: {
      required_slots: ['slide_topic', 'brand', 'slide_position'],
      optional_slots: ['transition_style', 'color_scheme'],
      constraints_guidance: 'Consistent visual identity across slides. Each slide must work standalone.',
      output_format: 'scene per slide + consistency notes',
    },
  },
  social_copy: {
    hook_variants: {
      required_slots: ['topic', 'platform', 'audience', 'goal'],
      optional_slots: ['tone', 'emotion', 'cta'],
      constraints_guidance: 'First line must stop the scroll. Use pattern interrupts. Platform-native length.',
      output_format: '3-5 hook variants + reasoning',
    },
    caption_variants: {
      required_slots: ['topic', 'platform', 'audience'],
      optional_slots: ['cta', 'hashtags', 'emojis', 'tone'],
      constraints_guidance: 'Match platform voice. Instagram allows longer. X/Twitter needs punchy.',
      output_format: 'caption variants by length + hashtag suggestions',
    },
    cta_variants: {
      required_slots: ['goal', 'audience', 'platform'],
      optional_slots: ['urgency', 'incentive', 'tone'],
      constraints_guidance: 'CTA must match platform norms. No deceptive urgency.',
      output_format: 'cta variants + placement suggestions',
    },
  },
  video: {
    short_reel: {
      required_slots: ['concept', 'audience', 'platform', 'duration'],
      optional_slots: ['music_vibe', 'visual_style', 'hook', 'cta'],
      constraints_guidance: 'Hook in first 2 seconds. Vertical 9:16. Fast paced. Text overlays if needed.',
      output_format: 'hook + scenes + pacing + audio + cta',
    },
    cinematic_trailer: {
      required_slots: ['subject', 'narrative_arc', 'mood', 'duration'],
      optional_slots: ['music', 'voiceover', 'color_grade'],
      constraints_guidance: 'Build tension, release, aspiration. Avoid spoiling full story.',
      output_format: 'act structure + shot list + music + color',
    },
    explainer_storyboard: {
      required_slots: ['product_or_concept', 'audience', 'key_message', 'duration'],
      optional_slots: ['animation_style', 'voiceover_tone', 'cta'],
      constraints_guidance: 'Problem → solution → benefit flow. Keep each scene under 5 seconds.',
      output_format: 'numbered scenes + duration + visuals + narration',
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDepthLimit(depth: string): number {
  if (depth === 'small') return 5;
  if (depth === 'large') return 20;
  return 10; // medium default
}

async function queryKnowledge(
  supabaseUrl: string,
  serviceKey: string,
  query: string,
  sourceTypes: string[],
  limit: number,
): Promise<{ results: object[]; count: number }> {
  const url = `${supabaseUrl}/functions/v1/search-knowledge`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      query,
      source_types: sourceTypes,
      limit,
      threshold: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('search-knowledge error:', text);
    return { results: [], count: 0 };
  }

  const data = await res.json();
  return { results: data.results || [], count: data.count || 0 };
}

function buildSystemPrompt(
  heartRules: object[],
  brainContext: object[],
  blueprint: object | null,
  settings: Record<string, unknown>,
  action: string,
): string {
  const tone = (settings.brand_tone as Record<string, number>) || {};
  const blockedVocab = (settings.blocked_vocabulary as string[]) || [];
  const allowedVocab = (settings.allowed_vocabulary as string[]) || [];
  const strictness = (settings.heart_strictness as string) || 'enforce_and_propose';
  const refusalStyle = (settings.refusal_style as string) || 'neutral';
  const lang = (settings.default_language as string) || 'en';
  const verbosity = (settings.default_verbosity as string) || 'standard';
  const safetyGuard = settings.safety_guard_mode !== false;
  const formattingStyle = (settings.formatting_style as string) || 'plain';

  const LANG_NAMES: Record<string, string> = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', pt: 'Portuguese', ja: 'Japanese' };
  const langName = LANG_NAMES[lang] || 'English';

  const heartSection = heartRules.length > 0
    ? `## MANDATORY HEART RULES (always override everything else)\n${heartRules
        .map((r: any) => `- [${r.source?.name || 'Rule'}] ${r.content}`)
        .join('\n')}`
    : `## HEART RULES\nNo specific Heart rules retrieved. Default to strict, safe, brand-respectful behavior.
Ask the user to configure Heart rules in MasterMind > Heart if specific compliance constraints are needed.`;

  const brainSection = brainContext.length > 0
    ? `## BRAND & KNOWLEDGE CONTEXT (from Fortun Brain)\n${brainContext
        .map((r: any) => `- ${r.content}`)
        .join('\n')}`
    : `## BRAND & KNOWLEDGE CONTEXT\nNo specific Brain knowledge retrieved. Use conservative brand defaults.`;

  const blueprintSection = blueprint
    ? `## BLUEPRINT GUIDE\n${JSON.stringify(blueprint, null, 2)}`
    : '';

  const toneSection = Object.keys(tone).length > 0
    ? `## BRAND TONE (0-100 scale)\n${Object.entries(tone).map(([k, v]) => `- ${k}: ${v}/100`).join('\n')}`
    : '';

  const vocabSection = [
    blockedVocab.length > 0 ? `Blocked vocabulary (never use): ${blockedVocab.join(', ')}` : '',
    allowedVocab.length > 0 ? `Preferred vocabulary (prioritize): ${allowedVocab.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const strictnessInstr = strictness === 'always_enforce'
    ? 'If any part of the request violates Heart rules, refuse that part entirely and do not propose alternatives.'
    : strictness === 'enforce_and_propose'
    ? 'If any part of the request violates Heart rules, refuse that part and always propose a compliant alternative that still helps the user reach their goal.'
    : 'If any part violates Heart rules, note the adjustment briefly and produce the safest compliant version.';

  const refusalInstr = refusalStyle === 'soft'
    ? 'When refusing, be warm and supportive.'
    : refusalStyle === 'firm'
    ? 'When refusing, be direct and unambiguous.'
    : 'When refusing, be clear but professional.';

  // Language instruction
  const langInstr = `You MUST respond in ${langName}.`;

  // Verbosity instruction
  const verbosityMap: Record<string, string> = {
    short: 'Be concise — favor brevity, only essential details.',
    standard: 'Use balanced detail — comprehensive but not verbose.',
    detailed: 'Be thorough and detailed — include every relevant nuance and explanation.',
  };
  const verbosityInstr = `Output verbosity: ${verbosityMap[verbosity] || verbosityMap.standard}`;

  // Safety guard
  const safetyInstr = safetyGuard
    ? 'When uncertain about any constraint, produce the safest compliant output and explicitly note your assumptions in compliance_notes.'
    : '';

  // Formatting style
  const fmtMap: Record<string, string> = {
    plain: 'Format the final_prompt_full as plain text.',
    structured: 'Format the final_prompt_full with clearly labeled sections and sub-headings.',
    json: 'Format the final_prompt_full as a structured JSON object with labeled keys.',
  };
  const fmtInstr = fmtMap[formattingStyle] || fmtMap.plain;

  return `You are Promptor, an expert AI prompt engineer integrated into Fortun Wishnet.

${langInstr}
${verbosityInstr}
${fmtInstr}
${safetyInstr}

Your operating law:
1. Heart rules are ABSOLUTE and always override everything else. Never invent Heart rules.
2. Brain context informs brand alignment. If Heart and Brain conflict, Heart wins.
3. ${strictnessInstr}
4. ${refusalInstr}
5. Never hallucinate Fortun canon, brand rules, or policies.

${heartSection}

${brainSection}

${blueprintSection}

${toneSection}

${vocabSection}

## RESPONSE CONTRACT
You MUST respond with a valid JSON object matching this exact structure:
{
  "brief_summary": "1-2 sentence summary of what was created/optimized",
  "final_prompt_short": "concise version of the prompt (1-3 sentences) or null if not applicable",
  "final_prompt_full": "complete, ready-to-use prompt",
  "variants": ["variant 1", "variant 2"],
  "negatives": "comma-separated negative prompts or null if not applicable",
  "qa_checklist": ["checklist item 1", "checklist item 2"],
  "compliance_status": "pass" | "adjusted" | "refused",
  "compliance_notes": "very brief note on any adjustments or refusals, or null if fully compliant",
  "derived_brief": {
    "output_type": "...",
    "goal": "...",
    "audience": "...",
    "key_constraints": []
  }
}

- compliance_status "pass": request fully complies with Heart rules, no changes needed
- compliance_status "adjusted": request was modified to comply; explain briefly in compliance_notes  
- compliance_status "refused": request violates Heart rules; final_prompt_full should contain a compliant alternative

Action mode: ${action}`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // Verify auth via getUser (server round-trip, validates token properly)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
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

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    // ── get-settings ──────────────────────────────────────────────────────────
    if (action === 'get-settings') {
      const { data: settings } = await supabaseAdmin
        .from('promptor_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      return new Response(JSON.stringify({ settings: settings || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── save-settings ─────────────────────────────────────────────────────────
    if (action === 'save-settings') {
      const { settings } = body;
      const { data: existing } = await supabaseAdmin
        .from('promptor_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        await supabaseAdmin
          .from('promptor_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      } else {
        await supabaseAdmin
          .from('promptor_settings')
          .insert({ ...settings, user_id: userId });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── create / optimize ─────────────────────────────────────────────────────
    if (action !== 'create' && action !== 'optimize') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      output_type = 'text',
      blueprint: blueprintKey = 'general',
      raw_request,
      existing_prompt,
    } = body;

    if (!raw_request) {
      return new Response(JSON.stringify({ error: 'raw_request is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load user settings (with defaults if none exist)
    const { data: userSettings } = await supabaseAdmin
      .from('promptor_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const settings: Record<string, unknown> = userSettings || {
      default_variants: 2,
      include_short_prompt: true,
      include_negatives: true,
      include_qa_checklist: false,
      include_compliance_notes: true,
      retrieval_depth: 'medium',
      heart_strictness: 'enforce_and_propose',
      refusal_style: 'neutral',
      safety_guard_mode: true,
      brand_tone: { wonder: 50, warmth: 50, playfulness: 50, mystery: 30, clarity: 70, directness: 60 },
      allowed_vocabulary: [],
      blocked_vocabulary: [],
    };

    const depthLimit = getDepthLimit(settings.retrieval_depth as string || 'medium');

    // Load LLM settings
    const { data: llmSettings } = await supabaseAdmin
      .from('llm_settings')
      .select('*')
      .single();

    const provider = llmSettings?.active_text_provider || 'openai';
    const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
    const geminiKey = llmSettings?.gemini_api_key || Deno.env.get('GEMINI_API_KEY') || '';
    const model = provider === 'gemini'
      ? (llmSettings?.gemini_text_model || 'gemini-2.0-flash')
      : (llmSettings?.openai_text_model || 'gpt-4o');

    // ── MANDATORY: Query Heart + Brain ────────────────────────────────────────
    console.log(`Promptor: querying Heart and Brain for user=${userId}, output_type=${output_type}`);
    const contextQuery = `${raw_request} ${output_type} ${blueprintKey}`;

    const [heartRulesData, brainResult] = await Promise.all([
      // Heart: fetch ALL active global rules directly — no similarity filter, rules always apply
      supabaseAdmin
        .from('heart_rules')
        .select('id, name, category, rule_content, priority, is_global, assigned_agents, is_active')
        .eq('is_active', true)
        .or('is_global.eq.true,assigned_agents.cs.{"promptor"}'),
      // Brain: semantic search with a lower threshold for better recall
      queryKnowledge(supabaseUrl, serviceKey, contextQuery, ['brain_document', 'wishpedia_entry'], depthLimit),
    ]);

    // AGENT-003: sanitize rule content before prompt interpolation
    const heartRules = (heartRulesData.data || []).map((r: any) => ({
      content: sanitizeForPrompt(r.rule_content),
      source: { name: sanitizeForPrompt(r.name), category: r.category, priority: r.priority },
    }));
    const heartResult = { results: heartRules, count: heartRules.length };

    console.log(`Heart: ${heartResult.count} rules (direct DB), Brain: ${brainResult.count} chunks`);

    // ── Blueprint ─────────────────────────────────────────────────────────────
    const blueprintData = BLUEPRINTS[output_type]?.[blueprintKey] || BLUEPRINTS[output_type]?.['general'] || null;

    // ── Build prompts ──────────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(
      heartResult.results,
      brainResult.results,
      blueprintData,
      settings,
      action,
    );

    const numVariants = (settings.default_variants as number) || 2;
    const includeShort = settings.include_short_prompt !== false;
    const includeNegatives = settings.include_negatives !== false;
    const includeQA = settings.include_qa_checklist === true;

    // ── Output-type-specific defaults from settings ─────────────────────────
    const styleDefaults: string[] = [];

    if (output_type === 'image' || output_type === 'social_image') {
      const ratio = (settings.image_aspect_ratio as string) || '1:1';
      const comp = (settings.image_composition_detail as string) || 'standard';
      const cam = (settings.image_camera_cue_style as string) || 'descriptive';
      styleDefaults.push(`Default aspect ratio: ${ratio}. Composition detail level: ${comp}. Camera cue style: ${cam}.`);
    }
    if (output_type === 'video') {
      const dur = (settings.video_duration_default as string) || '30s';
      const shots = (settings.video_shot_list_style as string) || 'standard';
      const pace = (settings.video_pacing_style as string) || 'moderate';
      styleDefaults.push(`Default duration: ${dur}. Shot list style: ${shots}. Pacing: ${pace}.`);
    }
    if (output_type === 'social_copy' || output_type === 'social_image') {
      const platform = (settings.social_platform_default as string) || 'instagram';
      const cta = (settings.social_cta_intensity as string) || 'moderate';
      const hashtags = (settings.social_hashtag_behavior as string) || 'suggest';
      styleDefaults.push(`Target platform: ${platform}. CTA intensity: ${cta}. Hashtag behavior: ${hashtags}.`);
    }

    const styleDefaultsBlock = styleDefaults.length > 0
      ? `\nSTYLE DEFAULTS:\n${styleDefaults.join('\n')}\n`
      : '';

    const userMessage = action === 'optimize'
      ? `Optimize this existing prompt for the output type "${output_type}" (blueprint: "${blueprintKey}"):

EXISTING PROMPT:
${existing_prompt}

USER CONTEXT / GOAL:
${raw_request}
${styleDefaultsBlock}
Generate ${numVariants} variant(s). ${includeShort ? 'Include a short version.' : ''} ${includeNegatives ? 'Include negatives/exclusions.' : ''} ${includeQA ? 'Include a QA checklist.' : ''}`
      : `Create a prompt for output type "${output_type}" (blueprint: "${blueprintKey}"):

USER BRIEF:
${raw_request}
${styleDefaultsBlock}
Generate ${numVariants} variant(s). ${includeShort ? 'Include a short version.' : ''} ${includeNegatives ? 'Include negatives/exclusions.' : ''} ${includeQA ? 'Include a QA checklist.' : ''}

Respond ONLY with the JSON object.`;

    // ── LLM Call ──────────────────────────────────────────────────────────────
    let llmResponse: Record<string, unknown>;

    if (provider === 'gemini' && geminiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      });
      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      llmResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } else {
      // OpenAI
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
      });
      const openaiData = await openaiRes.json();
      const rawContent = openaiData.choices?.[0]?.message?.content || '{}';
      try {
        llmResponse = JSON.parse(rawContent);
      } catch {
        llmResponse = {};
      }
    }

    // ── Persist run ───────────────────────────────────────────────────────────
    const runData = {
      user_id: userId,
      mode: action,
      output_type,
      blueprint: blueprintKey,
      raw_request,
      existing_prompt: existing_prompt || null,
      heart_rules_used: heartResult.results,
      brain_context_used: brainResult.results,
      derived_brief: (llmResponse.derived_brief as object) || {},
      brief_summary: (llmResponse.brief_summary as string) || null,
      final_prompt_short: (llmResponse.final_prompt_short as string) || null,
      final_prompt_full: (llmResponse.final_prompt_full as string) || null,
      variants: (llmResponse.variants as string[]) || [],
      negatives: (llmResponse.negatives as string) || null,
      qa_checklist: (llmResponse.qa_checklist as string[]) || [],
      compliance_status: (llmResponse.compliance_status as string) || 'pass',
      compliance_notes: (llmResponse.compliance_notes as string) || null,
      llm_provider: provider,
      llm_model: model,
    };

    const { data: insertedRun, error: insertError } = await supabaseAdmin
      .from('promptor_runs')
      .insert(runData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert run:', insertError);
    }

    return new Response(
      JSON.stringify({
        run_id: insertedRun?.id || null,
        brief_summary: llmResponse.brief_summary || '',
        final_prompt_short: llmResponse.final_prompt_short || null,
        final_prompt_full: llmResponse.final_prompt_full || '',
        variants: llmResponse.variants || [],
        negatives: llmResponse.negatives || null,
        qa_checklist: llmResponse.qa_checklist || [],
        compliance_status: llmResponse.compliance_status || 'pass',
        compliance_notes: llmResponse.compliance_notes || null,
        retrieval_meta: {
          heart_chunks: heartResult.count,
          brain_chunks: brainResult.count,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Promptor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
