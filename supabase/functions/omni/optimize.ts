/**
 * optimize-draft: the "magic wand" that rewrites a draft prompt/brief/caption
 * for clarity, specificity, and brand alignment - grounded in Heart rules +
 * Brain/Wishpedia retrieval. Ported into Omni so the wand is self-contained
 * and no longer depends on the (removed) Promptor agent. Returns the rewrite.
 */

import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';
import { stripDashes } from '../_shared/sanitize.ts';
import { openAiTuning } from './llm.ts';
import { buildHeartBlock, buildKnowledgeBlock, type HeartRule } from './context.ts';

function buildOptimizePrompt(heartRules: HeartRule[], knowledge: string[], draft: string): string {
  return `You are the prompt-optimization engine of Fortun Wishnet. Rewrite the user's draft to be clearer, more specific, and aligned with the brand, staying faithful to their intent.

${buildHeartBlock(heartRules)}

${buildKnowledgeBlock(knowledge, {
    emptyText: '## FORTUN UNIVERSE KNOWLEDGE\nNo specific knowledge matched this draft.',
  })}

## TASK
Rewrite the DRAFT below into a single, stronger version: clearer, more specific, compliant with every Heart rule, and grounded in the Fortun universe knowledge above when relevant. Keep it the SAME KIND of text the user wrote (a chat prompt, a creative brief, or a caption) and roughly the same length. Add no commentary, options, or explanations.

Respond with ONLY a JSON object: { "rewrite": "the rewritten draft as one string" }. Do not wrap the rewrite in quotes or code fences.

DRAFT TO REWRITE:
${draft}`;
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
          generationConfig: { maxOutputTokens: TOKEN_BUDGETS.PROMPT_OPTIMIZE, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) throw new Error(`Gemini optimize failed (${res.status})`);
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
      ...openAiTuning(model, TOKEN_BUDGETS.PROMPT_OPTIMIZE, 0.7),
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OpenAI optimize failed (${res.status})`);
  const data = await res.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return {};
  }
}

export async function optimizeDraft(params: {
  provider: string;
  model: string;
  keys: { openaiKey: string; geminiKey: string };
  heartRules: HeartRule[];
  knowledge: string[];
  draft: string;
}): Promise<string> {
  const prompt = buildOptimizePrompt(params.heartRules, params.knowledge, params.draft);
  const parsed = await callLlm(params.provider, params.model, params.keys, prompt);
  const raw = parsed.rewrite;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('The optimizer returned an empty rewrite. Please try again.');
  }
  // stripDashes: deterministic backstop for the "No em dashes" Heart rule.
  return stripDashes(raw.trim()).slice(0, 8000);
}
