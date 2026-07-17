"use client";

/**
 * Re-run with edits (HIST-15): retake opens this editable seed dialog before
 * the clone is inserted. Title, objective, and the creative prompt are
 * editable; model selections can be dropped so Stage 2 re-picks fresh.
 */

import { useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { OmniImagesState, OmniRun } from '@/hooks/omni';
import type { RetakeOverrides } from './useOmniHistory';

interface RetakeRunDialogProps {
  run: OmniRun | null;
  busy: boolean;
  onConfirm: (run: OmniRun, overrides: RetakeOverrides) => void;
  onClose: () => void;
}

export function RetakeRunDialog({ run, busy, onConfirm, onClose }: RetakeRunDialogProps) {
  const state = (run?.step_state ?? {}) as OmniImagesState;
  const isTransform = run?.mode === 'transform_upscale';
  const sourcePrompt = isTransform ? state.transform_prompt : state.locked_prompt;
  const hasModels = (state.model_selections?.length ?? 0) > 0;

  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [prompt, setPrompt] = useState('');
  const [keepModels, setKeepModels] = useState(true);

  // Re-seed the form whenever the dialog opens for a different run.
  useEffect(() => {
    if (!run) return;
    const s = (run.step_state ?? {}) as OmniImagesState;
    setTitle(run.title ?? '');
    setObjective(s.objective ?? '');
    setPrompt((run.mode === 'transform_upscale' ? s.transform_prompt : s.locked_prompt) ?? '');
    setKeepModels(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset per run
  }, [run?.id]);

  if (!run) return null;

  const handleConfirm = () => {
    if (busy) return;
    onConfirm(run, {
      title: title.trim() || undefined,
      objective: objective.trim() || undefined,
      // Only report an override when the text actually changed, so an
      // untouched prompt keeps its provenance (Promptor-engineered prompts
      // are not re-grounded by the edge).
      prompt: prompt.trim() && prompt.trim() !== (sourcePrompt ?? '').trim() ? prompt.trim() : undefined,
      keepModels,
    });
  };

  return (
    <Dialog open={!!run} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-10">Retake as a new run</DialogTitle>
          <DialogDescription>
            Starts a fresh run seeded with these inputs. The original run and its images stay untouched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="retake-title">Title</Label>
            <Input
              id="retake-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled run"
              maxLength={200}
            />
          </div>

          {(state.objective !== undefined || !isTransform) && (
            <div className="space-y-1.5">
              <Label htmlFor="retake-objective">Objective</Label>
              <Textarea
                id="retake-objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={2}
                className="resize-none"
                placeholder="What is this content for?"
              />
            </div>
          )}

          {sourcePrompt !== undefined && (
            <div className="space-y-1.5">
              <Label htmlFor="retake-prompt">{isTransform ? 'Transformation prompt' : 'Creative prompt'}</Label>
              <Textarea
                id="retake-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Editing the prompt re-applies the Heart brand rules on generation.
              </p>
            </div>
          )}

          {hasModels && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <Label htmlFor="retake-keep-models" className="text-sm">Keep model selections</Label>
                <p className="text-xs text-muted-foreground">
                  Off starts the engine stage from scratch.
                </p>
              </div>
              <Switch id="retake-keep-models" checked={keepModels} onCheckedChange={setKeepModels} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={busy} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={busy}
            className="cursor-pointer gap-1.5 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {busy ? 'Creating…' : 'Create retake'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
