/**
 * Brain Knowledge Base Types
 */

export type BrainCategory = 'brand' | 'products' | 'support' | 'operations';
export type BrainSectionType = 'general' | 'agent';

export interface BrainSection {
  id: string;
  type: BrainSectionType;
  agent_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrainDocument {
  id: string;
  section_id: string;
  name: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  category: BrainCategory;
  description: string | null;
  restricted_agents: string[] | null;
  uploaded_by: string | null;
  sort_order: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeartRule {
  id: string;
  name: string;
  description: string | null;
  rule_content: string;
  category: string;
  priority: string;
  is_global: boolean;
  assigned_agents: string[] | null;
  is_active: boolean;
  created_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Note: Category data is now fetched from database via useBrainCategories() and useHeartCategories() hooks
// See: src/hooks/useBrainCategories.ts and src/hooks/useHeartCategories.ts

// Note: priority field kept in HeartRule type for DB compatibility
// but is no longer exposed in the UI
