"use client";

/**
 * Step 10: generate the repurposed set for every selected image in every
 * selected format. Deterministic crop by default; AI extend available
 * (suggested automatically when cropping would damage the subject).
 */

import { useEffect, useMemo } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Play, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cropDamageRisk, getNetwork, getPreset, type OmniNetworkId } from '../omniNetworkPresets';
import { useRepurposeRunner, type RepurposeJob } from '@/hooks/omni/useRepurposeRunner';
import type { OmniAsset, OmniRepurposedRef } from '@/hooks/omni';

interface StepRepurposeProps {
  runId: string;
  selectedAssets: OmniAsset[];
  presetSelections: Record<string, string[]>;
  onNext: (repurposed: OmniRepurposedRef[]) => void;
}

export function StepRepurpose({ runId, selectedAssets, presetSelections, onNext }: StepRepurposeProps) {
  const assetsById = useMemo(() => new Map(selectedAssets.map((a) => [a.id, a])), [selectedAssets]);
  const runner = useRepurposeRunner(runId, assetsById);

  // Build the job matrix once the selected assets are available:
  // every selected image x every selected preset.
  useEffect(() => {
    if (runner.jobs.length > 0 || selectedAssets.length === 0) return;
    const jobs: RepurposeJob[] = [];
    for (const asset of selectedAssets) {
      for (const [networkId, presetIds] of Object.entries(presetSelections)) {
        for (const presetId of presetIds) {
          const preset = getPreset(networkId as OmniNetworkId, presetId);
          if (!preset) continue;
          const risky = asset.width && asset.height
            ? cropDamageRisk(asset.width, asset.height, preset.width, preset.height)
            : false;
          jobs.push({
            key: `${asset.id}:${presetId}`,
            sourceAssetId: asset.id,
            network: networkId as OmniNetworkId,
            presetId,
            mode: risky ? 'ai' : 'crop',
            status: 'pending',
          });
        }
      }
    }
    runner.setJobs(jobs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- build once when assets arrive
  }, [selectedAssets]);

  const doneCount = runner.jobs.filter((j) => j.status === 'done').length;
  const allDone = runner.jobs.length > 0 && doneCount === runner.jobs.length;
  const hasPending = runner.jobs.some((j) => j.status === 'pending' || j.status === 'failed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="text-sm text-muted-foreground">
          {runner.jobs.length} output{runner.jobs.length === 1 ? '' : 's'} planned · {doneCount} done
        </p>
        <Button
          size="sm"
          onClick={() => runner.runAll(runner.jobs)}
          disabled={runner.isRunning || !hasPending}
          className="cursor-pointer gap-1.5 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {runner.isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {doneCount > 0 && hasPending ? 'Run remaining' : 'Generate the set'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {runner.jobs.map((job) => {
          const preset = getPreset(job.network, job.presetId)!;
          const network = getNetwork(job.network);
          return (
            <div key={job.key} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative flex aspect-square items-center justify-center bg-muted/40">
                {job.status === 'done' && job.previewUrl ? (
                  <img src={job.previewUrl} alt={`${network.label} ${preset.label}`} className="h-full w-full object-contain" />
                ) : job.status === 'working' ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                    <p className="text-[11px] text-muted-foreground">{job.mode === 'ai' ? 'AI extending...' : 'Cropping...'}</p>
                  </div>
                ) : job.status === 'failed' ? (
                  <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">{job.error}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Waiting</p>
                )}
                {job.status === 'done' && (
                  <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-emerald-400" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-1.5 border-t border-border p-2">
                <p className="truncate text-[11px] font-medium">
                  {network.label} · {preset.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{preset.width}×{preset.height}</p>
                <div className="flex gap-1" role="radiogroup" aria-label="Repurposing mode">
                  {(['crop', 'ai'] as const).map((mode) => (
                    <button
                      key={mode}
                      role="radio"
                      aria-checked={job.mode === mode}
                      disabled={job.status === 'working' || job.status === 'done'}
                      onClick={() => runner.patchJob(job.key, { mode })}
                      className={cn(
                        'flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                        job.mode === mode ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300' : 'border-border text-muted-foreground',
                      )}
                    >
                      {mode === 'ai' && <Sparkles className="h-2.5 w-2.5" />}
                      {mode === 'crop' ? 'Smart crop' : 'AI extend'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => onNext(runner.collectRefs())}
          disabled={!allDone}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to approval
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
