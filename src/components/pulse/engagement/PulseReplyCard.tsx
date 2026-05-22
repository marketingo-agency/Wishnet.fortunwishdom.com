"use client";

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { platformLabel, platformColor, initials, formatDate } from '@/components/settings/pulsePlatforms';
import { useGenerateReply, useSendReply, useUpdateReplyStatus } from '@/hooks/usePulseReplyQueue';
import type { PulseReplyItem } from '@/types/pulse';

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  neutral: 'bg-muted text-muted-foreground',
  negative: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export function PulseReplyCard({ item }: { item: PulseReplyItem }) {
  const [draft, setDraft] = useState(item.ai_draft ?? '');
  const generate = useGenerateReply();
  const send = useSendReply();
  const updateStatus = useUpdateReplyStatus();

  const sent = item.status === 'sent';
  const skipped = item.status === 'skipped';
  const busy = generate.isPending || send.isPending || updateStatus.isPending;

  const handleGenerate = async () => {
    const res = await generate.mutateAsync(item.id).catch(() => null);
    if (res?.ai_draft) setDraft(res.ai_draft);
  };

  return (
    <div className={cn('rounded-xl border bg-card p-3.5', (sent || skipped) && 'opacity-70')}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{initials(item.author_handle ?? '?')}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">@{item.author_handle ?? 'user'}</p>
            <p className="text-[10px] text-muted-foreground">{formatDate(item.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {item.sentiment && <Badge className={cn('border-0 px-1.5 py-0.5 text-[9px] capitalize', SENTIMENT_BADGE[item.sentiment])}>{item.sentiment}</Badge>}
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold text-white', platformColor(item.platform))}>{platformLabel(item.platform)}</span>
        </div>
      </div>

      {/* Incoming */}
      <p className="mt-2 rounded-lg bg-muted/50 p-2 text-sm">{item.incoming_text ?? <span className="text-muted-foreground">No text</span>}</p>

      {sent ? (
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">Replied{item.sent_at ? ` · ${formatDate(item.sent_at)}` : ''}</p>
      ) : skipped ? (
        <p className="mt-2 text-xs text-muted-foreground">Skipped</p>
      ) : (
        <>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">AI reply{item.model_used ? ` · ${item.model_used}` : ''}</span>
              <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={busy} className="h-6 gap-1 text-[11px] text-violet-600 dark:text-violet-400">
                {generate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {draft ? 'Regenerate' : 'Generate'}
              </Button>
            </div>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Generate or write a reply…" className="min-h-[64px] text-sm" />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: item.id, status: 'skipped' })} disabled={busy} className="h-8 gap-1.5 text-xs text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Skip
            </Button>
            <Button size="sm" onClick={() => send.mutate({ queueId: item.id, replyText: draft })} disabled={busy || !draft.trim()} className="h-8 gap-1.5 text-xs">
              {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send reply
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
