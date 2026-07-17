"use client";

/**
 * Video Studio stage 1: the scenario source. Import a completed Scenario
 * Studio run, or quick-brief inline (same scenario-generate action).
 */

import { useMemo, useState } from 'react';
import { ArrowRight, Loader2, NotebookPen, Wand2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useGenerateScenario } from '@/hooks/omni/useScenario';
import type { OmniImagesState, OmniRun, OmniVideoScenario } from '@/hooks/omni';

interface VSScenarioProps {
  onPicked: (scenario: OmniVideoScenario, sourceRunId: string | null, brief: string) => void;
}

export function VSScenario({ onPicked }: VSScenarioProps) {
  const [brief, setBrief] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const generate = useGenerateScenario();

  const scenarios = useQuery<OmniRun[]>({
    queryKey: ['omni-runs', 'scenario-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omni_runs')
        .select('*')
        .eq('mode', 'video_scenario')
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as OmniRun[];
    },
  });

  const usable = useMemo(
    () => (scenarios.data ?? []).filter((r) => ((r.step_state ?? {}) as OmniImagesState).scenario?.scenes?.length),
    [scenarios.data],
  );

  const handleImport = () => {
    const run = usable.find((r) => r.id === selectedRunId);
    const scenario = ((run?.step_state ?? {}) as OmniImagesState).scenario;
    if (!run || !scenario) return;
    onPicked(scenario, run.id, ((run.step_state ?? {}) as OmniImagesState).objective ?? '');
  };

  const handleQuickBrief = () => {
    if (!brief.trim() || generate.isPending) return;
    generate.mutate(
      { brief: brief.trim(), target_scenes: 4, seconds_per_scene: 8 },
      { onSuccess: (r) => onPicked(r.scenario, null, brief.trim()) },
    );
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2" aria-label="Import a scenario">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-violet-400" />
          <p className="text-sm font-medium">Start from a Scenario Studio run</p>
        </div>
        {scenarios.isLoading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading scenarios…
          </div>
        ) : scenarios.isError ? (
          <p className="py-3 text-xs text-destructive">Could not load your scenarios.</p>
        ) : usable.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">
            No scenarios yet — write one in Scenario Studio, or quick-brief below.
          </p>
        ) : (
          <div className="space-y-1.5" role="group" aria-label="Your scenarios">
            {usable.map((run) => {
              const state = (run.step_state ?? {}) as OmniImagesState;
              const active = selectedRunId === run.id;
              return (
                <button
                  key={run.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedRunId(active ? null : run.id)}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'border-violet-500/60 bg-violet-500/10' : 'border-border hover:border-violet-500/30',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{state.scenario?.title ?? run.title ?? 'Untitled scenario'}</p>
                    <p className="text-xs text-muted-foreground">
                      {state.scenario?.scenes.length} scenes · ≈{state.scenario?.scenes.reduce((s, x) => s + (x.duration_s || 0), 0)}s
                      {run.status === 'completed' ? ' · finished' : ' · in progress'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {selectedRunId && (
          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              className="cursor-pointer gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all duration-300 hover:opacity-90"
            >
              <ArrowRight className="h-4 w-4" />
              Use this scenario
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-2 border-t pt-4" aria-label="Quick brief">
        <Label htmlFor="vs-quick-brief">Or quick-brief a new one</Label>
        <Textarea
          id="vs-quick-brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="One paragraph on the video you want — a 4-scene scenario is generated inline."
          rows={3}
          className="resize-none"
        />
        {generate.isError && <p className="text-xs text-destructive">{generate.error.message}</p>}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleQuickBrief}
            disabled={!brief.trim() || generate.isPending}
            className="cursor-pointer gap-2"
          >
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {generate.isPending ? 'Writing…' : 'Generate a quick scenario'}
          </Button>
        </div>
      </section>
    </div>
  );
}
