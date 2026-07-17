"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Library, Clapperboard, AudioLines, Radio, Plug, ArrowRight, Mic, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhisperEpisodes } from '@/hooks/useWhisperEpisodes';
import { useWhisperShows } from '@/hooks/useWhisperShows';
import { EPISODE_STATUS_META, formatDuration } from '@/components/whisper/whisperStatus';
import { WhisperEpisodeView } from '@/components/whisper/episodes/WhisperEpisodeView';

export function WhisperOverviewTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data: episodes } = useWhisperEpisodes({});
  const { data: shows } = useWhisperShows();
  const [openId, setOpenId] = useState<string | null>(null);

  const all = episodes ?? [];
  const inProgress = all.filter((e) => e.status === 'draft' || e.status === 'scripted').length;
  const rendered = all.filter((e) => e.status === 'rendered' || e.status === 'published').length;
  const recent = all.slice(0, 5);

  const stats = [
    { label: 'Episodes', value: all.length, icon: Library, tab: 'episodes', accent: 'text-indigo-500' },
    { label: 'In progress', value: inProgress, icon: Clapperboard, tab: 'episodes', accent: 'text-sky-500' },
    { label: 'Rendered', value: rendered, icon: AudioLines, tab: 'episodes', accent: 'text-emerald-500' },
    { label: 'Shows', value: shows?.length ?? 0, icon: Radio, tab: 'shows', accent: 'text-violet-500' },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button key={s.label} type="button" onClick={() => onNavigate(s.tab)}
            className="flex flex-col gap-1 rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <s.icon className={cn('h-4 w-4', s.accent)} />
            <span className="text-2xl font-bold tabular-nums">{s.value}</span>
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Recent episodes */}
        <Card className="border shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Recent episodes</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => onNavigate('episodes')}>Library <ArrowRight className="h-3 w-3" /></Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No episodes yet. Create one in the Studio.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((ep) => {
                  const meta = EPISODE_STATUS_META[ep.status];
                  return (
                    <button key={ep.id} type="button" onClick={() => setOpenId(ep.id)} className="flex w-full items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-2 text-left transition-colors hover:bg-muted/60">
                      <Mic className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      <span className="min-w-0 flex-1 truncate text-xs">{ep.title || 'Untitled episode'}</span>
                      {ep.duration ? <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{formatDuration(ep.duration)}</span> : null}
                      <Badge className={cn('shrink-0 border-0 px-1.5 py-0.5 text-[9px] font-semibold', meta.badge)}>{meta.label}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status / quick actions */}
        <Card className="border shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Studio floor</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => onNavigate('settings')}>Settings <ArrowRight className="h-3 w-3" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-2">
              <span className="flex items-center gap-1.5 text-xs"><Plug className="h-3.5 w-3.5" /> Voices via fal.ai</span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">app fal key</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onNavigate('studio')} className="gap-1.5"><Clapperboard className="h-4 w-4" /> New episode</Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate('shows')} className="gap-1.5"><Radio className="h-4 w-4" /> New show</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <WhisperEpisodeView episodeId={openId} open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
