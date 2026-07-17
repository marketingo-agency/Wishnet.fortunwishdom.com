"use client";

/**
 * Step 10: Repurpose & approve. For every selected image × every selected format,
 * produce a target-sized output — an AI re-design (a designer-style re-layout for
 * the new aspect, keeping subjects/text/colors) or a free Smart crop. Each tile
 * has real actions (regenerate, download, save, delete), a full-size lightbox, and
 * select/deselect for approval. Approved outputs go to the Content Library.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Crop, Download, Expand, Loader2, Maximize2, Play, RefreshCw, Save, Sparkles, Trash2, Wand2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { downloadFromUrl } from '@/lib/downloadFromUrl';
import { getNetwork, getPreset, type OmniNetworkId } from '../omniNetworkPresets';
import { REDESIGN_MODEL, cropTrimFraction, suggestRepurposeMode, useRepurposeRunner, type RepurposeJob, type RepurposeMode } from '@/hooks/omni/useRepurposeRunner';
import { formatUsd, getFalPrice } from '@/config/falPricing';
import { discardAssetSilent, getAssetSignedUrl, useSaveAssetToFiles } from '@/hooks/omni';
import type { OmniAsset, OmniRepurposedRef } from '@/hooks/omni';
import { RepurposeCompareModal, type RepurposeCandidate } from './RepurposeCompareModal';

const revokeBlobUrl = (url?: string) => {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
};

const MODE_LABELS: Record<RepurposeMode, string> = {
  crop: 'Smart crop',
  extend: 'AI extend',
  redesign: 'AI re-design',
};

const EXTEND_MODEL = 'fal-ai/flux-2-pro/outpaint';

/** Estimated fal cost of ONE output in the given mode (REP-C). */
function modeCost(mode: RepurposeMode, presetW: number, presetH: number): number {
  if (mode === 'crop') return 0;
  if (mode === 'extend') {
    const price = getFalPrice(EXTEND_MODEL);
    return (price.unitPrice ?? 0.03) * ((presetW * presetH) / 1_000_000);
  }
  return getFalPrice(REDESIGN_MODEL).unitPrice ?? 0.15;
}

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
  job, approved, isSaving, suggested, trimFraction, onToggleApprove, onRegenerate, onDownload, onSave, onDelete, onSetMode,
}: {
  job: RepurposeJob;
  approved: boolean;
  isSaving: boolean;
  /** The auto-suggested tier for this pair (REP-04). */
  suggested: RepurposeMode;
  /** Source fraction a straight crop would trim (drives the tier hint). */
  trimFraction: number;
  onToggleApprove: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  onSave: () => void;
  onDelete: () => void;
  onSetMode: (mode: RepurposeMode) => void;
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
            <p className="text-[11px] text-muted-foreground">{job.mode === 'redesign' ? 'Re-designing…' : job.mode === 'extend' ? 'Extending…' : 'Cropping…'}</p>
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
        {(job.status === 'pending' || job.status === 'failed') && (
          <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label={`${preset.label} tier`}>
            {(['crop', 'extend', 'redesign'] as const).map((m) => {
              const Icon = m === 'crop' ? Crop : m === 'extend' ? Expand : Wand2;
              return (
                <button
                  key={m}
                  role="radio"
                  aria-checked={job.mode === m}
                  title={`${MODE_LABELS[m]}${m === suggested ? ' (suggested)' : ''}`}
                  onClick={() => onSetMode(m)}
                  className={cn(
                    'flex cursor-pointer items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    job.mode === m
                      ? 'border-cyan-500/60 bg-cyan-500/10 font-medium text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {MODE_LABELS[m]}
                </button>
              );
            })}
          </div>
        )}
        {(job.status === 'pending' || job.status === 'failed') && suggested !== 'crop' && trimFraction > 0.05 && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Crop would trim ~{Math.round(trimFraction * 100)}% — {MODE_LABELS[suggested]} suggested.
          </p>
        )}
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] text-muted-foreground">
            {preset.width}×{preset.height} · {MODE_LABELS[job.mode]}
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
  const saveToFiles = useSaveAssetToFiles();

  const [mode, setMode] = useState<RepurposeMode | 'suggested'>('suggested');
  const [approved, setApproved] = useState<Set<string>>(() => new Set(initialApproved));
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [compareKey, setCompareKey] = useState<string | null>(null);
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
            const priorMode: RepurposeMode = prior.ref.mode === 'crop' ? 'crop'
              : prior.ref.mode === 'extend' || prior.ref.mode === 'ai' ? 'extend'
              : 'redesign';
            jobs.push({ key, sourceAssetId: asset.id, network: networkId as OmniNetworkId, presetId, mode: priorMode, status: 'done', resultAssetId: prior.ref.asset_id });
            toSign.push({ key, storagePath: prior.storagePath });
          } else {
            // REP-04: each pair defaults to its auto-suggested tier.
            const suggested = suggestRepurposeMode(asset.width ?? 0, asset.height ?? 0, preset.width, preset.height);
            jobs.push({ key, sourceAssetId: asset.id, network: networkId as OmniNetworkId, presetId, mode: suggested, status: 'pending' });
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
  const hasPending = runner.jobs.some((j) => j.status === 'pending' || j.status === 'failed');
  const approvedCount = runner.jobs.filter((j) => j.status === 'done' && j.resultAssetId && approved.has(j.resultAssetId)).length;
  const compareJob = compareKey ? runner.jobs.find((j) => j.key === compareKey) ?? null : null;

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

  // Persist whenever the set of done outputs changes — new completion, a compare-
  // modal replacement, or a delete — so paid outputs survive resume. Keyed on the
  // result-asset signature (not just the count) so a same-count swap still persists.
  const doneSig = runner.jobs.filter((j) => j.status === 'done' && j.resultAssetId).map((j) => j.resultAssetId).join(',');
  useEffect(() => {
    if (runner.jobs.length === 0) return;
    onProgress(runner.collectRefs());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist when the done-output set changes
  }, [doneSig]);

  const suggestionFor = (job: RepurposeJob): RepurposeMode => {
    const src = assetsById.get(job.sourceAssetId);
    const preset = getPreset(job.network, job.presetId);
    if (!src || !preset) return 'redesign';
    return suggestRepurposeMode(src.width ?? 0, src.height ?? 0, preset.width, preset.height);
  };

  const setGlobalMode = (m: RepurposeMode | 'suggested') => {
    setMode(m);
    // Atomic batch: only un-run jobs adopt the new mode; completed tiles keep theirs.
    runner.setJobs((prev) => prev.map((j) => (
      j.status === 'pending' || j.status === 'failed'
        ? { ...j, mode: m === 'suggested' ? suggestionFor(j) : m }
        : j
    )));
  };

  // REP-C: the cost of what "Generate the set" is about to fire.
  const pendingCost = runner.jobs
    .filter((j) => j.status === 'pending' || j.status === 'failed')
    .reduce((sum, j) => {
      const preset = getPreset(j.network, j.presetId);
      return sum + (preset ? modeCost(j.mode, preset.width, preset.height) : 0);
    }, 0);

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

  // Open the compare modal instead of regenerating in place — the original stays
  // visible for side-by-side comparison and is only replaced once approved. (No
  // ['omni-assets'] invalidation here, so the grid never reloads.)
  const handleRegenerate = (job: RepurposeJob) => setCompareKey(job.key);

  // Approve the modal's candidate: swap it into the tile, discard the old output
  // silently (no grid reload), and move approval to the new asset.
  const handleApproveCandidate = (job: RepurposeJob, candidate: RepurposeCandidate) => {
    const oldId = job.resultAssetId;
    revokeBlobUrl(job.previewUrl); // free the displaced output's object URL (no-op for signed URLs)
    runner.patchJob(job.key, { status: 'done', resultAssetId: candidate.assetId, previewUrl: candidate.previewUrl, mode: candidate.mode });
    if (oldId) void discardAssetSilent(oldId);
    setApproved((prev) => {
      const next = new Set(prev);
      if (oldId) next.delete(oldId);
      next.add(candidate.assetId);
      return next;
    });
    excludedRef.current.delete(candidate.assetId);
    setCompareKey(null);
  };

  const handleDiscardCandidate = (assetId: string) => void discardAssetSilent(assetId);

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

  // REP-02-ux2: deleting an output RESETS the slot to pending (regenerable)
  // instead of vanishing the format from the plan.
  const handleDelete = (job: RepurposeJob) => {
    if (job.resultAssetId) {
      void discardAssetSilent(job.resultAssetId);
      excludedRef.current.add(job.resultAssetId);
      setApproved((prev) => {
        const next = new Set(prev);
        next.delete(job.resultAssetId!);
        return next;
      });
    }
    revokeBlobUrl(job.previewUrl);
    runner.patchJob(job.key, { status: 'pending', resultAssetId: undefined, previewUrl: undefined, error: undefined });
  };

  const handleContinue = () => {
    const refs = runner.collectRefs();
    const approvedIds = refs.map((r) => r.asset_id).filter((id) => approved.has(id));
    onNext(refs, approvedIds);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Repurpose mode">
          {([['suggested', 'Suggested', Sparkles], ['redesign', 'AI re-design', Wand2], ['extend', 'AI extend', Expand], ['crop', 'Smart crop (free)', Crop]] as const).map(([m, label, Icon]) => (
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
        <div className="flex items-center gap-2">
          {hasPending && (
            <span className="text-xs text-muted-foreground">
              ≈{formatUsd(pendingCost)}
            </span>
          )}
          <Button
            size="sm"
            onClick={() => runner.runAll(runner.jobs)}
            disabled={runner.isRunning || !hasPending}
            className="cursor-pointer gap-1.5 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
          >
            {runner.isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Generate the set
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Suggested picks the right tier per format: free Smart crop for near-matching aspects, pixel-preserving AI extend for moderate jumps, full AI re-design for extreme ones. Approve the outputs to save.
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
              suggested={suggestionFor(job)}
              trimFraction={(() => {
                const src = assetsById.get(job.sourceAssetId);
                const preset = getPreset(job.network, job.presetId);
                return src && preset ? cropTrimFraction(src.width ?? 0, src.height ?? 0, preset.width, preset.height) : 0;
              })()}
              onToggleApprove={() => job.resultAssetId && toggleApprove(job.resultAssetId)}
              onRegenerate={() => handleRegenerate(job)}
              onDownload={() => void handleDownload(job)}
              onSave={() => void handleSave(job)}
              onDelete={() => handleDelete(job)}
              onSetMode={(m) => runner.patchJob(job.key, { mode: m })}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{approvedCount} of {doneCount} approved</p>
        <Button
          onClick={handleContinue}
          disabled={approvedCount === 0}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to finalize
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <RepurposeCompareModal
        job={compareJob}
        generateCandidate={runner.generateCandidate}
        onApprove={handleApproveCandidate}
        onDiscardCandidate={handleDiscardCandidate}
        onClose={() => setCompareKey(null)}
      />
    </div>
  );
}
