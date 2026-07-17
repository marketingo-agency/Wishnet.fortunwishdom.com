"use client";

/**
 * Stage 6 "Captions" (Plan 1 Phase 7): captions are authored ONLY for images
 * whose posts survived approval (ORD-01 — no more paying LLM calls for posts
 * that die at the adapt stage).
 *
 * - One `generate-captions` edge call per IMAGE covers ALL of its networks
 *   (the Phase-5 action, omni Heart scope), 2 images in flight at a time —
 *   a 3×3 set costs ≤3 calls instead of the legacy 27.
 * - Explicit "Generate all captions" (never auto-fired — no surprise billing).
 * - Default 1 option per network + "More options" per cell (CAP-01).
 * - Per-network character counters with platform caps (CAP-02).
 * - Grouped by network; state keeps the `caption_options`/`chosen_captions`
 *   [assetId][networkId] contract (D-REG).
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Loader2, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  getAssetSignedUrl, useGenerateCaptions, useOmniAssets,
  type OmniRepurposedRef,
} from '@/hooks/omni';
import { getNetwork, type OmniNetworkId } from '../omniNetworkPresets';

type CaptionMap = Record<string, Record<string, string>>;
type OptionMap = Record<string, Record<string, string[]>>;

/** Practical per-network caption caps (mirrors the edge NETWORK_BRIEFS). */
const NETWORK_CAPS: Record<string, number> = {
  facebook: 2000,
  instagram: 2200,
  x: 280,
  tiktok: 2200,
  youtube: 5000,
  pinterest: 500,
};

const CONCURRENCY = 2;

interface StageCaptionsProps {
  runId: string;
  objective: string;
  lockedPrompt: string;
  repurposed: OmniRepurposedRef[];
  approvedAssetIds: string[];
  initialOptions: OptionMap;
  initialChosen: CaptionMap;
  onNext: (options: OptionMap, chosen: CaptionMap) => void;
}

export function StageCaptions({
  runId, objective, lockedPrompt, repurposed, approvedAssetIds, initialOptions, initialChosen, onNext,
}: StageCaptionsProps) {
  const assets = useOmniAssets(runId);
  const generateCaptions = useGenerateCaptions();
  const [options, setOptions] = useState<OptionMap>(initialOptions);
  const [chosen, setChosen] = useState<CaptionMap>(initialChosen);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [busyCell, setBusyCell] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Approval-gated work list: SOURCE image → the networks its approved posts hit.
  const workList = useMemo(() => {
    const approved = new Set(approvedAssetIds);
    const bySource = new Map<string, Set<string>>();
    for (const ref of repurposed) {
      if (!approved.has(ref.asset_id)) continue;
      const set = bySource.get(ref.source_asset_id) ?? new Set<string>();
      set.add(ref.network);
      bySource.set(ref.source_asset_id, set);
    }
    return [...bySource.entries()].map(([sourceId, nets]) => ({ sourceId, networks: [...nets] }));
  }, [repurposed, approvedAssetIds]);

  // Network-grouped view: network → the source images captioned for it.
  const byNetwork = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const { sourceId, networks } of workList) {
      for (const net of networks) {
        map.set(net, [...(map.get(net) ?? []), sourceId]);
      }
    }
    return [...map.entries()];
  }, [workList]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const rows = (assets.data ?? []).filter((a) => workList.some((w) => w.sourceId === a.id));
      const entries = await Promise.all(
        rows.map(async (a) => [a.id, a.storage_path ? await getAssetSignedUrl(a.storage_path) : null] as const),
      );
      if (active) setThumbs(Object.fromEntries(entries.filter(([, u]) => u) as [string, string][]));
    })();
    return () => { active = false; };
  }, [assets.data, workList]);

  const promptFor = (sourceId: string) =>
    (assets.data ?? []).find((a) => a.id === sourceId)?.prompt ?? lockedPrompt;

  const mergeResult = (sourceId: string, result: Record<string, string[]>, replace = false) => {
    setOptions((prev) => {
      const forImage = { ...(prev[sourceId] ?? {}) };
      for (const [net, opts] of Object.entries(result)) {
        forImage[net] = replace ? opts : [...opts];
      }
      return { ...prev, [sourceId]: forImage };
    });
    setChosen((prev) => {
      const forImage = { ...(prev[sourceId] ?? {}) };
      for (const [net, opts] of Object.entries(result)) {
        if (!forImage[net] && opts[0]) forImage[net] = opts[0];
      }
      return { ...prev, [sourceId]: forImage };
    });
  };

  const generateAll = async () => {
    if (running || workList.length === 0) return;
    setRunning(true);
    setProgress({ done: 0, total: workList.length });
    // Only images that still miss at least one network's caption.
    const pending = workList.filter(({ sourceId, networks }) =>
      networks.some((net) => !(options[sourceId]?.[net]?.length)));
    const queue = [...pending];
    setProgress({ done: workList.length - pending.length, total: workList.length });
    let done = workList.length - pending.length;
    const worker = async () => {
      for (;;) {
        const item = queue.shift();
        if (!item) return;
        try {
          const result = await generateCaptions.mutateAsync({
            runId,
            imagePrompt: promptFor(item.sourceId),
            objective,
            networks: item.networks,
            optionsPerNetwork: 1,
          });
          mergeResult(item.sourceId, result);
        } catch {
          // Hook toasts; remaining images continue.
        } finally {
          done += 1;
          setProgress({ done, total: workList.length });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()));
    setRunning(false);
    setProgress(null);
  };

  const moreOptions = async (sourceId: string, network: string) => {
    const key = `${sourceId}:${network}`;
    setBusyCell(key);
    try {
      const result = await generateCaptions.mutateAsync({
        runId,
        imagePrompt: promptFor(sourceId),
        objective,
        networks: [network],
        optionsPerNetwork: 3,
      });
      if (result[network]?.length) {
        mergeResult(sourceId, { [network]: result[network] }, true);
      }
    } catch {
      // Hook toasts.
    } finally {
      setBusyCell(null);
    }
  };

  const setCaption = (sourceId: string, network: string, text: string) => {
    setChosen((prev) => ({ ...prev, [sourceId]: { ...(prev[sourceId] ?? {}), [network]: text } }));
  };

  const missingCount = workList.reduce(
    (sum, { sourceId, networks }) => sum + networks.filter((net) => !(chosen[sourceId]?.[net]?.trim())).length,
    0,
  );

  if (workList.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No approved posts yet — approve at least one adapted image in the previous stage, then
          come back to write its captions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="text-sm text-muted-foreground">
          {workList.length} approved image{workList.length === 1 ? '' : 's'} ·{' '}
          {missingCount > 0 ? `${missingCount} caption${missingCount === 1 ? '' : 's'} still empty` : 'all captions set'}
        </p>
        <Button
          size="sm"
          onClick={() => void generateAll()}
          disabled={running}
          className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-cyan-500 to-violet-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {running && progress ? `Generating ${progress.done}/${progress.total}...` : 'Generate all captions'}
        </Button>
      </div>

      {byNetwork.map(([networkId, sourceIds]) => {
        const net = getNetwork(networkId as OmniNetworkId);
        const Icon = net.icon;
        const cap = NETWORK_CAPS[networkId] ?? 4000;
        return (
          <section key={networkId} className="rounded-xl border border-border bg-card p-3">
            <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold">
              <Icon className={cn('h-4 w-4', net.accent)} />
              {net.label}
            </h3>
            <div className="space-y-3">
              {sourceIds.map((sourceId) => {
                const cellKey = `${sourceId}:${networkId}`;
                const cellOptions = options[sourceId]?.[networkId] ?? [];
                const cellChosen = chosen[sourceId]?.[networkId] ?? '';
                const over = cellChosen.length > cap;
                return (
                  <div key={sourceId} className="flex gap-3 rounded-lg border border-border bg-background/40 p-2.5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted/40">
                      {thumbs[sourceId] ? (
                        <img src={thumbs[sourceId]} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full animate-pulse bg-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {cellOptions.length > 1 && (
                        <div className="space-y-1" role="group" aria-label={`${net.label} caption options`}>
                          {cellOptions.map((o, i) => (
                            <button
                              key={i}
                              aria-pressed={cellChosen === o}
                              onClick={() => setCaption(sourceId, networkId, o)}
                              className={cn(
                                'block w-full cursor-pointer rounded-md border px-2 py-1 text-left text-[11px] transition-colors duration-200',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40',
                                cellChosen === o ? 'border-cyan-500 bg-cyan-500/10 font-medium' : 'border-border hover:border-cyan-500/30',
                              )}
                            >
                              <span className="flex items-start gap-1.5">
                                {cellChosen === o && <Check className="mt-0.5 h-3 w-3 shrink-0 text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300" />}
                                <span>{o}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <Textarea
                        value={cellChosen}
                        onChange={(e) => setCaption(sourceId, networkId, e.target.value)}
                        placeholder={`Caption for ${net.label}...`}
                        className="min-h-[64px] text-xs focus-visible:ring-cyan-500/40"
                        aria-label={`${net.label} caption`}
                      />
                      <div className="flex items-center justify-between">
                        {/* CAP-02: platform character budget, live. */}
                        <span className={cn('text-[11px]', over ? 'font-semibold text-red-600 [[data-omni-theme=dark]_&]:text-red-400' : 'text-muted-foreground')}>
                          {cellChosen.length}/{cap}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void moreOptions(sourceId, networkId)}
                          disabled={busyCell === cellKey || running}
                          className="h-8 cursor-pointer gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          {busyCell === cellKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          More options
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (missingCount > 0) {
              toast.warning(`${missingCount} caption${missingCount === 1 ? ' is' : 's are'} still empty — those posts will use no caption.`);
            }
            onNext(options, chosen);
          }}
          disabled={running}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
