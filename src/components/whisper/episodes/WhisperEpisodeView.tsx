"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AudioLines, AlertTriangle, Clock, FileText, Sparkles, Download, Copy, Image as ImageIcon, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWhisperEpisode } from '@/hooks/useWhisperEpisodes';
import { useRenderEpisode, useWhisperAudioUrl } from '@/hooks/useRenderEpisode';
import { useGenerateShowNotes } from '@/hooks/useGenerateShowNotes';
import { useGenerateCover } from '@/hooks/useGenerateCover';
import { useCreatePulseDraft } from '@/hooks/usePulseDrafts';
import { EPISODE_STATUS_META, formatDuration } from '@/components/whisper/whisperStatus';

interface WhisperEpisodeViewProps {
  episodeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhisperEpisodeView({ episodeId, open, onOpenChange }: WhisperEpisodeViewProps) {
  const { data: episode, isLoading } = useWhisperEpisode(episodeId, open);
  const render = useRenderEpisode();
  const showNotes = useGenerateShowNotes();
  const cover = useGenerateCover();
  const pulse = useCreatePulseDraft();
  const { data: audioUrl } = useWhisperAudioUrl(episode?.audio_path ?? null);
  const { data: coverUrl } = useWhisperAudioUrl(episode?.cover_path ?? null);

  const missingVoices = !!episode && episode.script.some((s) => s.text.trim() && !s.voice_id);
  const status = episode ? EPISODE_STATUS_META[episode.status] : null;
  const busy = render.isPending || episode?.status === 'rendering';

  const copyTranscript = () => {
    if (!episode) return;
    const t = episode.script.map((s) => `${s.speaker}: ${s.text}`).join('\n\n');
    navigator.clipboard.writeText(t).then(() => toast.success('Transcript copied')).catch(() => toast.error('Copy failed'));
  };

  const sendToPulse = () => {
    if (!episode) return;
    const caption = `${episode.title ?? 'New episode'}${episode.show_notes?.description ? `\n\n${episode.show_notes.description}` : ''}`;
    pulse.mutate({ caption, platforms: [], post_type: 'text', status: 'draft', generated_by: 'whisper' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <AudioLines className="h-4 w-4 text-indigo-500" />
            {episode?.title ?? 'Episode'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs">
            {status && <Badge className={cn('border-0 px-2 py-0.5 text-[10px] font-semibold', status.badge)}>{status.label}</Badge>}
            <span className="capitalize">{episode?.format?.replace('_', '-')}</span>
            {episode?.duration ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(episode.duration)}</span> : null}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !episode ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="max-h-[76vh]">
            <div className="flex flex-col gap-3 px-6 pb-6">
              {/* Audio + render */}
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                {episode.audio_path && episode.status !== 'rendering' && audioUrl && (
                  <audio controls src={audioUrl} className="w-full">Your browser does not support audio playback.</audio>
                )}
                {missingVoices && <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Assign a voice to every speaker (in the Studio) before rendering.</p>}
                {episode.status === 'failed' && episode.error && <p className="flex items-center gap-1.5 text-[11px] text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> {episode.error}</p>}
                <Button size="sm" onClick={() => episodeId && render.mutate(episodeId)} disabled={busy || missingVoices} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
                  {episode.audio_path ? 'Re-render audio' : 'Render audio'}
                </Button>
                {busy && <p className="text-[11px] text-muted-foreground">Synthesizing in the background — this view updates automatically when it&apos;s ready.</p>}
              </div>

              {/* Distribution */}
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><Share2 className="h-3.5 w-3.5" /> Distribution</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline" size="sm" disabled={!audioUrl}
                    onClick={() => { if (audioUrl) { const a = document.createElement('a'); a.href = audioUrl; a.download = `${episode.title ?? 'episode'}.mp3`; a.click(); } }}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Download MP3
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyTranscript} className="h-8 gap-1.5 text-xs"><Copy className="h-3.5 w-3.5" /> Copy transcript</Button>
                  <Button variant="outline" size="sm" onClick={() => episodeId && cover.mutate(episodeId)} disabled={cover.isPending} className="h-8 gap-1.5 text-xs">
                    {cover.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />} {episode.cover_path ? 'Regenerate cover' : 'Generate cover'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={sendToPulse} disabled={pulse.isPending} className="h-8 gap-1.5 text-xs">
                    {pulse.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />} Send to Pulse
                  </Button>
                </div>
                {coverUrl && <img src={coverUrl} alt="Episode cover" className="mt-1 h-32 w-32 rounded-lg object-cover" />}
              </div>

              {/* Show notes */}
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><FileText className="h-3.5 w-3.5" /> Show notes</p>
                  <Button variant="ghost" size="sm" onClick={() => episodeId && showNotes.mutate(episodeId)} disabled={showNotes.isPending} className="h-7 gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-300">
                    {showNotes.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {episode.show_notes?.description ? 'Regenerate' : 'Generate'}
                  </Button>
                </div>
                {episode.show_notes?.description ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{episode.show_notes.description}</p>
                    {episode.show_notes.chapters && episode.show_notes.chapters.length > 0 && (
                      <ul className="space-y-0.5">
                        {episode.show_notes.chapters.map((c, i) => (
                          <li key={i} className="flex gap-2 text-[11px]"><span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-300">{formatDuration(c.time)}</span><span>{c.label}</span></li>
                        ))}
                      </ul>
                    )}
                    {episode.show_notes.tags && episode.show_notes.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">{episode.show_notes.tags.map((t) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Generate a title, description, chapters, and tags from the script.</p>
                )}
              </div>

              {/* Script */}
              <div className="space-y-2 pr-1">
                {episode.script.map((seg, i) => (
                  <div key={i} className="rounded-lg border bg-card p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{seg.speaker}{!seg.voice_id && <span className="ml-1 text-amber-500">· no voice</span>}</p>
                    <p className="mt-0.5 text-sm">{seg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
