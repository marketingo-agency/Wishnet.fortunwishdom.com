"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, MessagesSquare, CheckCircle2, Plug, PenSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePulseDrafts } from '@/hooks/usePulseDrafts';
import { usePulseReplyQueue } from '@/hooks/usePulseReplyQueue';
import { usePulseConnectionsStatus } from '@/hooks/usePulseConnections';
import { useProviderKeyStatus, hasProviderKey } from '@/hooks/useProviderKeyStatus';
import { platformLabel, platformColor, formatDate } from '@/components/settings/pulsePlatforms';

export function PulseOverviewTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { isAdmin } = useAuth();
  const { data: scheduled } = usePulseDrafts({ status: 'scheduled' });
  const { data: published } = usePulseDrafts({ status: 'published' });
  const { data: comments } = usePulseReplyQueue('comment');
  const { data: dms } = usePulseReplyQueue('dm');
  const { data: connStatus } = usePulseConnectionsStatus(isAdmin === true);
  const { data: keyStatus } = useProviderKeyStatus();

  const pendingReplies =
    (comments?.filter((c) => c.status === 'pending').length ?? 0) +
    (dms?.filter((d) => d.status === 'pending').length ?? 0);
  const upcoming = (scheduled ?? [])
    .filter((d) => d.scheduled_date)
    .sort((a, b) => ((a.scheduled_date ?? '') < (b.scheduled_date ?? '') ? -1 : 1))
    .slice(0, 5);

  const connections = [
    { label: 'upload-post', ok: hasProviderKey(keyStatus?.pulse ?? 'none') },
    { label: 'Meta', ok: connStatus?.meta?.configured ?? false },
    { label: 'ElevenLabs', ok: connStatus?.elevenlabs?.status === 'connected' },
    { label: 'Canva', ok: connStatus?.canva?.configured ?? false },
  ];
  const healthy = connections.filter((c) => c.ok).length;

  const stats = [
    { label: 'Scheduled', value: scheduled?.length ?? 0, icon: CalendarClock, tab: 'calendar', accent: 'text-sky-500' },
    { label: 'Pending replies', value: pendingReplies, icon: MessagesSquare, tab: 'engagement', accent: 'text-pink-500' },
    { label: 'Published', value: published?.length ?? 0, icon: CheckCircle2, tab: 'posts', accent: 'text-emerald-500' },
    { label: 'Connections', value: `${healthy}/${connections.length}`, icon: Plug, tab: 'settings', accent: 'text-violet-500' },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onNavigate(s.tab)}
            className="flex flex-col gap-1 rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <s.icon className={cn('h-4 w-4', s.accent)} />
            <span className="text-2xl font-bold tabular-nums">{s.value}</span>
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Upcoming */}
        <Card className="border shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Upcoming posts</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => onNavigate('calendar')}>
              Calendar <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Nothing scheduled. Create a post to get started.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-2">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                    <span className="min-w-0 flex-1 truncate text-xs">{d.caption || d.title || 'Untitled'}</span>
                    <div className="flex shrink-0 gap-0.5">
                      {d.platforms.slice(0, 3).map((p) => (
                        <span key={p} className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-semibold text-white', platformColor(p))}>{platformLabel(p).slice(0, 2)}</span>
                      ))}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(d.scheduled_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection health */}
        <Card className="border shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Connection health</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => onNavigate('settings')}>
              Settings <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {connections.map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-2">
                <span className="text-xs">{c.label}</span>
                <span className={cn('flex items-center gap-1.5 text-[11px]', c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                  <span className={cn('h-2 w-2 rounded-full', c.ok ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                  {c.ok ? 'Ready' : 'Not set'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onNavigate('create')} className="gap-1.5"><PenSquare className="h-4 w-4" /> New post</Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate('engagement')} className="gap-1.5"><MessagesSquare className="h-4 w-4" /> Open inbox</Button>
      </div>
    </div>
  );
}
