import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrandingSettings {
  id: string;
  login_logo_url: string | null;
  main_logo_url: string | null;
  mini_logo_url: string | null;
  favicon_url: string | null;
  app_title: string;
}

export function useBranding() {
  return useQuery({
    queryKey: ['branding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branding_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data as BrandingSettings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useUpdateBranding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<Omit<BrandingSettings, 'id'>>) => {
      // First get the current branding record to get its ID
      const { data: current } = await supabase
        .from('branding_settings')
        .select('id')
        .single();
      
      if (!current?.id) throw new Error('Branding settings not found');
      
      const { data, error } = await supabase
        .from('branding_settings')
        .update(updates)
        .eq('id', current.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding'] });
    },
  });
}
