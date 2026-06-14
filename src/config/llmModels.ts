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
