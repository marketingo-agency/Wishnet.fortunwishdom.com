/**
 * Shared sanitization utilities for edge functions.
 * AGENT-003: prevents prompt injection via user-controlled text
 * (e.g., heart rule names/content) interpolated into LLM system prompts.
 */

/**
 * Sanitize text before interpolation into LLM system prompts.
 * Strips characters that could break JSON mode, close XML/system tags,
 * or inject prompt control sequences.
 */
export function sanitizeForPrompt(text: string): string {
  return text
    // Remove potential XML/system tag closers
    .replace(/<\/?system[^>]*>/gi, '')
    .replace(/<\/?user[^>]*>/gi, '')
    .replace(/<\/?assistant[^>]*>/gi, '')
    // Remove triple backticks (could break code fences in prompt)
    .replace(/```/g, "'''")
    // Neutralize common prompt injection patterns
    .replace(/\bignore\s+(all\s+)?previous\s+instructions?\b/gi, '[filtered]')
    .replace(/\byou\s+are\s+now\b/gi, '[filtered]')
    .replace(/\bact\s+as\b/gi, '[filtered]')
    .replace(/\bforget\s+(everything|all)\b/gi, '[filtered]')
    // Trim excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
