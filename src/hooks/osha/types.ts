/**
 * Osha Types & Defaults
 */

import type { AttachmentContext } from '@/types/attachments';

export type { AttachmentContext };

export interface OshaSettings {
  id?: string;
  user_id?: string;
  default_mode: string;
  default_language: string;
  auto_detect_language: boolean;
  default_verbosity: string;
  response_structure: string;
  hallucination_control: boolean;
  retrieval_depth: string;
  bubble_enabled: boolean;
  bubble_greeting: string;
  bubble_quick_starters: Array<{ label: string; prompt: string }>;
  bubble_remember_state: boolean;
  bubble_name: string;
  bubble_subtitle: string;
  bubble_accent_color: string;
  bubble_position: string;
  bubble_panel_size: string;
  bubble_show_mode_selector: boolean;
  bubble_show_clear_button: boolean;
  bubble_launch_animation: string;
  bubble_show_status_dot: boolean;
  bubble_sound_enabled: boolean;
  bubble_button_size: string;
  max_file_size_mb: number;
  max_pages_processed: number;
  preferred_file_output: string;
  citation_behavior: boolean;
  image_generation_enabled: boolean;
  image_default_size: string;
  image_brand_preset: string;
  file_analysis_provider: string;
  file_analysis_model: string;
  image_provider: string;
  image_model: string;
}

export const DEFAULT_OSHA_SETTINGS: OshaSettings = {
  default_mode: 'guide',
  default_language: 'en',
  auto_detect_language: true,
  default_verbosity: 'standard',
  response_structure: 'plain',
  hallucination_control: true,
  retrieval_depth: 'medium',
  bubble_enabled: true,
  bubble_greeting: "Hi! I'm Osha, your Fortun Wishnet assistant. How can I help?",
  bubble_quick_starters: [
    { label: 'What can you help me with?', prompt: 'What can you help me with on Fortun Wishnet?' },
    { label: 'Explain the platform', prompt: 'Give me a brief overview of Fortun Wishnet and its main features.' },
    { label: 'Help me brainstorm', prompt: 'I need help brainstorming ideas for a project.' },
  ],
  bubble_remember_state: true,
  bubble_name: 'Osha',
  bubble_subtitle: 'Fortun Wishnet Assistant · Online',
  bubble_accent_color: 'sky',
  bubble_position: 'bottom-right',
  bubble_panel_size: 'standard',
  bubble_show_mode_selector: false,
  bubble_show_clear_button: true,
  bubble_launch_animation: 'slide-up',
  bubble_show_status_dot: true,
  bubble_sound_enabled: false,
  bubble_button_size: 'standard',
  max_file_size_mb: 10,
  max_pages_processed: 50,
  preferred_file_output: 'summary',
  citation_behavior: false,
  image_generation_enabled: false,
  image_default_size: '1024x1024',
  image_brand_preset: 'default',
  file_analysis_provider: 'gemini',
  file_analysis_model: 'gemini-2.0-flash',
  image_provider: 'openai',
  image_model: 'gpt-image-1',
};

export interface OshaMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  is_image?: boolean;
  image_url?: string;
  attachments?: Array<{ name: string; type: string; size: number }>;
  created_at: string;
  usedWebSearch?: boolean;
  analyzedUrls?: boolean;
  isProgressMessage?: boolean;
  sourceUsed?: 'brain' | 'llm' | 'web';
}

export interface SendMessageParams {
  message: string;
  mode: string;
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  attachments?: AttachmentContext[];
}

export interface SendMessageResult {
  content: string;
  isImage?: boolean;
  imageUrl?: string;
  usedWebSearch?: boolean;
  analyzedUrls?: boolean;
  sourceUsed?: 'brain' | 'llm' | 'web';
  audit: {
    heartCount: number;
    brainCount: number;
    complianceStatus: string;
  };
}
