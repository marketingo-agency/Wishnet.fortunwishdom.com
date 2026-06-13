"use client";

/**
 * Step 1: describe what to generate or define the images objective.
 * One-click Promptor optimization on the input (Pixel wand pattern).
 */

import { useState } from 'react';
import { ArrowRight, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOptimizeDraft } from '@/hooks/promptor';
import type { OmniWishReferenceRef } from '@/hooks/omni';
import { OmniWishReferencePicker } from './OmniWishReferencePicker';

interface StepObjectiveProps {
  initialValue: string;
  initialReferences: OmniWishReferenceRef[];
  onNext: (objective: string, references: OmniWishReferenceRef[]) => void;
}

export function StepObjective({ initialValue, initialReferences, onNext }: StepObjectiveProps) {
  const [value, setValue] = useState(initialValue);
  const [references, setReferences] = useState<OmniWishReferenceRef[]>(initialReferences);
  const { optimizeDraft, isOptimizing } = useOptimizeDraft();

  const handleOptimize = async () => {
    if (!value.trim() || isOptimizing) return;
    try {
      const improved = await optimizeDraft(value.trim());
      if (improved) setValue(improved);
    } catch {
      // Hook surfaces its own toast.
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Describe the visual you want, or the objective behind it. Heart rules and brand knowledge
        are applied when the prompt is engineered in the next step.
      </p>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Example: A hero visual for the new memory-keeper plush launch, warm and magical, aimed at parents..."
          className="min-h-[180px] resize-y pr-12 focus-visible:ring-cyan-500/50"
          disabled={isOptimizing}
          aria-label="Images objective"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOptimize}
          disabled={!value.trim() || isOptimizing}
          aria-label="Optimize with Promptor"
          title="Optimize with Promptor"
          className="absolute bottom-2 right-2 h-9 w-9 cursor-pointer text-violet-400 transition-colors duration-200 hover:text-violet-300"
        >
          {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        </Button>
      </div>

      <OmniWishReferencePicker value={references} onChange={setReferences} disabled={isOptimizing} />

      <div className="flex justify-end">
        <Button
          onClick={() => onNext(value.trim(), references)}
          disabled={!value.trim() || isOptimizing}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
