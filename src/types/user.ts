/**
 * User Types
 * Centralized user-related type definitions
 */

import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];
export type PermissionLevel = Database['public']['Enums']['permission_level'];

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserWithRole extends UserProfile {
  role: AppRole;
}

export interface UserPermissions {
  id: string;
  user_id: string;
  
  // Tool-level permissions
  files_manager: PermissionLevel | null;
  mastermind: PermissionLevel | null;
  ai_agents: PermissionLevel | null;

  // Admin settings access
  can_access_branding: boolean | null;
  can_access_user_management: boolean | null;
  
  // Files Manager granular permissions
  files_can_upload: boolean | null;
  files_can_delete: boolean | null;
  files_can_see_admin_files: boolean | null;
  
  // MasterMind granular permissions
  mastermind_can_access_brain: boolean | null;
  mastermind_can_access_heart: boolean | null;
  mastermind_can_create: boolean | null;
  mastermind_can_edit: boolean | null;
  mastermind_can_delete: boolean | null;
  
  // AI Agents granular permissions
  ai_can_access_osha: boolean | null;
  ai_can_access_omni: boolean | null;

  created_at: string | null;
  updated_at: string | null;
}
