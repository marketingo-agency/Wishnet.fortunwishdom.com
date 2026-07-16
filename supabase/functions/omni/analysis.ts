/**
 * Omni image analysis for the Transform and Upscale mode.
 *
 * Three stages:
 *  1. Vision: describe the source image (OpenAI image_url with a signed URL,
 *     or Gemini with inline base64).
 *  2. RAG: hybrid match_knowledge retrieval (brain_document + wishpedia_entry,
 *     query_text passed for BM25) using the description as the query.
 *  3. Conclusion: relate the image to the Fortun universe and suggest
 *     improvements, grounded in priority-ordered Heart rules and FENCED
 *     retrieved knowledge (all retrieved content is sanitized + marked
 *     untrusted before prompt interpolation).
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { stripDashes } from '../_shared/sanitize.ts';
import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';
import { openAiTuning } from './llm.ts';
import { buildHeartBlock, buildKnowledgeBlock, retrieveKnowledge, type HeartRule } from './context.ts';

type AdminClient = ReturnType<typeof createClient>;

export interface AnalysisKeys {
  openaiKey: string;
  geminiKey: string;
}

export interface AnalysisResult {
  description: string;
  universe_relation: { related: boolean; conclusion: string };
  suggestions: { type: 'upscale' | 'transform'; text: string }[];
  retrieval: { brain_chunks: number; heart_rules: number };
}

const DESCRIBE_PROMPT =
  'Describe this image in detail for a creative team: subject, characters or objects, setting, art style, colors, lighting, mood, composition, and any visible text. Be specific and factual. Output plain text only.';

async function visionDescribe(
  provider: string,
  model: string,
  keys: AnalysisKeys,
  imageUrl: string,
  imageBase64: string | null,
  imageMime: string,
): Promise<string> {
  if (provider === 'gemini' && keys.geminiKey) {
    if (!imageBase64) throw new Error('Gemini vision requires the inline image');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [
            { text: DESCRIBE_PROMPT },
            { inlineData: { mimeType: imageMime, data: imageBase64 } },
          ] }],
          generationConfig: { maxOutputTokens: TOKEN_BUDGETS.OMNI_VISION_DESCRIBE },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) throw new Error(`Gemini vision failed (${res.status})`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini vision returned no description');
    return text;
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.openaiKey}` },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: DESCRIBE_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      }],
      // SIB-01: reasoning models (gpt-5.x/o-series) reject max_tokens.
      ...openAiTuning(model, TOKEN_BUDGETS.OMNI_VISION_DESCRIBE),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OpenAI vision failed (${res.status})`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI vision returned no description');
  return text;
}

function buildConclusionPrompt(description: string, heartRules: HeartRule[], knowledge: string[]): string {
  const heartSection = buildHeartBlock(heartRules);
  const knowledgeSection = buildKnowledgeBlock(knowledge, {
    emptyText: '## FORTUN UNIVERSE KNOWLEDGE\nNo specific knowledge retrieved for this image.',
  });

  return `You are Omni, the Multimodal Creation AI of Fortun Wishnet, analyzing an image for the creative team.

${heartSection}

${knowledgeSection}

## IMAGE DESCRIPTION (from the vision pass)
${description}

## TASK
1. Decide whether this image relates to the Fortun universe (characters, creatures, products, visual identity) based ONLY on the retrieved knowledge above. If the knowledge contains nothing relevant, say it does not appear related; never invent Fortun canon.
2. Suggest 2 to 4 concrete improvements: upscaling the resolution, or transformations that would make the image more aligned with the Fortun universe and Heart rules.

Respond with ONLY a JSON object in this exact shape:
{
  "description": "one concise paragraph describing the image",
  "related": true,
  "conclusion": "2-3 sentences on how the image relates (or does not relate) to the Fortun universe, citing what matched",
  "suggestions": [
    { "type": "upscale", "text": "..." },
    { "type": "transform", "text": "..." }
  ]
}`;
}

async function concludeAnalysis(
  provider: string,
  model: string,
  keys: AnalysisKeys,
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
          generationConfig: { maxOutputTokens: TOKEN_BUDGETS.OMNI_ANALYSIS, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) throw new Error(`Gemini analysis failed (${res.status})`);
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
      // SIB-01: reasoning models (gpt-5.x/o-series) reject max_tokens + temperature.
      ...openAiTuning(model, TOKEN_BUDGETS.OMNI_ANALYSIS, 0.4),
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OpenAI analysis failed (${res.status})`);
  const data = await res.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return {};
  }
}

export async function analyzeImage(params: {
  supabaseAdmin: AdminClient;
  keys: AnalysisKeys;
  provider: string;
  model: string;
  heartRules: HeartRule[];
  imageSignedUrl: string;
  imageBase64: string | null;
  imageMime: string;
}): Promise<AnalysisResult> {
  const description = await visionDescribe(
    params.provider, params.model, params.keys,
    params.imageSignedUrl, params.imageBase64, params.imageMime,
  );

  const knowledge = await retrieveKnowledge(params.supabaseAdmin, params.keys.openaiKey, description);

  const prompt = buildConclusionPrompt(description, params.heartRules, knowledge);
  const parsed = await concludeAnalysis(params.provider, params.model, params.keys, prompt);

  const suggestionsRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  // stripDashes: deterministic backstop for the "No em dashes" Heart rule.
  return {
    description: stripDashes(typeof parsed.description === 'string' && parsed.description ? parsed.description : description),
    universe_relation: {
      related: parsed.related === true,
      conclusion: stripDashes(typeof parsed.conclusion === 'string' ? parsed.conclusion : 'No conclusion produced.'),
    },
    suggestions: suggestionsRaw
      .filter((s: Record<string, unknown>) => typeof s?.text === 'string')
      .map((s: Record<string, unknown>) => ({
        type: s.type === 'upscale' ? 'upscale' as const : 'transform' as const,
        text: stripDashes(s.text as string),
      }))
      .slice(0, 4),
    retrieval: { brain_chunks: knowledge.length, heart_rules: params.heartRules.length },
  };
}
