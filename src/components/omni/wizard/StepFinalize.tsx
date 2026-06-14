"use client";

/**
 * Step 11: finalize. A visual recap of the approved posts, grouped by social
 * network — each card shows the image, its size, and its unique per-network
 * caption — then saves everything to the Pulse Content Library.
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Library, Loader2, Maximize2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getNetwork, getPreset, type OmniNetworkId } from '../omniNetworkPresets';
import { getAssetSignedUrl, useFinalizeRun, type OmniRepurposedRef } from '@/hooks/omni';
import { supabase } from '@/integrations/supabase/client';

interface StepFinalizeProps {
  runId: string;
  defaultTitle: string;
  chosenDescription: string;
  /** Per base-image, per-network captions: [source_asset_id][network] → caption. */
  chosenCaptions?: Record<string, Record<string, string>>;
  networks: string[];
  repurposed: OmniRepurposedRef[];
  approvedAssetIds: string[];
  onDone: () => void;
}

export function StepFinalize({ runId, defaultTitle, chosenDescription, chosenCaptions, networks, repurposed, approvedAssetIds, onDone }: StepFinalizeProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const finalize = useFinalizeRun();

  const approvedRefs = useMemo(() => {
    const approvedSet = new Set(approvedAssetIds);
    return repurposed.filter((r) => approvedSet.has(r.asset_id));
  }, [repurposed, approvedAssetIds]);

  const captionFor = (ref: OmniRepurposedRef) =>
    chosenCaptions?.[ref.source_asset_id]?.[ref.network] ?? chosenDescription ?? '';

  const posts = approvedRefs.map((r) => ({ network: r.network, asset_id: r.asset_id, caption: captionFor(r) }));

  // Networks that actually have approved posts, in the order they were chosen.
  const groups = useMemo(() => {
    const order = networks.length > 0 ? networks : [...new Set(approvedRefs.map((r) => r.network))];
    return order
      .map((net) => ({ net, refs: approvedRefs.filter((r) => r.network === net) }))
      .filter((g) => g.refs.length > 0);
  }, [networks, approvedRefs]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const ids = approvedRefs.map((r) => r.asset_id);
      if (ids.length === 0) return;
      const { data } = await supabase.from('omni_assets').select('id, storage_path').in('id', ids);
      const entries = await Promise.all(
        ((data ?? []) as { id: string; storage_path: string | null }[]).map(async (a) => {
          const url = a.storage_path ? await getAssetSignedUrl(a.storage_path) : null;
          return [a.id, url] as const;
        }),
      );
      if (active) setUrls(Object.fromEntries(entries.filter(([, u]) => u) as [string, string][]));
    })();
    return () => { active = false; };
  }, [approvedRefs]);

  const handleFinalize = async () => {
    try {
      const res = await finalize.mutateAsync({ runId, title: title.trim(), description: chosenDescription, networks, posts });
      setSavedItemId(res.item_id);
    } catch {
      // Hook surfaces the toast.
    }
  };

  if (savedItemId) {
    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
        className="flex flex-col items-center py-10 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold">Saved to the Content Library</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {posts.length} post{posts.length === 1 ? '' : 's'} across {groups.length} network{groups.length === 1 ? '' : 's'} are ready in Pulse.
        </p>
        <Button onClick={onDone} className="mt-6 cursor-pointer bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90">
          Back to Omni Home
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="omni-item-title" className="text-sm font-medium">Library item title</label>
        <Input
          id="omni-item-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this content set..."
          className="focus-visible:ring-cyan-500/50"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {posts.length} approved post{posts.length === 1 ? '' : 's'} across {groups.length} network{groups.length === 1 ? '' : 's'}.
      </p>

      {groups.map(({ net, refs }) => {
        const network = getNetwork(net as OmniNetworkId);
        const Icon = network.icon;
        return (
          <section key={net} className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Icon className={cn('h-4 w-4', network.accent)} />
              {network.label}
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                {refs.length} post{refs.length === 1 ? '' : 's'}
              </span>
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {refs.map((ref) => {
                const preset = getPreset(ref.network as OmniNetworkId, ref.preset_id);
                const url = urls[ref.asset_id];
                const caption = captionFor(ref);
                return (
                  <div key={ref.asset_id} className="flex gap-3 rounded-lg border border-border bg-background/40 p-2">
                    <div className="group/thumb relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted/40">
                      {url ? (
                        <img src={url} alt={`${network.label} ${preset?.label ?? ''}`} className="h-full w-full object-contain" />
                      ) : (
                        <div className="h-full w-full animate-pulse bg-muted" />
                      )}
                      {url && (
                        <button
                          type="button"
                          onClick={() => setLightbox(url)}
                          aria-label="View full size"
                          className="absolute right-1 top-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/60 bg-black/55 text-white opacity-100 transition-opacity hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 sm:opacity-0 sm:group-hover/thumb:opacity-100"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {preset?.label} · {preset ? `${preset.width}×${preset.height}` : ''}
                      </p>
                      <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs">{caption || <span className="text-muted-foreground">No caption</span>}</p>
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
          onClick={handleFinalize}
          disabled={!title.trim() || posts.length === 0 || finalize.isPending}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {finalize.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Library className="h-4 w-4" />}
          Save to the Content Library
        </Button>
      </div>

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="flex max-h-[95vh] max-w-[95vw] items-center justify-center overflow-hidden border-white/10 bg-black/95 p-2 text-white backdrop-blur-sm sm:max-w-[90vw]">
          <DialogTitle className="sr-only">Full-size preview</DialogTitle>
          {lightbox && <img src={lightbox} alt="Full size preview" className="max-h-[90vh] w-auto max-w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
