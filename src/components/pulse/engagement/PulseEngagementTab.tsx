"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, RefreshCw, MessageSquare, Mail, Hand, ShieldCheck, Zap, MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePulseReplyQueue, useSyncEngagement } from '@/hooks/usePulseReplyQueue';
import { usePulseWorkspaceSettings, useUpdatePulseWorkspaceSettings } from '@/hooks/usePulseWorkspaceSettings';
import { PulseReplyCard } from './PulseReplyCard';
import type { PulseReplyMode, PulseReplySource } from '@/types/pulse';

const SOURCES: Array<{ value: PulseReplySource; label: string; icon: typeof MessageSquare }> = [
  { value: 'comment', label: 'Comments', icon: MessageSquare },
  { value: 'dm', label: 'Inbox', icon: Mail },
];

const MODES: Array<{ value: PulseReplyMode; label: string; icon: typeof Hand }> = [
  { value: 'manual', label: 'Manual', icon: Hand },
  { value: 'semi', label: 'Semi', icon: ShieldCheck },
  { value: 'auto', label: 'Auto', icon: Zap },
];

export function PulseEngagementTab() {
  const { isAdmin } = useAuth();
  const [source, setSource] = useState<PulseReplySource>('comment');
  const { data: items, isLoading } = usePulseReplyQueue(source);
  const sync = useSyncEngagement();
  const { data: settings } = usePulseWorkspaceSettings(isAdmin === true);
  const updateSettings = useUpdatePulseWorkspaceSettings();
  const mode = settings?.reply_mode ?? 'manual';

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Top controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border bg-muted/30 p-0.5" role="tablist" aria-label="Engagement source">
          {SOURCES.map((s) => {
            const active = source === s.value;
            return (
              <button key={s.value} type="button" role="tab" aria-selected={active} onClick={() => setSource(s.value)}
                className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500',
                  active ? 'bg-card text-pink-600 shadow-sm dark:text-pink-300' : 'text-muted-foreground hover:text-foreground')}>
                <s.icon className="h-4 w-4" /> {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Reply mode switch */}
          {isAdmin && (
            <div className="inline-flex rounded-lg border p-0.5" role="radiogroup" aria-label="Reply mode">
              {MODES.map((m) => {
                const active = mode === m.value;
                return (
                  <button key={m.value} type="button" role="radio" aria-checked={active}
                    onClick={() => updateSettings.mutate({ reply_mode: m.value })}
                    title={`${m.label} mode`}
                    className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer',
                      active ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300' : 'text-muted-foreground hover:bg-muted')}>
                    <m.icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending} className="h-9 gap-1.5">
            {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : items && items.length > 0 ? (
        <div className="space-y-3">{items.map((item) => <PulseReplyCard key={item.id} item={item} />)}</div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted"><MessagesSquare className="h-6 w-6 text-muted-foreground" /></div>
          <div>
            <p className="text-sm font-medium">No {source === 'comment' ? 'comments' : 'messages'} yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">Connect a Meta page in Settings → Integrations, then hit Sync to pull in {source === 'comment' ? 'comments' : 'DMs'}.</p>
          </div>
        </div>
      )}
    </div>
  );
}
