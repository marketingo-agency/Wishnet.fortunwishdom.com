/**
 * Storage Usage Hook
 * Tracks storage consumption across all buckets
 */

import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';

export function useStorageUsage() {
  return useQuery({
    queryKey: ['storage-usage'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(edgeFunctionUrl('storage-stats'), { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch storage stats');
      }
      
      const data = await response.json();
      return { 
        used: data.used || 0, 
        total: data.total || 1073741824,
        buckets: data.buckets || null,
      };
    },
    staleTime: 30000,
  });
}
