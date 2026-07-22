import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PermissionLevel, UserPermissions } from '@/types/user';

// Re-export types for backward compatibility
export type { PermissionLevel, UserPermissions };

export function useUserPermissions(userId?: string) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No permissions record exists, return defaults
          return null;
        }
        throw error;
      }
      
      return data as UserPermissions;
    },
    enabled: !!userId,
  });
}

export function useCurrentUserPermissions() {
  const { user, isAdmin } = useAuth();
  
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data as UserPermissions;
    },
    enabled: !!user?.id && !isAdmin, // Admins don't need to check permissions
  });

  // Admins have full access to everything
  if (isAdmin) {
    return {
      permissions: {
        files_manager: 'full' as PermissionLevel,
        mastermind: 'full' as PermissionLevel,
        ai_agents: 'full' as PermissionLevel,
        can_access_branding: true,
        can_access_user_management: true,
        // Files Manager
        files_can_see_admin_files: true,
        files_can_delete: true,
        files_can_upload: true,
        // AI Agents
        ai_can_access_nexus: true,
        ai_can_access_promptor: true,
        ai_can_access_osha: true,
        ai_can_access_whisper: true,
        ai_can_access_pulse: true,
        ai_can_access_muse: true,
        ai_can_access_pixel: true,
        ai_can_access_atlas: true,
        ai_can_access_omni: true,
        // MasterMind
        mastermind_can_create: true,
        mastermind_can_edit: true,
        mastermind_can_delete: true,
        mastermind_can_access_brain: true,
        mastermind_can_access_heart: true,
      },
      isLoading: false,
      hasAccess: () => true,
      getToolPermission: () => 'full' as PermissionLevel,
    };
  }

  const hasAccess = (tool: keyof Pick<UserPermissions, 'files_manager' | 'mastermind' | 'ai_agents'>) => {
    if (!permissions) return false;
    return permissions[tool] !== 'none';
  };

  const getToolPermission = (tool: keyof Pick<UserPermissions, 'files_manager' | 'mastermind' | 'ai_agents'>) => {
    if (!permissions) return 'none' as PermissionLevel;
    return permissions[tool];
  };

  return {
    permissions,
    isLoading,
    hasAccess,
    getToolPermission,
  };
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: Partial<Omit<UserPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>> }) => {
      // Check if permissions record exists
      const { data: existing } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('user_permissions')
          .update(permissions)
          .eq('user_id', userId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('user_permissions')
          .insert({ user_id: userId, ...permissions })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
    },
  });
}

// Per-agent boolean access flags (PERM-01: enforced at the route level)
export type AgentAccessKey =
  | 'ai_can_access_nexus'
  | 'ai_can_access_promptor'
  | 'ai_can_access_osha'
  | 'ai_can_access_pixel'
  | 'ai_can_access_pulse'
  | 'ai_can_access_whisper'
  | 'ai_can_access_muse'
  | 'ai_can_access_atlas'
  | 'ai_can_access_omni';

// Tool-level permission keys (consumed by <ToolProtectedRoute />)
export type ToolPermissionKey = 'files_manager' | 'mastermind' | 'ai_agents';
