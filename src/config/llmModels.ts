/**
 * LLM Model Configuration
 * Centralized model definitions for AI providers
 */

export interface ModelOption {
  value: string;
  label: string;
  description: string;
}

// OpenAI General Reasoning Models
export const OPENAI_TEXT_MODELS: ModelOption[] = [
  { value: 'gpt-5.2', label: 'GPT-5.2', description: 'Latest flagship model' },
  { value: 'gpt-5.1', label: 'GPT-5.1', description: 'Previous generation flagship' },
  { value: 'gpt-5', label: 'GPT-5', description: 'Fifth generation model' },
  { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Enhanced GPT-4' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Fast and efficient' },
  { value: 'o4-mini', label: 'O4 Mini', description: 'Compact reasoning model' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Multimodal, 128k context' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast & affordable' },
];

// OpenAI Deep Research Models
export const OPENAI_DEEP_RESEARCH_MODELS: ModelOption[] = [
  { value: 'o3-deep-research', label: 'O3 Deep Research', description: 'Advanced deep research' },
  { value: 'o4-mini-deep-research', label: 'O4 Mini Deep Research', description: 'Efficient deep research' },
];

// OpenAI Image Generation Models
export const OPENAI_IMAGE_MODELS: ModelOption[] = [
  { value: 'gpt-image-1.5', label: 'GPT Image 1.5', description: 'Latest image generation' },
  { value: 'gpt-image-1', label: 'GPT Image 1', description: 'Standard image generation' },
  { value: 'gpt-image-1-mini', label: 'GPT Image 1 Mini', description: 'Fast image generation' },
];

// OpenAI Video Generation Models
export const OPENAI_VIDEO_MODELS: ModelOption[] = [
  { value: 'sora-2', label: 'Sora 2', description: 'Standard video generation' },
  { value: 'sora-2-pro', label: 'Sora 2 Pro', description: 'Professional video generation' },
];

// Gemini General Reasoning Models
export const GEMINI_TEXT_MODELS: ModelOption[] = [
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', description: 'Next-gen reasoning flagship (preview)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', description: 'Latest flagship model' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', description: 'Fast and efficient' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Best quality, 2M context' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Balanced speed & quality' },
];

// Gemini Image Generation Models
export const GEMINI_IMAGE_MODELS: ModelOption[] = [
  { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image (Preview)', description: 'Nano Banana 2 — balanced speed + quality, multi-size up to 4K (preview)' },
  { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (Preview)', description: 'Nano Banana Pro — studio quality, 4K, thinking (preview)' },
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', description: 'Nano Banana — fast, stable, high-volume generation (GA)' },
];

// Gemini Video Generation Models
export const GEMINI_VIDEO_MODELS: ModelOption[] = [
  { value: 'veo-3.1-generate-preview', label: 'Veo 3.1', description: 'Flagship — native audio, 1080p (paid preview)' },
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
export type LLMProviderKey = 'openai' | 'gemini' | 'fal';

export function getTextModelsForProvider(provider: LLMProviderKey): ModelOption[] {
  if (provider === 'fal') return FAL_TEXT_MODELS;
  return provider === 'openai' ? OPENAI_TEXT_MODELS : GEMINI_TEXT_MODELS;
}

export function getImageModelsForProvider(provider: LLMProviderKey): ModelOption[] {
  if (provider === 'fal') return FAL_IMAGE_MODELS;
  return provider === 'openai' ? OPENAI_IMAGE_MODELS : GEMINI_IMAGE_MODELS;
}

export function getVideoModelsForProvider(provider: LLMProviderKey): ModelOption[] {
  if (provider === 'fal') return FAL_VIDEO_MODELS;
  return provider === 'openai' ? OPENAI_VIDEO_MODELS : GEMINI_VIDEO_MODELS;
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
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Fast, reliable' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Balanced quality' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Highest quality' },
];

export function getFileAnalysisModelsForProvider(provider: 'openai' | 'gemini'): ModelOption[] {
  return provider === 'openai' ? OPENAI_FILE_ANALYSIS_MODELS : GEMINI_FILE_ANALYSIS_MODELS;
}

// Default models
export const DEFAULT_OPENAI_TEXT_MODEL = 'gpt-4o';
export const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-1';
export const DEFAULT_OPENAI_DEEP_RESEARCH_MODEL = 'o3-deep-research';
export const DEFAULT_OPENAI_VIDEO_MODEL = 'sora-2';
export const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
export const DEFAULT_FAL_IMAGE_MODEL = 'fal-ai/flux-pro/v1.1-ultra';
export const DEFAULT_FAL_VIDEO_MODEL = 'fal-ai/kling-video/v3/pro/text-to-video';
export const DEFAULT_FAL_TEXT_MODEL = 'openrouter/router';
export const DEFAULT_GEMINI_VIDEO_MODEL = 'veo-3.1-generate-preview';
