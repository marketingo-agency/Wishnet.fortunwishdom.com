/**
 * Version History Hooks
 * File versioning operations
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FileVersion } from './types';

export function useFileVersions(fileId: string) {
  return useQuery({
    queryKey: ['file-versions', fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_versions')
        .select('*')
        .eq('file_id', fileId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as FileVersion[];
    },
    enabled: !!fileId,
  });
}
