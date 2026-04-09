/**
 * useUsers Hooks
 * User data fetching and mutations using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UserWithRole, AppRole } from '@/types/user';

interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  role: AppRole;
}

// Query key factory
const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
};

// Fetch users with roles
async function fetchUsersWithRoles(): Promise<UserWithRole[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');

  if (profilesError) {
    throw new Error('Failed to fetch users');
  }

  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*');

  if (rolesError) {
    throw new Error('Failed to fetch roles');
  }

  return profiles.map((profile) => {
    const userRole = roles.find((r) => r.user_id === profile.id);
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: userRole?.role || 'agent',
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  });
}

/**
 * Query hook for fetching all users with their roles
 */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: fetchUsersWithRoles,
  });
}

/**
 * Mutation hook for creating new users
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          role: data.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create user', { 
        description: error instanceof Error ? error.message : 'Unknown error' 
      });
    },
  });
}

/**
 * Mutation hook for deleting users
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete',
          userId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete user', { 
        description: error instanceof Error ? error.message : 'Unknown error' 
      });
    },
  });
}

// Re-export types for convenience
export type { CreateUserData };
