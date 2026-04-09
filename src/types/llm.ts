/**
 * LLM Types
 * Centralized type definitions for AI/LLM functionality
 */

export type LLMProvider = 'openai' | 'gemini';
export type ChatMode = 'text' | 'image' | 'video' | 'research';

export interface LLMSettings {
  id: string;
  openai_api_key?: string | null;
  gemini_api_key?: string | null;
  openai_text_model: string;
  openai_image_model: string;
  openai_deep_research_model: string;
  openai_video_model: string;
  openai_enabled: boolean;
  gemini_text_model: string;
  gemini_image_model: string;
  gemini_video_model: string;
  gemini_enabled: boolean;
  active_text_provider: LLMProvider;
  active_image_provider: LLMProvider;
  active_deep_research_provider: LLMProvider;
  active_video_provider: LLMProvider;
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
