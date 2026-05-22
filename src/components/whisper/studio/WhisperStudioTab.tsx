"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Save, Plus, X, ChevronUp, ChevronDown, FileText, Link2, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhisperSettings } from '@/hooks/useWhisperSettings';
import { useWhisperShows } from '@/hooks/useWhisperShows';
import { useGenerateScript } from '@/hooks/useGenerateScript';
import { useCreateWhisperEpisode } from '@/hooks/useWhisperEpisodes';
import { WhisperCastPanel } from './WhisperCastPanel';
import { WhisperEpisodeView } from '@/components/whisper/episodes/WhisperEpisodeView';
import type { WhisperFormat, WhisperScriptSegment, WhisperSourceRef } from '@/types/whisper';

const FORMATS: Array<{ value: WhisperFormat; label: string }> = [
  { value: 'two_host', label: 'Two-host conversation' },
  { value: 'solo', label: 'Solo narration' },
  { value: 'interview', label: 'Interview' },
  { value: 'explainer', label: 'Explainer' },
];
const LENGTHS = [
  { value: 'short', label: 'Short (2-3 min)' },
  { value: 'medium', label: 'Medium (5-8 min)' },
  { value: 'long', label: 'Long (12-18 min)' },
] as const;
const SOURCES = [
  { value: 'topic', label: 'Topic', icon: Type },
  { value: 'paste', label: 'Paste text', icon: FileText },
  { value: 'url', label: 'URL', icon: Link2 },
] as const;

type SourceMode = (typeof SOURCES)[number]['value'];

export function WhisperStudioTab() {
  const { data: settings } = useWhisperSettings();
  const { data: shows } = useWhisperShows();
  const generate = useGenerateScript();
  const createEpisode = useCreateWhisperEpisode();

  const [format, setFormat] = useState<WhisperFormat>('two_host');
  const [language, setLanguage] = useState('en');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [tone, setTone] = useState('');
  const [sourceMode, setSourceMode] = useState<SourceMode>('topic');
  const [topic, setTopic] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [url, setUrl] = useState('');

  const [title, setTitle] = useState('');
  const [segments, setSegments] = useState<WhisperScriptSegment[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [showId, setShowId] = useState<string>('none');

  const selectedShow = shows?.find((s) => s.id === showId);

  useEffect(() => {
    if (!settings) return;
    setFormat(settings.default_format ?? 'two_host');
    setLanguage(settings.default_language ?? 'en');
  }, [settings]);

  const handleGenerate = async () => {
    const res = await generate.mutateAsync({
      format, language, length,
      tone: tone.trim() || undefined,
      topic: sourceMode === 'topic' ? topic.trim() || undefined : undefined,
      sourceText: sourceMode === 'paste' ? pasteText.trim() || undefined : undefined,
      sourceUrl: sourceMode === 'url' ? url.trim() || undefined : undefined,
    }).catch(() => null);
    if (res) {
      setTitle(res.title);
      // Inherit the show's default cast where speaker names match.
      setSegments(res.segments.map((s) => ({ speaker: s.speaker, text: s.text, voice_id: selectedShow?.default_cast[s.speaker] ?? null })));
    }
  };

  const updateSeg = (i: number, patch: Partial<WhisperScriptSegment>) =>
    setSegments((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeSeg = (i: number) => setSegments((prev) => prev.filter((_, idx) => idx !== i));
  const moveSeg = (i: number, dir: -1 | 1) => setSegments((prev) => {
    const next = [...prev];
    const j = i + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const addSeg = () => setSegments((prev) => [...prev, { speaker: prev[prev.length - 1]?.speaker ?? 'Host', text: '', voice_id: null }]);
  const assignVoice = (speaker: string, voiceId: string) =>
    setSegments((prev) => prev.map((s) => (s.speaker === speaker ? { ...s, voice_id: voiceId } : s)));

  const sourceRefs = (): WhisperSourceRef[] => {
    if (sourceMode === 'url' && url.trim()) return [{ type: 'url', ref: url.trim() }];
    if (sourceMode === 'paste' && pasteText.trim()) return [{ type: 'text', ref: pasteText.trim().slice(0, 200), label: 'pasted' }];
    if (topic.trim()) return [{ type: 'text', ref: topic.trim(), label: 'topic' }];
    return [];
  };

  const handleSave = () => {
    createEpisode.mutate(
      { title: title.trim() || 'Untitled episode', status: 'scripted', format, language, show_id: showId !== 'none' ? showId : null, source_refs: sourceRefs(), script: segments, generated_by: 'whisper' },
      { onSuccess: (ep) => { setViewId(ep.id); setSegments([]); setTitle(''); } },
    );
  };

  const canGenerate = (sourceMode === 'topic' && topic.trim()) || (sourceMode === 'paste' && pasteText.trim()) || (sourceMode === 'url' && url.trim());

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      {/* 1. Source & format */}
      <Card className="border shadow-sm">
        <CardHeader><CardTitle className="text-base">1 · Source &amp; format</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {shows && shows.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Show (optional)</Label>
              <Select
                value={showId}
                onValueChange={(v) => { setShowId(v); const sh = shows.find((s) => s.id === v); if (sh) setLanguage(sh.language); }}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">No show (standalone)</SelectItem>
                  {shows.map((s) => <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as WhisperFormat)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{FORMATS.map((f) => <SelectItem key={f.value} value={f.value} className="text-sm">{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Length</Label>
              <Select value={length} onValueChange={(v) => setLength(v as typeof length)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{LENGTHS.map((l) => <SelectItem key={l.value} value={l.value} className="text-sm">{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-lang" className="text-xs font-medium">Language</Label>
              <Input id="studio-lang" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="studio-tone" className="text-xs font-medium">Tone (optional)</Label>
            <Input id="studio-tone" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. playful and curious" className="h-9 text-sm" />
          </div>

          {/* Source mode */}
          <div className="inline-flex rounded-lg border bg-muted/30 p-0.5">
            {SOURCES.map((s) => {
              const active = sourceMode === s.value;
              return (
                <button key={s.value} type="button" onClick={() => setSourceMode(s.value)}
                  className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    active ? 'bg-card text-indigo-600 shadow-sm dark:text-indigo-300' : 'text-muted-foreground hover:text-foreground')}>
                  <s.icon className="h-4 w-4" /> {s.label}
                </button>
              );
            })}
          </div>

          {sourceMode === 'topic' && <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What should this episode be about?" className="min-h-[80px] text-sm" />}
          {sourceMode === 'paste' && <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste an article, notes, or any source material…" className="min-h-[120px] text-sm" />}
          {sourceMode === 'url' && <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (https only)" className="h-9 text-sm" />}

          <div className="flex justify-end">
            <Button size="sm" onClick={handleGenerate} disabled={!canGenerate || generate.isPending} className="gap-2">
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {segments.length > 0 ? 'Regenerate script' : 'Generate script'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Script */}
      {segments.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">2 · Script</CardTitle>
            <Button size="sm" onClick={handleSave} disabled={createEpisode.isPending} className="gap-1.5">
              {createEpisode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as draft
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="studio-title" className="text-xs font-medium">Episode title</Label>
              <Input id="studio-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" />
            </div>
            {segments.map((seg, i) => (
              <div key={i} className="flex gap-2 rounded-lg border bg-muted/20 p-2">
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => moveSeg(i, -1)} disabled={i === 0} aria-label="Move up" className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => moveSeg(i, 1)} disabled={i === segments.length - 1} aria-label="Move down" className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Input value={seg.speaker} onChange={(e) => updateSeg(i, { speaker: e.target.value })} className="h-7 w-40 text-xs font-medium" aria-label="Speaker" />
                  <Textarea value={seg.text} onChange={(e) => updateSeg(i, { text: e.target.value })} className="min-h-[56px] text-sm" aria-label="Line" />
                </div>
                <button type="button" onClick={() => removeSeg(i)} aria-label="Remove line" className="self-start rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addSeg} className="h-8 gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Add line</Button>

            <div className="border-t pt-3">
              <WhisperCastPanel segments={segments} onAssign={assignVoice} />
            </div>
            <p className="text-[11px] text-muted-foreground">Assign a voice to each speaker, then <strong>Save as draft</strong>. Produce the audio from <strong>Episodes</strong> (coming next).</p>
          </CardContent>
        </Card>
      )}

      <WhisperEpisodeView episodeId={viewId} open={viewId !== null} onOpenChange={(o) => !o && setViewId(null)} />
    </div>
  );
}
