/**
 * Pixel Types & Defaults
 */

import type { AttachmentContext } from '@/types/attachments';

export type { AttachmentContext };

export interface PixelSettings {
  id?: string;
  user_id?: string;
  default_language: string;
  default_verbosity: string;
  heart_strictness: string;
  refusal_style: string;
  safety_guard_mode: boolean;
  allowed_vocabulary: string[];
  blocked_vocabulary: string[];
  allowed_themes: string[];
  blocked_themes: string[];
  default_aesthetic: string;
  palette_behavior: string;
  texture_level: string;
  lighting: string;
  detail_level: string;
  internal_audit_logging: boolean;
}

export const DEFAULT_PIXEL_SETTINGS: PixelSettings = {
  default_language: 'en',
  default_verbosity: 'standard',
  heart_strictness: 'enforce_and_propose',
  refusal_style: 'neutral',
  safety_guard_mode: true,
  allowed_vocabulary: [],
  blocked_vocabulary: [],
  allowed_themes: [],
  blocked_themes: [],
  default_aesthetic: 'premium',
  palette_behavior: 'adaptive',
  texture_level: 'subtle',
  lighting: 'soft',
  detail_level: 'medium',
  internal_audit_logging: true,
};

export interface PixelMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  is_image?: boolean;
  image_url?: string;
  is_video?: boolean;
  video_url?: string;
  attachments?: Array<{ name: string; type: string; size: number }>;
  blueprint_id?: string;
  created_at: string;
  selected_post_type?: string;
  selected_size?: { width: number; height: number; ratio: string };
}

export interface PixelBlueprint {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  format?: string;
  aspect_ratio?: string;
  composition_rules?: string;
  style_rules?: string;
  typography_vibe?: string;
  element_rules?: string;
  negative_constraints?: string;
  export_specs?: string;
  palette?: Record<string, string>;
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface SendPixelMessageParams {
  message: string;
  mode: string;
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  attachments?: AttachmentContext[];
  blueprint?: Partial<PixelBlueprint>;
  styleLock?: boolean;
  lastBlueprintSummary?: string;
  selectedPostType?: string | null;
  selectedSize?: { width: number; height: number; ratio: string } | null;
}

export interface SendPixelMessageResult {
  content: string;
  isImage?: boolean;
  imageUrl?: string;
  isVideo?: boolean;
  videoUrl?: string;
  audit: {
    heartCount: number;
    brainCount: number;
    complianceStatus: string;
  };
}
