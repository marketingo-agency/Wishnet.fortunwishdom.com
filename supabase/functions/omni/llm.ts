/**
 * Shared OpenAI request-parameter helper for the omni edge function (SIB-01).
 *
 * OpenAI reasoning models (gpt-5.x family + o-series) use max_completion_tokens
 * + reasoning_effort and REJECT max_tokens + temperature with a 400; gpt-4.1
 * and legacy chat models keep max_tokens (+ optional temperature). Ported from
 * ai-chat's proven branch so every omni text call works on either family.
 */

export function isReasoningModel(model: string): boolean {
  return model.startsWith('gpt-5') || /^o[0-9]/.test(model);
}

/**
 * Build the token/tuning slice of an OpenAI chat.completions body for the
 * given model. Omit `temperature` to preserve call sites that never sent one
 * (the non-reasoning path then sends max_tokens only, byte-identical to the
 * previous behavior).
 */
export function openAiTuning(
  model: string,
  maxTokens: number,
  temperature?: number,
): Record<string, unknown> {
  if (isReasoningModel(model)) {
    return { max_completion_tokens: maxTokens, reasoning_effort: 'medium' };
  }
  return {
    max_tokens: maxTokens,
    ...(temperature === undefined ? {} : { temperature }),
  };
}
