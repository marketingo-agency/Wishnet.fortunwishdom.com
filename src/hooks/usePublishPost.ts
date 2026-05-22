/**
 * usePublishPost — publish or schedule a post through upload-post (pulse-api proxy).
 * Multipart upload happens server-side; media is passed as public URLs.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callPulseApi } from '@/lib/pulseApi';
import type { PulsePostType } from '@/types/pulse';

export interface PublishPostInput {
  profile: string;
  platforms: string[];
  postType: PulsePostType;
  title?: string;
  description?: string;
  mediaUrls?: string[];
  scheduledDate?: string;
  timezone?: string;
}

export interface PublishPostResult {
  success: boolean;
  job_id?: string;
  request_id?: string;
  scheduled_date?: string;
}

export function usePublishPost() {
  return useMutation({
    mutationFn: (input: PublishPostInput) => callPulseApi<PublishPostResult>('publish-post', { ...input }),
    onError: (error) => {
      toast.error('Publish failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
