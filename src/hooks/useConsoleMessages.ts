import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConsoleMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isImage?: boolean;
  imageUrl?: string;
  provider?: string;
  model?: string;
  mode?: string;
  timestamp: Date;
}

export function useConsoleMessages() {
  return useQuery({
    queryKey: ['console-messages'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('console_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      .limit(100);

      if (error) throw error;
      
      return (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        isImage: msg.is_image || false,
        imageUrl: msg.image_url || undefined,
        provider: msg.provider || undefined,
        model: msg.model || undefined,
        mode: msg.mode || undefined,
      })) as ConsoleMessage[];
    },
  });
}

export function useDeleteSelectedMessages() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('console_messages')
        .delete()
        .eq('user_id', user.id)
        .in('id', messageIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console-messages'] });
    },
  });
}

export function useSaveMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (message: {
      role: 'user' | 'assistant';
      content: string;
      isImage?: boolean;
      imageUrl?: string;
      provider?: string;
      model?: string;
      mode?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('console_messages')
        .insert({
          user_id: user.id,
          role: message.role,
          content: message.content,
          is_image: message.isImage || false,
          image_url: message.imageUrl,
          provider: message.provider,
          model: message.model,
          mode: message.mode,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console-messages'] });
    },
  });
}

export function useClearMessages() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('console_messages')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console-messages'] });
    },
  });
}
