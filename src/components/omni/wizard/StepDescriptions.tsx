"use client";

/**
 * Step 8: per-approved-image, per-network social captions.
 * For every selected image and every target network, Promptor writes a few
 * platform-tailored caption examples (Heart + Brain compliant via optimize-draft).
 * Pick one or edit it; each network gets its own caption. Lock to continue.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Lock, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getAssetSignedUrl, useOmniAssets, useOmniDescriptions } from '@/hooks/omni';
import { getNetwork, type OmniNetworkId } from '../omniNetworkPresets';

const CAPTION_OPTIONS = 3;

type CaptionMap = Record<string, Record<string, string>>;
type OptionMap = Record<string, Record<string, string[]>>;

interface StepDescriptionsProps {
  runId: string;
  objective: string;
  lockedPrompt: string;
  networks: string[];
  selectedAssetIds: string[];
  initialOptions: OptionMap;
  initialChosen: CaptionMap;
  onLock: (options: OptionMap, chosen: CaptionMap) => void;
}

function CaptionCell({
  networkId, options, chosen, busy, onPick, onEdit, onRegenerate,
}: {
  networkId: string;
  options: string[];
  chosen: string;
  busy: boolean;
  onPick: (text: string) => void;
  onEdit: (text: string) => void;
  onRegenerate: () => void;
}) {
  const net = getNetwork(networkId as OmniNetworkId);
  const Icon = net.icon;
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <Icon className={cn('h-3.5 w-3.5', net.accent)} />
          {net.label}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRegenerate}
          disabled={busy}
          className="h-7 cursor-pointer gap-1 px-1.5 text-xs"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Regenerate
        </Button>
      </div>
      {options.length > 0 && (
        <div className="mb-1.5 space-y-1" role="radiogroup" aria-label={`${net.label} caption options`}>
          {options.map((o, i) => (
            <button
              key={i}
              role="radio"
              aria-checked={chosen === o}
              onClick={() => onPick(o)}
              className={cn(
                'block w-full cursor-pointer rounded-md border px-2 py-1 text-left text-[11px] transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40',
                chosen === o ? 'border-cyan-500 bg-cyan-500/10 font-medium' : 'border-border hover:border-cyan-500/30',
              )}
            >
              <span className="flex items-start gap-1.5">
                {chosen === o && <Check className="mt-0.5 h-3 w-3 shrink-0 text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300" />}
                <span>{o}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <Textarea
        value={chosen}
        onChange={(e) => onEdit(e.target.value)}
        placeholder={`Caption for ${net.label}...`}
        className="min-h-[60px] text-xs focus-visible:ring-cyan-500/40"
        aria-label={`${net.label} caption`}
      />
    </div>
  );
}

export function StepDescriptions({
  runId, objective, lockedPrompt, networks, selectedAssetIds, initialOptions, initialChosen, onLock,
}: StepDescriptionsProps) {
  const { generate } = useOmniDescriptions();
  const assets = useOmniAssets(runId);
  const [options, setOptions] = useState<OptionMap>(initialOptions);
  const [chosen, setChosen] = useState<CaptionMap>(initialChosen);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [busyCell, setBusyCell] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const cancelRef = useRef(false);

  const images = useMemo(
    () => (assets.data ?? []).filter((a) => selectedAssetIds.includes(a.id)),
    [assets.data, selectedAssetIds],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      const entries = await Promise.all(
        images
          .filter((a) => a.storage_path)
          .map(async (a) => [a.id, await getAssetSignedUrl(a.storage_path as string)] as const),
      );
      if (active) setThumbs(Object.fromEntries(entries.filter(([, u]) => !!u) as [string, string][]));
    })();
    return () => { active = false; };
  }, [images]);

  const cellBrief = useCallback(
    (assetId: string, networkId: string) => {
      const img = images.find((a) => a.id === assetId);
      const net = getNetwork(networkId as OmniNetworkId);
      const visual = img?.prompt || lockedPrompt;
      return `Social media caption for ${net.label}. Write in ${net.label}'s native style, tone, and length.\nObjective: ${objective}\nThis specific image: ${visual}`;
    },
    [images, lockedPrompt, objective],
  );

  const generateCell = useCallback(
    async (assetId: string, networkId: string, notes?: string) => {
      const results = await generate(cellBrief(assetId, networkId), CAPTION_OPTIONS, notes);
      if (results.length > 0) {
        setOptions((prev) => ({ ...prev, [assetId]: { ...(prev[assetId] ?? {}), [networkId]: results } }));
        setChosen((prev) => ({
          ...prev,
          [assetId]: { ...(prev[assetId] ?? {}), [networkId]: prev[assetId]?.[networkId] || results[0] },
        }));
      }
    },
    [generate, cellBrief],
  );

  const generateAll = useCallback(async () => {
    if (running) return;
    setRunning(true);
    cancelRef.current = false;
    const cells: [string, string][] = [];
    for (const img of images) for (const n of networks) cells.push([img.id, n]);
    const pending = cells.filter(([a, n]) => !(options[a]?.[n]?.length));
    setProgress({ done: 0, total: pending.length });
    try {
      let done = 0;
      for (const [a, n] of pending) {
        if (cancelRef.current) break;
        await generateCell(a, n);
        done += 1;
        setProgress({ done, total: pending.length });
      }
    } finally {
      setRunning(false);
      setProgress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options read intentionally at call time
  }, [running, images, networks, generateCell]);

  const regenerateCell = useCallback(async (assetId: string, networkId: string) => {
    const key = `${assetId}:${networkId}`;
    setBusyCell(key);
    try {
      await generateCell(assetId, networkId);
    } finally {
      setBusyCell((b) => (b === key ? null : b));
    }
  }, [generateCell]);

  const pick = (assetId: string, networkId: string, text: string) =>
    setChosen((prev) => ({ ...prev, [assetId]: { ...(prev[assetId] ?? {}), [networkId]: text } }));

  const isComplete =
    images.length > 0 &&
    networks.length > 0 &&
    images.every((img) => networks.every((n) => (chosen[img.id]?.[n] ?? '').trim().length > 0));

  if (assets.isLoading) {
    return (
      <div className="flex justify-center py-12" aria-label="Loading images">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (images.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No selected images to caption.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          A tailored caption per network, per image. Click &ldquo;Generate all&rdquo;, or write each caption yourself.
        </p>
        {running ? (
          <Button variant="outline" size="sm" onClick={() => { cancelRef.current = true; }} className="cursor-pointer gap-1.5">
            <X className="h-3.5 w-3.5" />
            Stop
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => void generateAll()} className="cursor-pointer gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Generate all
          </Button>
        )}
      </div>

      {running && progress && (
        <p className="text-xs text-muted-foreground">
          Writing captions… {Math.min(progress.done + 1, progress.total)} of {progress.total}
        </p>
      )}

      {images.map((img) => (
        <section key={img.id} className="rounded-xl border border-border bg-card p-3">
          <div className="mb-3 flex items-center gap-3">
            {thumbs[img.id] ? (
              // Signed private-bucket URL.
              <img src={thumbs[img.id]} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover" />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-lg border border-border bg-muted" />
            )}
            <p className="line-clamp-2 text-xs text-muted-foreground">{img.prompt || 'Generated image'}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {networks.map((n) => (
              <CaptionCell
                key={n}
                networkId={n}
                options={options[img.id]?.[n] ?? []}
                chosen={chosen[img.id]?.[n] ?? ''}
                busy={busyCell === `${img.id}:${n}` || running}
                onPick={(text) => pick(img.id, n, text)}
                onEdit={(text) => pick(img.id, n, text)}
                onRegenerate={() => void regenerateCell(img.id, n)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="flex justify-end">
        <Button
          onClick={() => onLock(options, chosen)}
          disabled={!isComplete || running}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          <Lock className="h-4 w-4" />
          Lock captions and continue
        </Button>
      </div>
    </div>
  );
}
