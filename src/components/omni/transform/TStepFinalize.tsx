"use client";

/**
 * Transform step 6: save the locked results to the Pulse Content Library
 * directly (item-only), or continue into the Omni Images repurposing
 * workflow (steps 7 to 12) on the same run.
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Library, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callOmni } from '@/lib/omniApi';
import { toast } from 'sonner';

interface TStepFinalizeProps {
  runId: string;
  defaultTitle: string;
  description: string;
  selectedAssetIds: string[];
  onSaved: () => void;
  onContinueToRepurposing: () => void;
}

export function TStepFinalize({ runId, defaultTitle, description, selectedAssetIds, onSaved, onContinueToRepurposing }: TStepFinalizeProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleDirectSave = async () => {
    setIsSaving(true);
    try {
      await callOmni('finalize-run', {
        run_id: runId,
        title: title.trim(),
        description,
        save_mode: 'item_only',
        asset_ids: selectedAssetIds,
      });
      setSaved(true);
    } catch (e) {
      toast.error(`Save failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (saved) {
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
          {selectedAssetIds.length} transformed image{selectedAssetIds.length === 1 ? '' : 's'} saved.
          Browse and schedule the set from the Content Library.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/ai-agents/omni?track=content&mode=content_library">Open the Content Library</Link>
          </Button>
          <Button onClick={onSaved} className="cursor-pointer bg-gradient-to-r from-blue-500 to-violet-600 text-white">
            Back to Omni Home
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="transform-item-title" className="text-sm font-medium">Library item title</label>
        <Input
          id="transform-item-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this content set..."
          className="focus-visible:ring-blue-500/50"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p className="font-medium">{selectedAssetIds.length} locked image{selectedAssetIds.length === 1 ? '' : 's'}</p>
        <p className="mt-1 text-muted-foreground">
          Save them to the Content Library now, or continue into the repurposing workflow to
          produce per-network formats with descriptions first.
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleDirectSave}
          disabled={!title.trim() || selectedAssetIds.length === 0 || isSaving}
          className="cursor-pointer gap-2 transition-colors duration-200"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Library className="h-4 w-4" />}
          Save to the Content Library
        </Button>
        <Button
          onClick={onContinueToRepurposing}
          disabled={selectedAssetIds.length === 0 || isSaving}
          className="cursor-pointer gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to repurposing
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
