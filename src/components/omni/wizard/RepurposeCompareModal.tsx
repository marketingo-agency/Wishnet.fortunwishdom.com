"use client";

/**
 * Step 10 regenerate dialog. Opens on a done tile showing the CURRENT output on
 * the left and its specs on the right. "Regenerate" produces a candidate (the
 * original stays put for side-by-side comparison); "Approve & replace" swaps the
 * candidate into the tile and closes; "Regenerate again" re-rolls. Closing without
 * approving discards the unused candidate, leaving the original untouched.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, ImageIcon, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getNetwork, getPreset } from '../omniNetworkPresets';
import { type RepurposeJob } from '@/hooks/omni/useRepurposeRunner';

export interface RepurposeCandidate {
  assetId: string;
  previewUrl: string;
}

const revokeBlobUrl = (url?: string) => {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
};

interface RepurposeCompareModalProps {
  job: RepurposeJob | null;
  generateCandidate: (job: RepurposeJob) => Promise<RepurposeCandidate>;
  onApprove: (job: RepurposeJob, candidate: RepurposeCandidate) => void;
  onDiscardCandidate: (assetId: string) => void;
  onClose: () => void;
}

const SpecRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

export function RepurposeCompareModal({ job, generateCandidate, onApprove, onDiscardCandidate, onClose }: RepurposeCompareModalProps) {
  const [candidate, setCandidate] = useState<RepurposeCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when the modal opens for a different tile. No revoke here: by the time
  // the key changes the candidate was either adopted by the tile (approve) or
  // already revoked (handleClose) — revoking again would break the adopted image.
  useEffect(() => {
    setCandidate(null);
    setBusy(false);
    setError(null);
  }, [job?.key]);

  if (!job) return null;
  const preset = getPreset(job.network, job.presetId);
  const network = getNetwork(job.network);
  const modelLabel = job.mode === 'redesign' ? 'Nano Banana Pro · edit' : 'Smart crop (no AI)';

  const handleClose = () => {
    if (candidate) {
      onDiscardCandidate(candidate.assetId); // abandon the unused candidate
      revokeBlobUrl(candidate.previewUrl);
    }
    onClose();
  };

  // Keep the prior candidate on screen while the re-roll runs (overlay a spinner),
  // and only discard/swap it once the new one resolves — so the comparison panel
  // never goes blank mid-regenerate.
  const runRegen = async () => {
    if (busy) return;
    const prev = candidate;
    setError(null);
    setBusy(true);
    try {
      const next = await generateCandidate(job);
      if (prev) {
        onDiscardCandidate(prev.assetId);
        revokeBlobUrl(prev.previewUrl);
      }
      setCandidate(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = () => {
    if (candidate) onApprove(job, candidate); // URL is adopted by the tile — do not revoke
  };

  const spinner = (
    <div className="flex flex-col items-center gap-2 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-cyan-600 [[data-omni-theme=dark]_&]:text-cyan-400" />
      <p className="text-xs text-muted-foreground">{job.mode === 'redesign' ? 'Re-designing…' : 'Cropping…'}</p>
    </div>
  );

  return (
    <Dialog open={!!job} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-10">Regenerate · {network.label} {preset?.label}</DialogTitle>
          <DialogDescription>
            Create a new version and compare it with the current one. Approve to replace, or keep the original.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Current output */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current</p>
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-muted/40 p-2">
              {job.previewUrl ? (
                <img src={job.previewUrl} alt="Current output" className="max-h-[40vh] w-auto max-w-full rounded object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Specs (initial) → New version (after regenerate) */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {candidate || busy || error ? 'New version' : 'Specifications'}
            </p>
            <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 p-3">
              {candidate ? (
                <img src={candidate.previewUrl} alt="Regenerated version" className="max-h-[40vh] w-auto max-w-full rounded object-contain" />
              ) : busy ? (
                spinner
              ) : error ? (
                <p className="text-center text-xs text-destructive">{error}</p>
              ) : (
                <div className="w-full space-y-2">
                  <SpecRow label="Model" value={modelLabel} />
                  <SpecRow label="Dimensions" value={preset ? `${preset.width} × ${preset.height}` : '—'} />
                  <SpecRow label="Aspect" value={preset?.ratio ?? '—'} />
                  <SpecRow label="Network" value={network.label} />
                  <SpecRow label="Format" value={preset?.label ?? '—'} />
                  <SpecRow label="Mode" value={job.mode === 'redesign' ? 'AI re-design' : 'Smart crop'} />
                </div>
              )}
              {/* Re-roll over an existing candidate: keep it visible under a spinner. */}
              {candidate && busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                  {spinner}
                </div>
              )}
              {candidate && error && (
                <p className="absolute inset-x-2 bottom-2 rounded bg-destructive/10 px-2 py-1 text-center text-[11px] text-destructive">{error}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button variant="outline" onClick={handleClose} className="cursor-pointer gap-1.5">
            <X className="h-4 w-4" />
            Keep original
          </Button>
          {candidate && !busy ? (
            <>
              <Button variant="outline" onClick={runRegen} className="cursor-pointer gap-1.5">
                <RefreshCw className="h-4 w-4" />
                Regenerate again
              </Button>
              <Button
                onClick={handleApprove}
                className="cursor-pointer gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-700 text-white transition-all duration-300 hover:opacity-90"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve &amp; replace
              </Button>
            </>
          ) : (
            <Button
              onClick={runRegen}
              disabled={busy}
              className="cursor-pointer gap-1.5 bg-gradient-to-r from-cyan-600 to-violet-700 text-white transition-all duration-300 hover:opacity-90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {busy ? 'Regenerating…' : error ? 'Try again' : 'Regenerate'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
