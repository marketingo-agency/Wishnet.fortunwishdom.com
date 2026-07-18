/**
 * Publishing Desk caption generation (Content hub Phase 3).
 *
 * One LLM call covers EVERY selected network target of a post, each tailored
 * to its network AND post type (an Instagram Story reads nothing like a
 * Pinterest Pin). Grounded through the Knowledge Context Engine: mandatory
 * Heart rules + fenced Brain/Wishpedia retrieval - the full RAG, per Sam's
 * requirement.
 */

import { stripDashes } from '../_shared/sanitize.ts';
import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';
import { openAiTuning } from '../omni/llm.ts';
import { buildHeartBlock, buildKnowledgeBlock, type HeartRule } from '../omni/context.ts';

export interface CaptionTargetInput {
  network: string;
  network_label?: string | null;
  post_type: string;
}

/** Practical platform voice + hard caps (chars), keyed by network. */
const NETWORK_BRIEFS: Record<string, { cap: number; guidance: string }> = {
  facebook: { cap: 2000, guidance: 'Conversational, 1-3 short paragraphs, ends with a light call to action.' },
  instagram: { cap: 2200, guidance: 'Visual-first voice, line breaks welcome, 3-6 fitting hashtags at the end, emoji natural.' },
  x: { cap: 280, guidance: 'HARD 280-character limit. Punchy single thought, at most 1-2 hashtags.' },
  tiktok: { cap: 2200, guidance: 'Hook-first, casual, trend-aware, 3-5 hashtags, emoji natural.' },
  youtube: { cap: 5000, guidance: 'Descriptive and searchable: what it shows and why it matters, keywords early.' },
  pinterest: { cap: 500, guidance: 'Inspirational and descriptive, searchable keywords, no hashtag spam.' },
};

/** Post-type nuances layered on top of the network voice. */
const TYPE_HINTS: Record<string, string> = {
  story: 'This is a STORY: ultra-short overlay text energy, immediate, ephemeral; skip long hashtag blocks.',
  reel: 'This is a REEL/short video: hook in the first line, momentum, watch-to-the-end energy.',
  carousel: 'This is a CAROUSEL: tease the swipe ("keep swiping"), number or sequence the value.',
  short: 'This is a SHORT: hook-first, one idea, keep it tight.',
  video: 'This is a VIDEO post: set up what the viewer will see and why it is worth watching.',
  community: 'This is a COMMUNITY post: conversational, question-forward, invite replies.',
  pin: 'This is a PIN: evergreen, searchable description with natural keywords.',
  idea_pin: 'This is an IDEA PIN: step/sequence energy, save-worthy value.',
  feed: 'This is a standard FEED post.',
  post: 'This is a standard post.',
};

function targetLine(t: CaptionTargetInput, i: number): string {
  const name = t.network === 'other' ? (t.network_label || 'a custom network') : t.network;
  const brief = NETWORK_BRIEFS[t.network];
  const hint = TYPE_HINTS[t.post_type.toLowerCase().replace(/\s+/g, '_')] ?? (t.post_type ? `Post type: ${t.post_type}.` : '');
  return `- "t${i}" (${name}${t.post_type ? ` / ${t.post_type}` : ''}): ${brief ? `${brief.guidance} Max ${brief.cap} characters.` : 'Platform-appropriate social caption.'} ${hint}`.trim();
}

export function buildDeskCaptionsPrompt(params: {
  heartRules: HeartRule[];
  knowledge: string[];
  title: string;
  notes: string;
  mediaSummary: string;
  targets: CaptionTargetInput[];
}): string {
  return `You are Omni, the Multimodal Creation AI of Fortun Wishnet, writing social captions for ONE piece of content across several destinations.

${buildHeartBlock(params.heartRules)}

${buildKnowledgeBlock(params.knowledge, {
    emptyText: '## FORTUN UNIVERSE KNOWLEDGE\nNo specific knowledge matched this content.',
  })}

## THE CONTENT
Title: ${params.title || 'Untitled'}
${params.notes ? `Notes / brief: ${params.notes}` : ''}
Media: ${params.mediaSummary || 'not specified'}

## DESTINATIONS
${params.targets.map((t, i) => targetLine(t, i)).join('\n')}

## TASK
Write ONE caption per destination, faithful to the content, tailored to each destination's voice, limits, and post type, compliant with every Heart rule, and grounded in the Fortun universe knowledge when relevant. Use emoji naturally where the platform welcomes them.

Respond with ONLY a JSON object mapping each destination key to its caption string:
{
${params.targets.map((_, i) => `  "t${i}": "caption"`).join(',\n')}
}`;
}

async function callLlm(
  provider: string,
  model: string,
  keys: { openaiKey: string; geminiKey: string },
  prompt: string,
): Promise<Record<string, unknown>> {
  if (provider === 'gemini' && keys.geminiKey) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: TOKEN_BUDGETS.OMNI_CAPTIONS, temperature: 0.8 },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) throw new Error(`Gemini caption generation failed (${res.status})`);
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.openaiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      ...openAiTuning(model, TOKEN_BUDGETS.OMNI_CAPTIONS, 0.8),
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OpenAI caption generation failed (${res.status})`);
  const data = await res.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return {};
  }
}

/** One call covers all targets -> captions aligned to the input order. */
export async function generateDeskCaptions(params: {
  provider: string;
  model: string;
  keys: { openaiKey: string; geminiKey: string };
  heartRules: HeartRule[];
  knowledge: string[];
  title: string;
  notes: string;
  mediaSummary: string;
  targets: CaptionTargetInput[];
}): Promise<string[]> {
  const prompt = buildDeskCaptionsPrompt(params);
  const parsed = await callLlm(params.provider, params.model, params.keys, prompt);

  const out = params.targets.map((t, i) => {
    const raw = parsed[`t${i}`];
    const cap = NETWORK_BRIEFS[t.network]?.cap ?? 4000;
    // stripDashes: deterministic backstop for the "No em dashes" Heart rule.
    return typeof raw === 'string' && raw.trim() ? stripDashes(raw.trim()).slice(0, cap) : '';
  });
  if (out.every((c) => c.length === 0)) {
    throw new Error('Caption generation returned nothing usable. Please try again.');
  }
  return out;
}
