/**
 * useUploadAvatar — uploads an image to the `profile-pictures` bucket
 * and updates the user's profile.avatar_url with the public URL.
 *
 * Unlike useUploadFile (which targets the private `files` bucket and creates
 * a file record), this hook writes directly to the public profile-pictures
 * bucket so avatars are always accessible without signed URLs.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeFileName } from '@/lib/utils';
import { toast } from 'sonner';

const BUCKET = 'profile-pictures';

export function useUploadAvatar() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');

      const timestamp = Date.now();
      const sanitized = sanitizeFileName(file.name);
      const storagePath = `${user.id}/${timestamp}_${sanitized}`;

      // Upload to profile-pictures bucket
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL (bucket is public)
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
      toast.success('Avatar updated');
    },
    onError: (error) => {
      toast.error('Failed to upload avatar', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
