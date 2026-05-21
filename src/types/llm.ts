/**
 * LLM Types
 * Centralized type definitions for AI/LLM functionality
 */

export type LLMProvider = 'openai' | 'gemini' | 'fal';
export type ChatMode = 'text' | 'image' | 'video' | 'research';

export interface LLMSettings {
  id: string;
  // SEC-001: API keys exist as columns on llm_settings but are NEVER selected into the browser.
  // The openai_api_key / gemini_api_key / fal_api_key columns are intentionally omitted from this
  // interface so TypeScript refuses to surface them in any client-side read. Edge functions read
  // them server-side with the service role; writes go through the settings-keys edge function.
  openai_text_model: string;
  openai_image_model: string;
  openai_deep_research_model: string;
  openai_video_model: string;
  openai_enabled: boolean;
  gemini_text_model: string;
  gemini_image_model: string;
  gemini_video_model: string;
  gemini_enabled: boolean;
  fal_text_model: string;
  fal_image_model: string;
  fal_video_model: string;
  fal_enabled: boolean;
  active_text_provider: LLMProvider;
  active_image_provider: LLMProvider;
  active_deep_research_provider: LLMProvider;
  active_video_provider: LLMProvider;
  // Pulse (upload-post.com) preferences — upload_post_api_key omitted per SEC-001 pattern
  pulse_timezone: string;
  pulse_queue_enabled: boolean;
  pulse_webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isImage?: boolean;
  imageUrl?: string;
  isVideo?: boolean;
  videoUrl?: string;
  mode?: ChatMode;
  model?: string;
  provider?: LLMProvider;
}

export interface ChatRequest {
  message: string;
  provider: LLMProvider;
  model: string;
  mode: ChatMode;
  temperature?: number;
  systemPrompt?: string;
  isDeepResearch?: boolean;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatResponse {
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  error?: string;
}

export interface DeepResearchRequest {
  message: string;
  model: string;
  onProgress?: (status: string) => void;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  models?: number;
  availableModels?: string[];
  error?: string;
}
