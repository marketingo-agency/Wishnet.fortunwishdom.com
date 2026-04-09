/**
 * useFilesCount Hook
 * Lightweight count-only query for dashboard stats.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFilesCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['files-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_trashed', false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
