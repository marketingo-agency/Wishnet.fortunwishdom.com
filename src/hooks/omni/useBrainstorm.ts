"use client";

/**
 * Brainstorming (Mode 6) hooks.
 * The session is an omni_runs row (mode 'brainstorming'); the conversation
 * persists in step_state.messages (capped, oldest trimmed). Attachment BYTES
 * only travel in the live edge call and are never stored; the messages keep
 * the file names for display.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callOmni } from '@/lib/omniApi';
import type { BrainstormReply, OmniChatMessage, OmniRun } from './types';

export const BRAINSTORM_MESSAGE_CAP = 80;
const CONTEXT_WINDOW = 16;

export interface PendingAttachment {
  name: string;
  mime: string;
  /** Raw base64 (no data: prefix). */
  data: string;
  previewUrl: string;
}

export function trimMessages(messages: OmniChatMessage[]): OmniChatMessage[] {
  return messages.length > BRAINSTORM_MESSAGE_CAP ? messages.slice(-BRAINSTORM_MESSAGE_CAP) : messages;
}

function contextWindow(messages: OmniChatMessage[]): { role: string; content: string }[] {
  return messages.slice(-CONTEXT_WINDOW).map((m) => ({ role: m.role, content: m.content }));
}

export function useCreateBrainstormRun() {
  const queryClient = useQueryClient();
  return useMutation<OmniRun, Error, { firstMessage: string }>({
    mutationFn: async ({ firstMessage }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('omni_runs')
        .insert({
          user_id: userData.user.id,
          mode: 'brainstorming',
          title: firstMessage.slice(0, 80),
          current_step: 1,
          step_state: {} as never,
        })
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Could not start the session');
      return data as OmniRun;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(['omni-run', run.id], run);
      queryClient.invalidateQueries({ queryKey: ['omni-runs'] });
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useBrainstormChat() {
  return useMutation<BrainstormReply, Error, {
    runId: string;
    messages: OmniChatMessage[];
    attachments: PendingAttachment[];
    provider: 'openai' | 'gemini';
    model: string;
  }>({
    mutationFn: (params) =>
      callOmni<BrainstormReply>('brainstorm-chat', {
        run_id: params.runId,
        messages: contextWindow(params.messages),
        attachments: params.attachments.map((a) => ({ mime: a.mime, data: a.data })),
        provider: params.provider,
        model: params.model,
      }),
    onError: (e) => toast.error(e.message),
  });
}

export function useLockBrainstormIdea() {
  return useMutation<{ title: string; objective: string }, Error, {
    runId: string;
    messages: OmniChatMessage[];
    provider: 'openai' | 'gemini';
    model: string;
  }>({
    mutationFn: (params) =>
      callOmni<{ title: string; objective: string }>('brainstorm-lock', {
        run_id: params.runId,
        messages: contextWindow(params.messages),
        provider: params.provider,
        model: params.model,
      }),
    onError: (e) => toast.error(e.message),
  });
}

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ATTACHMENT_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function readAttachment(file: File): Promise<PendingAttachment> {
  if (!ATTACHMENT_MIMES.has(file.type)) throw new Error(`${file.name}: only PNG, JPEG, and WebP are supported`);
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error(`${file.name} exceeds the 3MB limit`);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
  const base64 = dataUrl.split(',')[1] ?? '';
  return { name: file.name, mime: file.type, data: base64, previewUrl: dataUrl };
}
