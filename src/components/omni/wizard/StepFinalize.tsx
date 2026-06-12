"use client";

/**
 * Step 12: finalize. Saves the approved set (images + chosen description +
 * per-network variants) into the Pulse Content Library.
 */

import { useState } from 'react';
import { CheckCircle2, Library, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFinalizeRun, type OmniRepurposedRef } from '@/hooks/omni';

interface StepFinalizeProps {
  runId: string;
  defaultTitle: string;
  chosenDescription: string;
  networks: string[];
  repurposed: OmniRepurposedRef[];
  approvedAssetIds: string[];
  onDone: () => void;
}

export function StepFinalize({ runId, defaultTitle, chosenDescription, networks, repurposed, approvedAssetIds, onDone }: StepFinalizeProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const finalize = useFinalizeRun();

  const approvedSet = new Set(approvedAssetIds);
  const posts = repurposed
    .filter((r) => approvedSet.has(r.asset_id))
    .map((r) => ({ network: r.network, asset_id: r.asset_id, caption: chosenDescription }));

  const handleFinalize = async () => {
    try {
      const res = await finalize.mutateAsync({
        runId,
        title: title.trim(),
        description: chosenDescription,
        networks,
        posts,
      });
      setSavedItemId(res.item_id);
    } catch {
      // Hook surfaces the toast.
    }
  };

  if (savedItemId) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center py-10 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold">Saved to the Content Library</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {posts.length} post{posts.length === 1 ? '' : 's'} across {networks.length} network{networks.length === 1 ? '' : 's'} are
          ready in Pulse. The Library browsing surface ships with the Pulse phase.
        </p>
        <Button onClick={onDone} className="mt-6 cursor-pointer bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
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

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Description</p>
        <p className="mt-1.5 text-sm">{chosenDescription}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p className="flex items-center gap-1.5 font-medium">
          <Library className="h-4 w-4 text-cyan-400" />
          What will be saved
        </p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>{posts.length} approved post variant{posts.length === 1 ? '' : 's'}</li>
          <li>Networks: {networks.join(', ')}</li>
          <li>One Content Library item linking everything to this run</li>
        </ul>
      </div>

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
    </div>
  );
}
