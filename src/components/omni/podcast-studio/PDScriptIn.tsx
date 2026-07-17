"use client";

/**
 * PDScriptIn (stage 1): where the script comes from — a seeded scenario
 * handoff, a completed Podcast Scenario run imported here, or a pasted
 * "SPEAKER: line" script parsed into a single chapter.
 */

import { useState } from 'react';
import { FileText, Import, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOmniRun } from '@/hooks/omni';
import { usePodcastShows } from '@/hooks/omni/usePodcastShows';
import { VIDEO_SCHEMA_VERSION } from '../stepRegistry';
import { parsePastedScript } from '@/lib/omni/podcastScript';
import type { OmniImagesState } from '@/hooks/omni';

interface PDScriptInProps {
  state: OmniImagesState;
  runId: string | null;
  onRunCreated: (runId: string, seeded: OmniImagesState) => void;
  onReady: (patch: Partial<OmniImagesState>) => void;
}

export function PDScriptIn({ state, runId, onRunCreated, onReady }: PDScriptInProps) {
  const { data: shows = [] } = usePodcastShows();
  const createRun = useCreateOmniRun();
  const [showId, setShowId] = useState(state.podcast_show_id ?? '');
  const [pasted, setPasted] = useState('');
  const [working, setWorking] = useState(false);

  const seeded = !!state.podcast_outline && !!state.podcast_script;

  const scenarioRuns = useQuery({
    queryKey: ['podcast-scenario-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omni_runs')
        .select('id, title, step_state, created_at')
        .eq('mode', 'podcast_scenario')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as { id: string; title: string | null; step_state: unknown; created_at: string }[];
    },
    enabled: !seeded,
  });

  const proceed = async (patch: Partial<OmniImagesState>, title: string) => {
    setWorking(true);
    try {
      if (!runId) {
        const created = await createRun.mutateAsync({
          mode: 'omni_podcast',
          title: title.slice(0, 80),
          current_step: 2,
          step_state: { ...patch, video_schema_version: VIDEO_SCHEMA_VERSION, max_step_reached: 2 },
        });
        onRunCreated(created.id, (created.step_state ?? {}) as OmniImagesState);
        return;
      }
      onReady(patch);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start the Studio run');
    } finally {
      setWorking(false);
    }
  };

  const importScenario = async (scenarioRunId: string) => {
    const row = scenarioRuns.data?.find((r) => r.id === scenarioRunId);
    if (!row) return;
    const s = (row.step_state ?? {}) as OmniImagesState;
    if (!s.podcast_outline || !s.podcast_script) {
      toast.error('That scenario has no finished script.');
      return;
    }
    await proceed({
      podcast_show_id: s.podcast_show_id,
      podcast_brief: s.podcast_brief,
      podcast_outline: s.podcast_outline,
      podcast_script: s.podcast_script,
      podcast_cast: s.podcast_cast,
      podcast_source_run_id: row.id,
    }, s.podcast_outline.title);
  };

  const applyPastedScript = async () => {
    if (!showId) {
      toast.error('Pick a show first.');
      return;
    }
    const segments = parsePastedScript(pasted);
    if (segments.length === 0) {
      toast.error('No script lines found. Use "SPEAKER: line" format.');
      return;
    }
    const words = segments.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
    const minutes = Math.max(2, Math.round(words / 150));
    await proceed({
      podcast_show_id: showId,
      podcast_outline: {
        title: 'Pasted episode',
        chapters: [{ idx: 1, title: 'Full episode', summary: 'Provided script.', minutes }],
      },
      podcast_script: { '1': segments },
    }, 'Pasted episode');
  };

  if (seeded) {
    const chapters = state.podcast_outline!.chapters.length;
    const segments = Object.values(state.podcast_script!).flat().length;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-rose-400" />
            <h2 className="text-sm font-semibold">{state.podcast_outline!.title}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {chapters} chapters · {segments} script lines
            {state.podcast_source_run_id ? ' · imported from Podcast Scenario' : ''}
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => onReady({})}
            className="cursor-pointer bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
          >
            Continue to the cast
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Import a finished scenario</h2>
        <div className="mt-2 space-y-1.5">
          {scenarioRuns.isLoading && (
            <div className="flex items-center justify-center rounded-xl border border-border py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!scenarioRuns.isLoading && scenarioRuns.isError && (
            <p className="rounded-xl border border-destructive/30 px-4 py-5 text-center text-xs text-destructive">
              Couldn&apos;t load the scenario runs. Reload the page to retry.
            </p>
          )}
          {!scenarioRuns.isLoading && !scenarioRuns.isError && (scenarioRuns.data ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
              No completed Podcast Scenario runs yet. Plan one in Podcast Scenario, or paste a script below.
            </p>
          )}
          {(scenarioRuns.data ?? []).map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={working}
              onClick={() => void importScenario(r.id)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors duration-200 hover:border-rose-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Import className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title || 'Untitled scenario'}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">…or paste a script</h2>
        <div className="space-y-1.5">
          <Label htmlFor="pd-show">Show</Label>
          <Select value={showId} onValueChange={setShowId}>
            <SelectTrigger id="pd-show" className="max-w-xs cursor-pointer">
              <SelectValue placeholder="Pick a show" />
            </SelectTrigger>
            <SelectContent>
              {shows.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={8}
          placeholder={'HOST: Welcome back to the show.\nGUEST: Thanks for having me.'}
          aria-label="Pasted script"
        />
        <div className="flex justify-end">
          <Button
            onClick={() => void applyPastedScript()}
            disabled={!pasted.trim() || !showId || working}
            className="cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
          >
            {working && <Loader2 className="h-4 w-4 animate-spin" />}
            Use this script
          </Button>
        </div>
      </div>
    </div>
  );
}
