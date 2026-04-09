/**
 * Wishpedia Types (New Schema)
 * Simplified, category-driven encyclopedia types
 */

export interface WishpediaCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  has_angle_views: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WishpediaEntry {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  category?: WishpediaCategory;
}

export interface WishpediaEntryImage {
  id: string;
  entry_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size: number;
  angle: string | null;
  sort_order: number;
  is_primary: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export const ANGLE_VIEWS = ['front', 'back', 'left', 'right', 'top', 'bottom'] as const;
export type AngleView = typeof ANGLE_VIEWS[number];
