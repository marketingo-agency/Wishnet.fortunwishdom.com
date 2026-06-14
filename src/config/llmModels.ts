/**
 * LLM Model Configuration
 * Centralized model definitions for AI providers
 */

export interface ModelOption {
  value: string;
  label: string;
  description: string;
}

// OpenAI General Reasoning Models (10 latest, verified 2026-06 — newest first)
export const OPENAI_TEXT_MODELS: ModelOption[] = [
  { value: 'gpt-5.5', label: 'GPT-5.5', description: 'Flagship reasoning, 1M context' },
  { value: 'gpt-5.5-pro', label: 'GPT-5.5 Pro', description: 'Highest-accuracy reasoning' },
  { value: 'gpt-5.4', label: 'GPT-5.4', description: 'Frontier reasoning, cost-effective' },
  { value: 'gpt-5.4-pro', label: 'GPT-5.4 Pro', description: 'High-accuracy 5.4 reasoning' },
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini', description: 'Low-latency reasoning' },
  { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano', description: 'Cheapest 5.4 reasoning' },
  { value: 'gpt-5.2', label: 'GPT-5.2', description: 'Reasoning with xhigh effort' },
  { value: 'gpt-5.1', label: 'GPT-5.1', description: 'Adaptive reasoning' },
  { value: 'o3', label: 'OpenAI o3', description: 'Dedicated reasoning (legacy)' },
  { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Fast non-reasoning fallback' },
];

// OpenAI Deep Research Models
export const OPENAI_DEEP_RESEARCH_MODELS: ModelOption[] = [
  { value: 'o3-deep-research', label: 'O3 Deep Research', description: 'Advanced deep research' },
  { value: 'o4-mini-deep-research', label: 'O4 Mini Deep Research', description: 'Efficient deep research' },
];

// NOTE: OpenAI/Gemini IMAGE and VIDEO model registries were removed — fal.ai is the sole
// image/video engine app-wide (see FAL_IMAGE_MODELS / FAL_VIDEO_MODELS below). OpenAI/Gemini
// remain TEXT/reasoning providers only.

// Gemini General Reasoning Models (current, verified 2026-06 — newest first; shut-down ids removed)
export const GEMINI_TEXT_MODELS: ModelOption[] = [
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', description: 'Reasoning flagship, 1M context (preview)' },
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', description: 'Most intelligent Flash (GA)' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', description: 'Fast Gemini 3 (preview)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', description: 'Speed/cost optimized (GA)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Prior-gen flagship (GA)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Balanced workhorse (GA)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: 'Cheapest 2.5 tier (GA)' },
];

// Claude (Anthropic) General Reasoning Models — TEXT only (no image/video). Verified 2026-06, newest first.
export const CLAUDE_TEXT_MODELS: ModelOption[] = [
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8', description: 'Most capable Opus, 1M context (default)' },
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7', description: 'Previous-gen Opus, 1M context' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6', description: 'Opus 4.6, 1M context' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', description: 'Best speed/intelligence balance' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', description: 'Fastest, low-cost reasoning' },
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5', description: 'Legacy Opus' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', description: 'Legacy Sonnet' },
];

// fal.ai Image Generation Models (verified from fal-ai MCP 2026-04-14)
export const FAL_IMAGE_MODELS: ModelOption[] = [
  { value: 'fal-ai/flux-pro/v1.1-ultra', label: 'FLUX1.1 [pro] Ultra', description: '2K resolution, photorealism flagship' },
  { value: 'fal-ai/flux-pro/v1.1', label: 'FLUX1.1 [pro]', description: 'Enhanced composition and detail' },
  { value: 'fal-ai/flux/dev', label: 'FLUX.1 [dev]', description: '12B param, commercial use' },
  { value: 'fal-ai/flux/schnell', label: 'FLUX.1 [schnell]', description: '1–4 step, fastest' },
  { value: 'fal-ai/flux-2-max', label: 'FLUX.2 Max', description: 'SOTA generation + editing' },
  { value: 'fal-ai/ideogram/v3', label: 'Ideogram V3', description: 'Exceptional typography' },
  { value: 'fal-ai/recraft/v4/text-to-image', label: 'Recraft V4', description: 'Designer-grade, brand systems' },
  { value: 'fal-ai/imagen4/preview', label: 'Imagen 4', description: 'Google highest quality (preview)' },
];

// fal.ai Image-to-Image / EDIT Models — curated + verified via fal-ai MCP 2026-06-14.
// All accept `image_urls[]` + `prompt`, so they recreate Wishpedia canon characters
// from attached reference images. Offered in Omni Images step 3 when references are
// attached (the wizard hides text-to-image models there — they cannot use refs).
// `maxRefs` = the reference-image count the model sensibly handles.
export interface EditModelOption extends ModelOption {
  maxRefs: number;
  /** Local brand-logo asset under /public/model-logos, shown on the step-3 card. */
  logoUrl?: string;
}

// Order = the step-3 card order; index 0 is the pre-selected default.
// All accept `image_urls[]` + `prompt` (verified via fal-ai get_model_schema
// 2026-06-14) so they fit the edge variant-submit i2i contract. Inpaint-only
// (ideogram/v3/edit needs mask_url) and singular-image models (seededit/v3,
// luma-photon) are intentionally excluded — they break the image_urls[] contract.
export const FAL_EDIT_MODELS: EditModelOption[] = [
  { value: 'fal-ai/nano-banana-pro/edit', label: 'Nano Banana Pro Edit', description: 'Google SOTA edit — highest character fidelity, up to 4K', maxRefs: 8, logoUrl: '/model-logos/gemini.svg' },
  { value: 'fal-ai/nano-banana-2/edit', label: 'Nano Banana 2 Edit', description: 'Fast Gemini edit, cheaper than Pro', maxRefs: 8, logoUrl: '/model-logos/gemini.svg' },
  { value: 'fal-ai/flux-pro/kontext/max/multi', label: 'FLUX.1 Kontext [max]', description: 'Premium BFL editor — best typography + consistency, multi-reference', maxRefs: 4, logoUrl: '/model-logos/flux.svg' },
  { value: 'fal-ai/flux-pro/kontext/multi', label: 'FLUX.1 Kontext [pro]', description: 'BFL multi-image editor — strong edits at lower cost', maxRefs: 4, logoUrl: '/model-logos/flux.svg' },
  { value: 'fal-ai/bytedance/seedream/v4/edit', label: 'Seedream V4 Edit', description: 'Unified gen+edit, up to 10 references', maxRefs: 10, logoUrl: '/model-logos/seedream.svg' },
  { value: 'fal-ai/qwen-image-edit-plus', label: 'Qwen Image Edit Plus', description: 'Best at preserving in-image text/typography', maxRefs: 6, logoUrl: '/model-logos/qwen.svg' },
  { value: 'fal-ai/flux-2-pro/edit', label: 'FLUX.2 Pro Edit', description: 'Photoreal flagship edit + color control', maxRefs: 8, logoUrl: '/model-logos/flux.svg' },
  { value: 'fal-ai/gpt-image-1.5/edit', label: 'GPT-Image 1.5 Edit', description: 'Strong prompt adherence, preserves composition', maxRefs: 8, logoUrl: '/model-logos/openai.svg' },
  { value: 'fal-ai/gemini-25-flash-image/edit', label: 'Gemini 2.5 Flash Image', description: 'Original Gemini "Nano Banana" editor — fast, low cost', maxRefs: 8, logoUrl: '/model-logos/gemini.svg' },
];

/** Per-edit-model reference-image cap, derived from FAL_EDIT_MODELS. */
export const EDIT_MODEL_MAX_REFS: Record<string, number> = Object.fromEntries(
  FAL_EDIT_MODELS.map((m) => [m.value, m.maxRefs]),
);

export const DEFAULT_EDIT_MODEL_MAX_REFS = 6;

/** The proven default edit model (pre-selected when references are attached). */
export const DEFAULT_FAL_EDIT_MODEL = FAL_EDIT_MODELS[0].value;

export function getEditModelMaxRefs(modelId: string): number {
  return EDIT_MODEL_MAX_REFS[modelId] ?? DEFAULT_EDIT_MODEL_MAX_REFS;
}

/**
 * Generous reference-image cap for the step-1 picker = the most any curated edit
 * model accepts. The model is chosen later (step 3), so this is the upper bound;
 * step 3 narrows the warning to the chosen model and the edge clamps per model.
 */
export const MAX_REFERENCE_IMAGES = Math.max(...FAL_EDIT_MODELS.map((m) => m.maxRefs));

// fal.ai Video Generation Models (verified from fal-ai MCP 2026-04-14)
export const FAL_VIDEO_MODELS: ModelOption[] = [
  { value: 'fal-ai/kling-video/v3/pro/text-to-video', label: 'Kling 3.0 Pro', description: 'Cinematic + native audio' },
  { value: 'fal-ai/veo3.1', label: 'Veo 3.1', description: 'Google flagship, audio on' },
  { value: 'fal-ai/veo3.1/fast', label: 'Veo 3.1 Fast', description: 'Lower latency' },
  { value: 'fal-ai/wan/v2.7/text-to-video', label: 'Wan 2.7', description: 'Enhanced motion + coherence' },
  { value: 'bytedance/seedance-2.0/text-to-video', label: 'Seedance 2.0', description: 'Cinematic, multi-shot, audio' },
];

// fal.ai Text Models (OpenRouter gateway)
export const FAL_TEXT_MODELS: ModelOption[] = [
  { value: 'openrouter/router', label: 'OpenRouter Gateway', description: 'Unified access to 200+ models' },
  { value: 'fal-ai/bytedance/seed/v2/mini', label: 'Seed 2.0 Mini', description: 'Multimodal, 256K context' },
];

// Helper to get all models for a provider
export type LLMProviderKey = 'openai' | 'gemini' | 'fal' | 'claude';

export function getTextModelsForProvider(provider: LLMProviderKey): ModelOption[] {
  if (provider === 'fal') return FAL_TEXT_MODELS;
  if (provider === 'claude') return CLAUDE_TEXT_MODELS;
  return provider === 'openai' ? OPENAI_TEXT_MODELS : GEMINI_TEXT_MODELS;
}

// Image + video are fal-only app-wide; non-fal providers return no models.
export function getImageModelsForProvider(provider: LLMProviderKey): ModelOption[] {
  return provider === 'fal' ? FAL_IMAGE_MODELS : [];
}

export function getVideoModelsForProvider(provider: LLMProviderKey): ModelOption[] {
  return provider === 'fal' ? FAL_VIDEO_MODELS : [];
}

export function getDeepResearchModels(): ModelOption[] {
  return OPENAI_DEEP_RESEARCH_MODELS;
}

// File Analysis Models
export const OPENAI_FILE_ANALYSIS_MODELS: ModelOption[] = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Multimodal, great for documents' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast & affordable' },
  { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Enhanced GPT-4' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Fast and efficient' },
];

export const GEMINI_FILE_ANALYSIS_MODELS: ModelOption[] = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', description: 'Fast, current-gen vision' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Balanced quality' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Highest quality' },
];

export function getFileAnalysisModelsForProvider(provider: 'openai' | 'gemini'): ModelOption[] {
  return provider === 'openai' ? OPENAI_FILE_ANALYSIS_MODELS : GEMINI_FILE_ANALYSIS_MODELS;
}

// Default models
export const DEFAULT_OPENAI_TEXT_MODEL = 'gpt-5.4';
export const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-1';
export const DEFAULT_OPENAI_DEEP_RESEARCH_MODEL = 'o3-deep-research';
export const DEFAULT_OPENAI_VIDEO_MODEL = 'sora-2';
export const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-3.5-flash';
export const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
export const DEFAULT_CLAUDE_TEXT_MODEL = 'claude-opus-4-8';
export const DEFAULT_FAL_IMAGE_MODEL = 'fal-ai/flux-pro/v1.1-ultra';
export const DEFAULT_FAL_VIDEO_MODEL = 'fal-ai/kling-video/v3/pro/text-to-video';
export const DEFAULT_FAL_TEXT_MODEL = 'openrouter/router';
export const DEFAULT_GEMINI_VIDEO_MODEL = 'veo-3.1-generate-preview';
