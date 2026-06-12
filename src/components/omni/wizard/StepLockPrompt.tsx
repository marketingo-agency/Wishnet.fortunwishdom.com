"use client";

/**
 * Step 2: Promptor engineers the objective into a structured prompt;
 * the user reviews, edits if needed, and locks it.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, Lock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useOptimizeDraft } from '@/hooks/promptor';

interface StepLockPromptProps {
  objective: string;
  initialOptimized: string;
  onLock: (optimizedPrompt: string, lockedPrompt: string) => void;
}

export function StepLockPrompt({ objective, initialOptimized, onLock }: StepLockPromptProps) {
  const [prompt, setPrompt] = useState(initialOptimized);
  // Busy state is tracked locally instead of using the hook's isPending:
  // auto-running a mutation inside the mount effect under StrictMode can leave
  // the hook's pending snapshot stale after the effect teardown/resubscribe.
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { optimizeDraft } = useOptimizeDraft();
  const autoRanRef = useRef(false);

  const runOptimize = async () => {
    setIsOptimizing(true);
    try {
      const improved = await optimizeDraft(
        `${objective}\n\n(Rewrite this as a single, well-structured image generation prompt: subject, setting, style, lighting, mood, composition. Output only the prompt.)`,
      );
      if (improved) setPrompt(improved);
    } catch {
      // Hook toasts; the user can retry or edit manually.
      setPrompt((prev) => prev || objective);
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    if (!initialOptimized && !autoRanRef.current) {
      autoRanRef.current = true;
      void runOptimize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run the auto-optimize once on mount
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Your objective</p>
        <p className="mt-1 text-sm">{objective}</p>
      </div>

      {isOptimizing && !prompt ? (
        <div className="space-y-2" aria-label="Engineering the prompt">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <p className="text-xs text-muted-foreground">Promptor is engineering your prompt with Heart rules and Brain context...</p>
        </div>
      ) : (
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[200px] resize-y font-mono text-sm focus-visible:ring-cyan-500/50"
          disabled={isOptimizing}
          aria-label="Engineered prompt"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={runOptimize}
          disabled={isOptimizing}
          className="cursor-pointer gap-2 transition-colors duration-200"
        >
          {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Re-optimize
        </Button>
        <Button
          onClick={() => onLock(prompt.trim(), prompt.trim())}
          disabled={!prompt.trim() || isOptimizing}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          <Lock className="h-4 w-4" />
          Lock prompt and continue
        </Button>
      </div>
    </div>
  );
}
