"use client";

/**
 * PSShowBrief (stage 1): pick/create the show, write the brief (topic, pasted
 * source, or URL — Brain knowledge grounds the outline server-side), set the
 * target length, then generate the chapter outline.
 */

import { useState } from 'react';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { callOmniPodcast } from '@/lib/omniApi';
import { castFromJson, useCreateShow, usePodcastShows } from '@/hooks/omni/usePodcastShows';
import type { OmniPodcastBrief, OmniPodcastOutline } from '@/hooks/omni';

interface PSShowBriefProps {
  initialShowId: string | null;
  initialBrief: OmniPodcastBrief | null;
  onOutlined: (showId: string, brief: OmniPodcastBrief, cast: Record<string, string>, outline: OmniPodcastOutline) => void;
}

export function PSShowBrief({ initialShowId, initialBrief, onOutlined }: PSShowBriefProps) {
  const { data: shows = [], isLoading: loadingShows } = usePodcastShows();
  const createShow = useCreateShow();

  const [showId, setShowId] = useState(initialShowId ?? '');
  const [newShowName, setNewShowName] = useState('');
  const [brief, setBrief] = useState(initialBrief?.brief ?? '');
  const [sourceUrl, setSourceUrl] = useState(initialBrief?.source_url ?? '');
  const [pastedText, setPastedText] = useState(initialBrief?.pasted_text ?? '');
  const [minutes, setMinutes] = useState(initialBrief?.target_minutes ?? 30);
  const [generating, setGenerating] = useState(false);

  const show = shows.find((s) => s.id === showId) ?? null;
  const canGenerate = !!showId && (brief.trim() || pastedText.trim() || sourceUrl.trim()) && !generating;

  const handleCreateShow = async () => {
    const created = await createShow.mutateAsync({ name: newShowName });
    setShowId(created.id);
    setNewShowName('');
  };

  const generate = async () => {
    if (!show) return;
    setGenerating(true);
    try {
      const cast = castFromJson(show.default_cast);
      const personas = Object.entries(cast).map(([label, persona_id]) => ({ label, persona_id }));
      const res = await callOmniPodcast<OmniPodcastOutline>('podcast-script', {
        mode: 'outline',
        brief: brief.trim(),
        pasted_text: pastedText.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
        target_minutes: minutes,
        show_name: show.name,
        personas,
      });
      if (!res.chapters?.length) throw new Error('The outline came back empty. Refine the brief and try again.');
      onOutlined(
        show.id,
        { brief: brief.trim(), source_url: sourceUrl.trim() || undefined, pasted_text: pastedText.trim() || undefined, target_minutes: minutes },
        cast,
        res,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Outline generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="ps-show">Show</Label>
        <Select value={showId} onValueChange={setShowId} disabled={loadingShows}>
          <SelectTrigger id="ps-show" className="cursor-pointer">
            <SelectValue placeholder={loadingShows ? 'Loading shows…' : 'Pick a show'} />
          </SelectTrigger>
          <SelectContent>
            {shows.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newShowName}
            onChange={(e) => setNewShowName(e.target.value)}
            placeholder="…or create a new show"
            className="max-w-xs"
            aria-label="New show name"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!newShowName.trim() || createShow.isPending}
            onClick={() => void handleCreateShow()}
            className="cursor-pointer gap-1"
          >
            {createShow.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create
          </Button>
        </div>
        {show && Object.keys(castFromJson(show.default_cast)).length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            This show has no default cast yet — the script will use a single host. Set the cast in Cast &amp; Personas.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ps-brief">Episode brief</Label>
        <Textarea
          id="ps-brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          placeholder="What is this episode about? Angle, audience, must-cover points. Brain knowledge grounds the outline automatically."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ps-url">Source URL (optional)</Label>
          <Input id="ps-url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ps-minutes">Target length (minutes)</Label>
          <Input
            id="ps-minutes"
            type="number"
            min={5}
            max={90}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            onBlur={() => setMinutes((m) => Math.min(90, Math.max(5, Math.round(Number(m) || 30))))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ps-pasted">Pasted source material (optional)</Label>
        <Textarea
          id="ps-pasted"
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={4}
          placeholder="Paste an article, notes, or research to build the episode from."
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => void generate()}
          disabled={!canGenerate}
          className="cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? 'Planning the episode…' : 'Generate outline'}
        </Button>
      </div>
    </div>
  );
}
