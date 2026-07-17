/**
 * Brainstorming (Mode 6): a RAG-grounded creative chat.
 *
 * Two operations:
 *  - chatBrainstorm: one conversational turn. Heart rules + hybrid retrieval
 *    (fenced untrusted) ground every reply; image attachments ride the last
 *    user message (OpenAI data-URL parts / Gemini inlineData). Attachment
 *    bytes are NEVER persisted; only this live call sees them.
 *  - lockIdea: distills the conversation into the final creative brief
 *    ({ title, objective }) that prefills the Omni Images wizard.
 */

import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';
import { stripDashes } from '../_shared/sanitize.ts';
import { openAiTuning } from './llm.ts';
import { buildHeartBlock, buildKnowledgeBlock, type HeartRule } from './context.ts';

export interface BrainstormMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface BrainstormAttachment {
  mime: string;
  data: string;
}

export interface BrainstormKeys {
  openaiKey: string;
  geminiKey: string;
}

function buildChatSystemPrompt(heartRules: HeartRule[], knowledge: string[], ragAvailable: boolean): string {
  const heartSection = buildHeartBlock(heartRules);
  const knowledgeSection = buildKnowledgeBlock(knowledge, {
    emptyText: ragAvailable
      ? '## FORTUN UNIVERSE KNOWLEDGE\nNo specific knowledge matched this turn.'
      : '## FORTUN UNIVERSE KNOWLEDGE\nKnowledge retrieval is unavailable (no OpenAI key for embeddings). Ground yourself in the Heart rules only and say so if asked about canon details.',
  });

  return `You are Omni, the Multimodal Creation AI of Fortun Wishnet, brainstorming IMAGE ideas with a teammate.

${heartSection}

${knowledgeSection}

## HOW TO BRAINSTORM
- Develop the user's idea collaboratively: sharpen it, propose concrete directions, ask at most one focused question per turn.
- Stay strictly within Fortun canon found in the knowledge above; never invent characters, creatures, or lore that is not there.
- Think visually: subject, setting, style, mood, composition.
- Keep replies short and conversational: plain text, short paragraphs or simple dashes, no markdown headers.
- When the idea feels ready, suggest the user lock it to continue into generation.`;
}

async function callOpenAiChat(
  model: string,
  key: string,
  system: string,
  messages: BrainstormMessageInput[],
  attachments: BrainstormAttachment[],
  maxTokens: number,
): Promise<string> {
  const mapped = messages.map((m, idx) => {
    const isLast = idx === messages.length - 1;
    if (m.role === 'user' && isLast && attachments.length > 0) {
      return {
        role: 'user',
        content: [
          { type: 'text', text: m.content },
          ...attachments.map((a) => ({
            type: 'image_url',
            image_url: { url: `data:${a.mime};base64,${a.data}`, detail: 'low' },
          })),
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...mapped],
      // SIB-01: reasoning models (gpt-5.x/o-series) reject max_tokens + temperature.
      ...openAiTuning(model, maxTokens, 0.8),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OpenAI chat failed (${res.status})`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned no reply');
  return text;
}

async function callGeminiChat(
  model: string,
  key: string,
  system: string,
  messages: BrainstormMessageInput[],
  attachments: BrainstormAttachment[],
  maxTokens: number,
): Promise<string> {
  const contents = messages.map((m, idx) => {
    const isLast = idx === messages.length - 1;
    const parts: Record<string, unknown>[] = [{ text: m.content }];
    if (m.role === 'user' && isLast) {
      for (const a of attachments) {
        parts.push({ inlineData: { mimeType: a.mime, data: a.data } });
      }
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) throw new Error(`Gemini chat failed (${res.status})`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no reply');
  return text;
}

export async function chatBrainstorm(params: {
  provider: string;
  model: string;
  keys: BrainstormKeys;
  heartRules: HeartRule[];
  knowledge: string[];
  ragAvailable: boolean;
  messages: BrainstormMessageInput[];
  attachments: BrainstormAttachment[];
}): Promise<string> {
  const system = buildChatSystemPrompt(params.heartRules, params.knowledge, params.ragAvailable);
  // stripDashes: deterministic backstop for the "No em dashes" Heart rule.
  const reply = params.provider === 'gemini' && params.keys.geminiKey
    ? await callGeminiChat(params.model, params.keys.geminiKey, system, params.messages, params.attachments, TOKEN_BUDGETS.OMNI_BRAINSTORM_CHAT)
    : await callOpenAiChat(params.model, params.keys.openaiKey, system, params.messages, params.attachments, TOKEN_BUDGETS.OMNI_BRAINSTORM_CHAT);
  return stripDashes(reply);
}

const LOCK_TASK = `Distill this brainstorming conversation into the FINAL creative brief the user has converged on.

Respond with ONLY a JSON object in this exact shape:
{
  "title": "short punchy name for the idea (max 10 words)",
  "objective": "a ready-to-use creative brief for an image generation wizard: subject, setting, style, mood, composition; faithful to what was agreed in the conversation"
}`;

export async function lockIdea(params: {
  provider: string;
  model: string;
  keys: BrainstormKeys;
  messages: BrainstormMessageInput[];
  /** KB-GAP-4: the lock distillation seeds the whole run - it must be
   *  Heart-grounded like the chat that produced it. */
  heartRules: HeartRule[];
}): Promise<{ title: string; objective: string }> {
  const transcript = params.messages
    .map((m) => `${m.role === 'user' ? 'USER' : 'OMNI'}: ${m.content}`)
    .join('\n');
  const prompt = `${buildHeartBlock(params.heartRules)}\n\n## CONVERSATION\n${transcript}\n\n## TASK\n${LOCK_TASK}\nThe brief must comply with every Heart rule above.`;

  let parsed: Record<string, unknown> = {};
  if (params.provider === 'gemini' && params.keys.geminiKey) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.keys.geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: TOKEN_BUDGETS.OMNI_BRAINSTORM_LOCK, temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) throw new Error(`Gemini lock failed (${res.status})`);
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  } else {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.keys.openaiKey}` },
      body: JSON.stringify({
        model: params.model,
        messages: [{ role: 'user', content: prompt }],
        // SIB-01: reasoning models (gpt-5.x/o-series) reject max_tokens + temperature.
        ...openAiTuning(params.model, TOKEN_BUDGETS.OMNI_BRAINSTORM_LOCK, 0.3),
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`OpenAI lock failed (${res.status})`);
    const data = await res.json();
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    } catch {
      parsed = {};
    }
  }

  const title = typeof parsed.title === 'string' ? stripDashes(parsed.title.trim()).slice(0, 120) : '';
  const objective = typeof parsed.objective === 'string' ? stripDashes(parsed.objective.trim()).slice(0, 2000) : '';
  if (!title || !objective) {
    throw new Error('The idea could not be distilled. Add one more exchange and try locking again.');
  }
  return { title, objective };
}
