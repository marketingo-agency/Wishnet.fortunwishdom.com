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

  /** In-place chat prompt optimization for Osha/Pixel inputs (Promptor optimize-draft action) */
  PROMPT_OPTIMIZE: 800,

  /** Ultra-short: intent detection, yes/no, single-label */
  INTENT: 200,

  /** Image prompt generation (Pixel prompt-building step) */
  IMAGE_PROMPT: 1024,

  /** OCR text extraction from images */
  OCR_EXTRACTION: 4096,

  /** Omni vision pass: describe an uploaded/selected image */
  OMNI_VISION_DESCRIBE: 1024,

  /** Omni analysis pass: universe-relation conclusion + improvement suggestions */
  OMNI_ANALYSIS: 2048,

  /** Omni Surprise Me: knowledge-mined creation idea batch (4-6 structured ideas) */
  OMNI_SURPRISE_IDEAS: 2048,

  /** Omni Brainstorming: one conversational chat turn */
  OMNI_BRAINSTORM_CHAT: 2048,

  /** Omni Brainstorming: distill the conversation into the final brief */
  OMNI_BRAINSTORM_LOCK: 1024,

  /** Omni captions: one image's captions across all its networks (structured JSON) */
  OMNI_CAPTIONS: 2048,

  /** General-purpose default when no specific budget applies */
  DEFAULT: 2048,
} as const;

export type TokenBudgetKey = keyof typeof TOKEN_BUDGETS;
