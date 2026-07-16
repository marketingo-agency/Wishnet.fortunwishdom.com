"use client";

/**
 * RepurposeModeWizard: Images Repurposing (Mode 3).
 * One gathering screen: pick any number of source images (upload, Files
 * library, Content Library), give the set an objective, then the run is
 * created in mode 'repurposing' with the sources as selected assets and
 * handed to the Omni Images wizard at step 7 (descriptions onward).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCreateOmniRun, useUpdateOmniRun, uploadSourceAsset, referenceLibraryImage } from '@/hooks/omni';
import { REPURPOSING_FLOOR_STEP } from '../stepRegistry';
import { RepurposeSourcePicker } from './RepurposeSourcePicker';
import { referenceContentLibraryAsset, type PendingSource } from './useRepurposeSources';

const DEFAULT_OBJECTIVE = 'Repurpose the selected images for our social networks';

interface RepurposeModeWizardProps {
  onExit: () => void;
  onHandoff: (runId: string) => void;
}

export function RepurposeModeWizard({ onExit, onHandoff }: RepurposeModeWizardProps) {
  const createRun = useCreateOmniRun();
  const updateRun = useUpdateOmniRun();

  const [sources, setSources] = useState<PendingSource[]>([]);
  const [objective, setObjective] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const selectedKeys = new Set(sources.map((s) => s.key));

  const addSources = (next: PendingSource[]) => {
    setSources((prev) => {
      const existing = new Set(prev.map((s) => s.key));
      return [...prev, ...next.filter((s) => !existing.has(s.key))];
    });
  };

  const removeSource = (key: string) => {
    setSources((prev) => {
      const target = prev.find((s) => s.key === key);
      if (target?.kind === 'upload') URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.key !== key);
    });
  };

  const handleContinue = async () => {
    if (sources.length === 0 || isBusy) return;
    setIsBusy(true);
    try {
      const trimmed = objective.trim() || DEFAULT_OBJECTIVE;
      const run = await createRun.mutateAsync({
        mode: 'repurposing',
        title: trimmed.slice(0, 80),
        step_state: {},
      });

      const assetIds: string[] = [];
      for (const source of sources) {
        if (source.kind === 'upload') {
          assetIds.push(await uploadSourceAsset(run.id, source.file));
        } else if (source.kind === 'files') {
          assetIds.push(await referenceLibraryImage(run.id, source.row));
        } else {
          assetIds.push(await referenceContentLibraryAsset(run.id, source.asset, source.label));
        }
      }

      await updateRun.mutateAsync({
        runId: run.id,
        current_step: REPURPOSING_FLOOR_STEP,
        step_state: {
          objective: trimmed,
          locked_prompt: trimmed,
          generated_asset_ids: assetIds,
          selected_asset_ids: assetIds,
        },
      });
      onHandoff(run.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start the repurposing run');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Images Repurposing</p>
          <h1 className="truncate text-sm font-semibold sm:text-base">Gather the images to repurpose</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          aria-label="Exit wizard"
          className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <RepurposeSourcePicker selectedKeys={selectedKeys} onAdd={addSources} onToggleOff={removeSource} />

          {sources.length > 0 && (
            <section className="space-y-2" aria-label="Selected images">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected ({sources.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {sources.map((source) => (
                  <div key={source.key} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                    {source.previewUrl ? (
                      <img src={source.previewUrl} alt={source.label} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted p-1 text-center text-[9px] text-muted-foreground">
                        {source.label}
                      </div>
                    )}
                    <button
                      onClick={() => removeSource(source.key)}
                      aria-label={`Remove ${source.label}`}
                      className={cn(
                        'absolute right-0.5 top-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white',
                        'opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="space-y-2">
            <Label htmlFor="repurpose-objective">What is this content for? (optional)</Label>
            <Textarea
              id="repurpose-objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder={DEFAULT_OBJECTIVE}
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Used to write the social descriptions in the next step.
            </p>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button
              onClick={() => void handleContinue()}
              disabled={sources.length === 0 || isBusy}
              className="cursor-pointer gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white transition-all duration-300 hover:opacity-90"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isBusy ? 'Preparing the run' : `Continue with ${sources.length || 'the'} image${sources.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
