"use client";

/**
 * Step 10: Repurpose & approve. For every selected image × every selected format,
 * produce a target-sized output — an AI re-design (a designer-style re-layout for
 * the new aspect, keeping subjects/text/colors) or a free Smart crop. Each tile
 * has real actions (regenerate, download, save, delete), a full-size lightbox, and
 * select/deselect for approval. Approved outputs go to the Content Library.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Crop, Download, Loader2, Maximize2, Play, RefreshCw, Save, Sparkles, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { downloadFromUrl } from '@/lib/downloadFromUrl';
import { getNetwork, getPreset, type OmniNetworkId } from '../omniNetworkPresets';
import { useRepurposeRunner, type RepurposeJob, type RepurposeMode } from '@/hooks/omni/useRepurposeRunner';
import { getAssetSignedUrl, useDiscardAsset, useSaveAssetToFiles } from '@/hooks/omni';
import type { OmniAsset, OmniRepurposedRef } from '@/hooks/omni';

interface StepRepurposeProps {
  runId: string;
  selectedAssets: OmniAsset[];
  runAssets: OmniAsset[];
  initialRepurposed: OmniRepurposedRef[];
  initialApproved: string[];
  presetSelections: Record<string, string[]>;
  onProgress: (repurposed: OmniRepurposedRef[]) => void;
  onNext: (repurposed: OmniRepurposedRef[], approved: string[]) => void;
}

const TileAction = ({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="h-7 w-7 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

function RepurposeTile({
  job, approved, isSaving, onToggleApprove, onRegenerate, onDownload, onSave, onDelete,
}: {
  job: RepurposeJob;
  approved: boolean;
  isSaving: boolean;
  onToggleApprove: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const preset = getPreset(job.network, job.presetId)!;
  const network = getNetwork(job.network);
  const isDone = job.status === 'done' && !!job.previewUrl;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-all duration-300',
        isDone && approved ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10' : isDone ? 'border-dashed border-border' : 'border-border',
      )}
    >
      <div className="group/tile relative flex aspect-square items-center justify-center bg-muted/40">
        {job.status === 'working' ? (
          <div className="flex flex-col items-center gap-1.5">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            <p className="text-[11px] text-muted-foreground">{job.mode === 'redesign' ? 'Re-designing…' : 'Cropping…'}</p>
          </div>
        ) : job.status === 'failed' ? (
          <div className="flex flex-col items-center gap-1.5 p-3 text-center">
            <XCircle className="h-5 w-5 text-destructive" />
            <p className="line-clamp-2 text-[11px] text-muted-foreground">{job.error}</p>
          </div>
        ) : isDone ? (
          <>
            <button
              onClick={onToggleApprove}
              aria-pressed={approved}
              aria-label={approved ? 'Exclude from the Content Library' : 'Approve for the Content Library'}
              className="group h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
            >
              <img src={job.previewUrl} alt={`${network.label} ${preset.label}`} className="h-full w-full object-contain" />
              <span
                className={cn(
                  'absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200',
                  approved ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-white/70 bg-black/45 text-white/80',
                )}
              >
                {approved ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="View full size"
              className="absolute left-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/60 bg-black/55 text-white opacity-100 transition-opacity duration-200 hover:bg-black/70 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 sm:opacity-0 sm:group-hover/tile:opacity-100"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">Waiting</p>
        )}
      </div>

      <div className="border-t border-border p-2">
        <p className="truncate text-[11px] font-medium">{network.label} · {preset.label}</p>
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] text-muted-foreground">
            {preset.width}×{preset.height} · {job.mode === 'redesign' ? 'AI re-design' : 'Smart crop'}
          </p>
          {isDone && (
            <div className="flex shrink-0 items-center">
              <TileAction label="Regenerate" onClick={onRegenerate}>
                <RefreshCw className="h-3.5 w-3.5" />
              </TileAction>
              <TileAction label="Download" onClick={onDownload}>
                <Download className="h-3.5 w-3.5" />
              </TileAction>
              <TileAction label="Save to Files library" onClick={onSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              </TileAction>
              <TileAction label="Delete" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </TileAction>
            </div>
          )}
        </div>
      </div>

      {job.previewUrl && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="flex max-h-[95vh] max-w-[95vw] items-center justify-center overflow-hidden border-white/10 bg-black/95 p-2 text-white backdrop-blur-sm sm:max-w-[90vw]">
            <DialogTitle className="sr-only">Full-size preview of {network.label} {preset.label}</DialogTitle>
            <img src={job.previewUrl} alt={`${network.label} ${preset.label} full size`} className="max-h-[90vh] w-auto max-w-full rounded-lg object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function StepRepurpose({ runId, selectedAssets, runAssets, initialRepurposed, initialApproved, presetSelections, onProgress, onNext }: StepRepurposeProps) {
  const assetsById = useMemo(() => new Map(selectedAssets.map((a) => [a.id, a])), [selectedAssets]);
  const runner = useRepurposeRunner(runId, assetsById);
  const discardAsset = useDiscardAsset();
  const saveToFiles = useSaveAssetToFiles();

  const [mode, setMode] = useState<RepurposeMode>('redesign');
  const [approved, setApproved] = useState<Set<string>>(() => new Set(initialApproved));
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const excludedRef = useRef<Set<string>>(
    new Set(initialApproved.length > 0 ? initialRepurposed.map((r) => r.asset_id).filter((id) => !initialApproved.includes(id)) : []),
  );

  // Build the job matrix once selected assets are available. Restored outputs
  // seed as done (no re-bill); new combinations default to AI re-design.
  useEffect(() => {
    if (runner.jobs.length > 0 || selectedAssets.length === 0) return;

    const restored = new Map<string, { ref: OmniRepurposedRef; storagePath: string }>();
    for (const ref of initialRepurposed) {
      const output = runAssets.find((a) => a.id === ref.asset_id && a.status === 'done' && a.storage_path);
      if (output) restored.set(`${ref.source_asset_id}:${ref.network}:${ref.preset_id}`, { ref, storagePath: output.storage_path! });
    }

    const jobs: RepurposeJob[] = [];
    const toSign: { key: string; storagePath: string }[] = [];
    for (const asset of selectedAssets) {
      for (const [networkId, presetIds] of Object.entries(presetSelections)) {
        for (const presetId of presetIds) {
          const preset = getPreset(networkId as OmniNetworkId, presetId);
          if (!preset) continue;
          const key = `${asset.id}:${networkId}:${presetId}`;
          const prior = restored.get(`${asset.id}:${networkId}:${presetId}`);
          if (prior) {
            const priorMode: RepurposeMode = prior.ref.mode === 'crop' ? 'crop' : 'redesign';
            jobs.push({ key, sourceAssetId: asset.id, network: networkId as OmniNetworkId, presetId, mode: priorMode, status: 'done', resultAssetId: prior.ref.asset_id });
            toSign.push({ key, storagePath: prior.storagePath });
          } else {
            jobs.push({ key, sourceAssetId: asset.id, network: networkId as OmniNetworkId, presetId, mode: 'redesign', status: 'pending' });
          }
        }
      }
    }
    runner.setJobs(jobs);

    void (async () => {
      for (const { key, storagePath } of toSign) {
        const url = await getAssetSignedUrl(storagePath);
        if (url) runner.patchJob(key, { previewUrl: url });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- build once when assets arrive
  }, [selectedAssets, runAssets, initialRepurposed]);

  const doneCount = runner.jobs.filter((j) => j.status === 'done').length;
  const allDone = runner.jobs.length > 0 && doneCount === runner.jobs.length;
  const hasPending = runner.jobs.some((j) => j.status === 'pending' || j.status === 'failed');
  const approvedCount = runner.jobs.filter((j) => j.status === 'done' && j.resultAssetId && approved.has(j.resultAssetId)).length;

  // Newly completed outputs are approved by default unless explicitly excluded.
  useEffect(() => {
    setApproved((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const j of runner.jobs) {
        if (j.status === 'done' && j.resultAssetId && !excludedRef.current.has(j.resultAssetId) && !next.has(j.resultAssetId)) {
          next.add(j.resultAssetId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to completions
  }, [doneCount]);

  // Persist completed outputs as they land (so paid outputs survive resume).
  const persistedDoneRef = useRef(0);
  useEffect(() => {
    if (doneCount > persistedDoneRef.current) {
      persistedDoneRef.current = doneCount;
      onProgress(runner.collectRefs());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire per completed job
  }, [doneCount]);

  const setGlobalMode = (m: RepurposeMode) => {
    setMode(m);
    // Atomic batch: only un-run jobs adopt the new mode; completed tiles keep theirs.
    runner.setJobs((prev) => prev.map((j) => (j.status === 'pending' || j.status === 'failed' ? { ...j, mode: m } : j)));
  };

  const toggleApprove = (assetId: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
        excludedRef.current.add(assetId);
      } else {
        next.add(assetId);
        excludedRef.current.delete(assetId);
      }
      return next;
    });
  };

  const handleRegenerate = (job: RepurposeJob) => {
    if (job.resultAssetId) {
      discardAsset.mutate(job.resultAssetId);
      setApproved((prev) => {
        const next = new Set(prev);
        next.delete(job.resultAssetId!);
        return next;
      });
    }
    void runner.regenerate(job.key);
  };

  const handleDownload = async (job: RepurposeJob) => {
    if (!job.previewUrl) return;
    try {
      await downloadFromUrl(job.previewUrl, `omni-${job.network}-${job.presetId}.png`);
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Download failed. Refresh and try again.');
    }
  };

  const handleSave = async (job: RepurposeJob) => {
    if (!job.resultAssetId) return;
    setSavingKey(job.key);
    try {
      await saveToFiles.mutateAsync(job.resultAssetId);
    } finally {
      setSavingKey((k) => (k === job.key ? null : k));
    }
  };

  const handleDelete = (job: RepurposeJob) => {
    if (job.resultAssetId) {
      discardAsset.mutate(job.resultAssetId);
      excludedRef.current.add(job.resultAssetId);
      setApproved((prev) => {
        const next = new Set(prev);
        next.delete(job.resultAssetId!);
        return next;
      });
    }
    runner.setJobs((prev) => prev.filter((j) => j.key !== job.key));
  };

  const handleContinue = () => {
    const refs = runner.collectRefs();
    const approvedIds = refs.map((r) => r.asset_id).filter((id) => approved.has(id));
    onNext(refs, approvedIds);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Repurpose mode">
          {([['redesign', 'AI re-design', Sparkles], ['crop', 'Smart crop (free)', Crop]] as const).map(([m, label, Icon]) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => setGlobalMode(m)}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                mode === m ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
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

      <p className="text-xs text-muted-foreground">
        AI re-design re-lays-out each post for the target dimension, keeping its subjects, text, and colors. Smart crop is a free centered crop. Approve the ones to save.
        {doneCount > 0 && ' The mode applies to new generations; completed tiles keep their mode — use Regenerate to change one.'}
      </p>

      {runner.jobs.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No formats selected to produce.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {runner.jobs.map((job) => (
            <RepurposeTile
              key={job.key}
              job={job}
              approved={!!job.resultAssetId && approved.has(job.resultAssetId)}
              isSaving={savingKey === job.key}
              onToggleApprove={() => job.resultAssetId && toggleApprove(job.resultAssetId)}
              onRegenerate={() => handleRegenerate(job)}
              onDownload={() => void handleDownload(job)}
              onSave={() => void handleSave(job)}
              onDelete={() => handleDelete(job)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{approvedCount} of {doneCount} approved</p>
        <Button
          onClick={handleContinue}
          disabled={!allDone || approvedCount === 0}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to finalize
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
