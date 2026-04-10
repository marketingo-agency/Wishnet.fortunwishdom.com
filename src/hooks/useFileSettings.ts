import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type { FileSettings } from '@/types/files';
import type { FileSettings } from '@/types/files';

export function useFileSettings() {
  return useQuery({
    queryKey: ['file-settings'],
    queryFn: async (): Promise<FileSettings | null> => {
      const { data, error } = await supabase
        .from('file_settings')
        .select('*')
        .single();

      if (error) {
        // If no row exists, return defaults
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as FileSettings;
    },
  });
}

export function useUpdateFileSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<FileSettings, 'id' | 'created_at' | 'updated_at'>>) => {
      // Call the edge function which updates both Supabase buckets AND the database
      const { data, error } = await supabase.functions.invoke('update-bucket-settings', {
        body: updates,
      });

      // Edge function returns error details in the data when status is 400
      if (error) throw error;
      if (data?.error) throw data;
      
      return data as {
        success: boolean;
        settings: FileSettings;
        actual_limit_mb: number;
        was_limited: boolean;
        message: string;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['file-settings'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
      toast.success('File settings synced with Supabase Storage');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- edge function error shape includes custom fields (error, instructions)
    onError: (error: any) => {
      // Check if it's a global limit error from the edge function
      if (error?.error === 'global_limit_exceeded') {
        toast.error(error.message, {
          description: error.instructions,
          duration: 10000,
        });
      } else {
        toast.error('Failed to update settings: ' + (error?.message || error?.error || 'Unknown error'));
      }
    },
  });
}

// Hook to get storage stats with dynamic quota and real bucket limits
export function useStorageStats() {
  return useQuery({
    queryKey: ['storage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('storage-stats');
      if (error) throw error;
      return data as {
        used: number;
        total: number;
        buckets: {
          files: { count: number; size: number };
          'brain-documents': { count: number; size: number };
        };
        bucket_limits: {
          files: { file_size_limit: number | null; allowed_mime_types: string[] | null };
          'brain-documents': { file_size_limit: number | null; allowed_mime_types: string[] | null };
        };
      };
    },
  });
}
