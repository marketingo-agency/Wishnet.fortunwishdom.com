/**
 * Social caption generation (Plan 1 Phase 5 — the `generate-captions` action).
 *
 * One LLM call per IMAGE covers ALL of its networks (structured JSON out),
 * replacing the legacy per-cell Promptor detour (27 sequential calls for a
 * 3-image × 3-network set become ≤3). Runs under OMNI's Heart scope
 * (KB-GAP-3: captions used to inherit Promptor's scope, so rules assigned to
 * "omni" never reached them).
 */

import { stripDashes } from '../_shared/sanitize.ts';
import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';
import { openAiTuning } from './llm.ts';
import { buildHeartBlock, type HeartRule } from './context.ts';

/** Practical platform guidance + hard caps (chars). */
const NETWORK_BRIEFS: Record<string, { cap: number; guidance: string }> = {
  facebook: { cap: 2000, guidance: 'Conversational, 1-3 short paragraphs, ends with a light call to action.' },
  instagram: { cap: 2200, guidance: 'Visual-first voice, line breaks welcome, 3-6 fitting hashtags at the end, emoji natural.' },
  x: { cap: 280, guidance: 'HARD 280-character limit. Punchy single thought, at most 1-2 hashtags.' },
  tiktok: { cap: 2200, guidance: 'Hook-first, casual, trend-aware, 3-5 hashtags, emoji natural.' },
  youtube: { cap: 5000, guidance: 'Descriptive and searchable: what the visual shows and why it matters, keywords early.' },
  pinterest: { cap: 500, guidance: 'Inspirational and descriptive, searchable keywords, no hashtag spam.' },
};

export interface CaptionKeys {
  openaiKey: string;
  geminiKey: string;
}

function buildCaptionsPrompt(params: {
  heartRules: HeartRule[];
  objective: string;
  imagePrompt: string;
  networks: string[];
  optionsPerNetwork: number;
}): string {
  const networkLines = params.networks.map((n) => {
    const brief = NETWORK_BRIEFS[n];
    return `- "${n}": ${brief ? `${brief.guidance} Max ${brief.cap} characters.` : 'Platform-appropriate social caption.'}`;
  }).join('\n');

  return `You are Omni, the Multimodal Creation AI of Fortun Wishnet, writing social captions for ONE image across several networks.

${buildHeartBlock(params.heartRules)}

## THE CAMPAIGN OBJECTIVE
${params.objective || 'Not specified.'}

## THE IMAGE (its generation prompt)
${params.imagePrompt || 'Not specified.'}

## NETWORKS
${networkLines}

## TASK
Write ${params.optionsPerNetwork} caption option${params.optionsPerNetwork > 1 ? 's' : ''} PER network, tailored to each platform's voice and limits, faithful to the image and the objective, compliant with every Heart rule. Use emoji naturally where the platform welcomes them.

Respond with ONLY a JSON object mapping each network id to an array of caption strings:
{
${params.networks.map((n) => `  "${n}": [${Array.from({ length: params.optionsPerNetwork }, (_, i) => `"caption ${i + 1}"`).join(', ')}]`).join(',\n')}
}`;
}

async function callLlm(
  provider: string,
  model: string,
  keys: CaptionKeys,
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

/** One image → captions for every requested network: {[networkId]: string[]}. */
export async function generateCaptions(params: {
  provider: string;
  model: string;
  keys: CaptionKeys;
  heartRules: HeartRule[];
  objective: string;
  imagePrompt: string;
  networks: string[];
  optionsPerNetwork: number;
}): Promise<Record<string, string[]>> {
  const prompt = buildCaptionsPrompt(params);
  const parsed = await callLlm(params.provider, params.model, params.keys, prompt);

  const out: Record<string, string[]> = {};
  for (const network of params.networks) {
    const raw = parsed[network];
    const cap = NETWORK_BRIEFS[network]?.cap ?? 4000;
    const options = (Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [])
      .filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
      // stripDashes: deterministic backstop for the "No em dashes" Heart rule.
      .map((c: string) => stripDashes(c.trim()).slice(0, cap))
      .slice(0, Math.max(params.optionsPerNetwork, 1));
    if (options.length > 0) out[network] = options;
  }
  if (Object.keys(out).length === 0) {
    throw new Error('Caption generation returned nothing usable. Please try again.');
  }
  return out;
}
