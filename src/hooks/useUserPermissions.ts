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
        taskforce: 'full' as PermissionLevel,
        ai_agents: 'full' as PermissionLevel,
        wishdom: 'full' as PermissionLevel,
        
        marketing_hub: 'full' as PermissionLevel,
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
        // Wishdom
        wishdom_can_access_main: true,
        wishdom_can_access_plushes: true,
        wishdom_can_access_figurines: true,
        wishdom_can_access_cards: true,
        wishdom_can_access_stocks: true,
        // MasterMind
        mastermind_can_create: true,
        mastermind_can_edit: true,
        mastermind_can_delete: true,
        mastermind_can_access_brain: true,
        mastermind_can_access_heart: true,
        // Taskforce
        taskforce_can_create: true,
        taskforce_can_edit: true,
        taskforce_can_delete: true,
        // Marketing Hub
        marketing_can_access_plan: true,
        marketing_can_access_operations: true,
      },
      isLoading: false,
      hasAccess: () => true,
      getToolPermission: () => 'full' as PermissionLevel,
    };
  }

  const hasAccess = (tool: keyof Pick<UserPermissions, 'files_manager' | 'mastermind' | 'taskforce' | 'ai_agents' | 'wishdom' | 'marketing_hub'>) => {
    if (!permissions) return false;
    return permissions[tool] !== 'none';
  };

  const getToolPermission = (tool: keyof Pick<UserPermissions, 'files_manager' | 'mastermind' | 'taskforce' | 'ai_agents' | 'wishdom' | 'marketing_hub'>) => {
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

// Map URL paths to permission keys
export type ToolPermissionKey = 'files_manager' | 'mastermind' | 'taskforce' | 'ai_agents' | 'wishdom' | 'marketing_hub';

export function getPermissionKeyFromPath(path: string): ToolPermissionKey | null {
  // Check for exact matches first, then prefix matches for sub-routes
  const exactMap: Record<string, ToolPermissionKey> = {
    '/files': 'files_manager',
    '/mastermind': 'mastermind',
    '/taskforce': 'taskforce',
    '/ai-agents': 'ai_agents',
    '/wishdom': 'wishdom',
    
    '/marketing': 'marketing_hub',
  };
  
  // Check exact match
  if (exactMap[path]) {
    return exactMap[path];
  }
  
  // Check prefix matches for sub-routes (e.g., /ai-agents/nexus -> ai_agents)
  for (const [prefix, key] of Object.entries(exactMap)) {
    if (path.startsWith(prefix + '/')) {
      return key;
    }
  }
  
  return null;
}
