"use client";

/**
 * Stage 1 "Brief" (Plan 1 Phase 6): ONE screen for the one decision "what to
 * make" — merges the old objective + lock-prompt steps (UX-01: a single
 * Promptor call instead of two paid detours).
 *
 * - Objective textarea + "Inspire me" (knowledge-mined ideas fill the field).
 * - "Engineer prompt" runs Promptor ONCE; the result is editable in place and
 *   "Re-optimize" feeds the EDITED text back (UX-06), never the stale input.
 * - Continue works with or without engineering: un-engineered briefs continue
 *   as provenance 'raw' (the edge injects the Heart digest server-side).
 * - Draft protection: a debounced sessionStorage stash survives refreshes and
 *   accidental exits before the first persist (UX-05).
 * - Wishpedia reference picker with the model-restriction note inline (UX-20).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOptimizeDraft } from '@/hooks/promptor';
import type { OmniImagesState, OmniWishReferenceRef } from '@/hooks/omni';
import { InspireMe } from './InspireMe';
import { OmniWishReferencePicker } from './OmniWishReferencePicker';

interface StageBriefProps {
  runId: string | null;
  initialObjective: string;
  initialOptimized: string;
  initialReferences: OmniWishReferenceRef[];
  onNext: (patch: Pick<OmniImagesState,
    'objective' | 'optimized_prompt' | 'locked_prompt' | 'prompt_provenance' | 'reference_image_refs'
  >) => void;
}

interface BriefDraft {
  objective: string;
  prompt: string;
}

const draftKey = (runId: string | null) => `omni-brief-draft:${runId ?? 'new'}`;

export function StageBrief({ runId, initialObjective, initialOptimized, initialReferences, onNext }: StageBriefProps) {
  const [objective, setObjective] = useState(initialObjective);
  const [prompt, setPrompt] = useState(initialOptimized);
  const [references, setReferences] = useState<OmniWishReferenceRef[]>(initialReferences);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { optimizeDraft } = useOptimizeDraft();

  // Restore an unsaved draft once (only when the persisted state has nothing —
  // persisted state always wins over the stash).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (initialObjective || initialOptimized) return;
    try {
      const raw = sessionStorage.getItem(draftKey(runId));
      if (raw) {
        const draft = JSON.parse(raw) as BriefDraft;
        if (draft.objective) setObjective(draft.objective);
        if (draft.prompt) setPrompt(draft.prompt);
      }
    } catch {
      // Corrupt stash: ignore, start clean.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, []);

  // Debounced stash (UX-05): typing never outlives a refresh unsaved.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (objective.trim() || prompt.trim()) {
          sessionStorage.setItem(draftKey(runId), JSON.stringify({ objective, prompt } satisfies BriefDraft));
        }
      } catch {
        // Storage full/blocked: draft protection degrades silently.
      }
    }, 500);
    return () => clearTimeout(t);
  }, [objective, prompt, runId]);

  const engineer = async (source: string) => {
    if (!source.trim() || isOptimizing) return;
    setIsOptimizing(true);
    try {
      const improved = await optimizeDraft(
        `${source.trim()}\n\n(Rewrite this as a single, well-structured image generation prompt: subject, setting, style, lighting, mood, composition. Output only the prompt.)`,
      );
      if (improved) setPrompt(improved);
    } catch {
      // Hook toasts; the user can retry or continue with the raw objective.
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleContinue = () => {
    const finalPrompt = prompt.trim() || objective.trim();
    try {
      sessionStorage.removeItem(draftKey(runId));
    } catch {
      // Best-effort cleanup.
    }
    onNext({
      objective: objective.trim(),
      optimized_prompt: prompt.trim(),
      locked_prompt: finalPrompt,
      // Promptor-engineered prompts are Heart-grounded upstream; raw ones get
      // the server-side digest injection at variant-submit.
      prompt_provenance: prompt.trim() ? 'promptor' : 'raw',
      reference_image_refs: references,
    });
  };

  const canContinue = useMemo(() => objective.trim().length > 0 && !isOptimizing, [objective, isOptimizing]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Describe the visual you want, or the objective behind it. Engineer it into a structured
        prompt with Promptor, edit it in place, or continue with your own words.
      </p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="brief-objective" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Objective
          </label>
          <InspireMe onPick={(picked) => setObjective(picked)} disabled={isOptimizing} />
        </div>
        <Textarea
          id="brief-objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Example: A hero visual for the new memory-keeper plush launch, warm and magical, aimed at parents..."
          className="min-h-[120px] resize-y focus-visible:ring-cyan-500/50"
          disabled={isOptimizing}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="brief-prompt" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Engineered prompt <span className="normal-case font-normal">(optional)</span>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void engineer(prompt.trim() || objective)}
            disabled={!objective.trim() || isOptimizing}
            className="h-7 cursor-pointer gap-1.5 text-xs text-violet-600 transition-colors duration-200 hover:text-violet-500 [[data-omni-theme=dark]_&]:text-violet-400 [[data-omni-theme=dark]_&]:hover:text-violet-300"
          >
            {isOptimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : prompt.trim() ? <RefreshCw className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
            {prompt.trim() ? 'Re-optimize' : 'Engineer with Promptor'}
          </Button>
        </div>
        {isOptimizing && !prompt ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3" aria-label="Engineering the prompt">
            <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-5/6 animate-pulse rounded bg-muted" />
            <p className="text-xs text-muted-foreground">Promptor is engineering your prompt with Heart rules and Brain context...</p>
          </div>
        ) : (
          <Textarea
            id="brief-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Engineer the objective above, or leave empty to generate straight from your own words."
            className="min-h-[140px] resize-y font-mono text-sm focus-visible:ring-cyan-500/50"
            disabled={isOptimizing}
          />
        )}
        {/* Re-optimize feeds the EDITED text (UX-06), so manual tweaks are never lost. */}
        {prompt.trim() && (
          <p className="text-[11px] text-muted-foreground">
            Edit freely — Re-optimize refines your edited text, not the original objective.
          </p>
        )}
      </div>

      <OmniWishReferencePicker value={references} onChange={setReferences} disabled={isOptimizing} />
      {references.length > 0 && (
        <p className="-mt-2 text-[11px] text-muted-foreground">
          Reference images route generation to edit-capable models in the next stage — text-to-image
          models cannot use references (UX note: your model choices adapt automatically).
        </p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {prompt.trim() ? 'Use this prompt' : 'Continue'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
