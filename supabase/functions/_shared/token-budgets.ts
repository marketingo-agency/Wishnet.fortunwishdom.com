/**
 * Centralized token budget configuration for all edge functions.
 * AGENT-011: avoids hardcoded max_tokens scattered across functions.
 *
 * Import from '../_shared/token-budgets.ts' in any edge function:
 *   import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';
 *
 * Usage:
 *   max_tokens: TOKEN_BUDGETS.CHAT_RESPONSE
 */

export const TOKEN_BUDGETS = {
  /** Standard chat response (Osha, Pixel text mode, ai-chat) */
  CHAT_RESPONSE: 8192,

  /** Long-form content generation (Promptor create/optimize) */
  CONTENT_GENERATION: 4096,

  /** Short classification / routing decisions */
  CLASSIFICATION: 500,

  /** Ultra-short: intent detection, yes/no, single-label */
  INTENT: 200,

  /** Image prompt generation (Pixel prompt-building step) */
  IMAGE_PROMPT: 1024,

  /** OCR text extraction from images */
  OCR_EXTRACTION: 4096,

  /** General-purpose default when no specific budget applies */
  DEFAULT: 2048,
} as const;

export type TokenBudgetKey = keyof typeof TOKEN_BUDGETS;
