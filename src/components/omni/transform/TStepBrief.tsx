"use client";

/**
 * Transform step 3: describe the transformation (AI optimization on
 * the input). Can be left empty for pure upscaling runs.
 */

import { useState } from 'react';
import { ArrowRight, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOptimizeDraft } from '@/hooks/omni';

interface TStepBriefProps {
  initialValue: string;
  onNext: (brief: string) => void;
}

export function TStepBrief({ initialValue, onNext }: TStepBriefProps) {
  const [value, setValue] = useState(initialValue);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { optimizeDraft } = useOptimizeDraft();

  const handleOptimize = async () => {
    if (!value.trim() || isOptimizing) return;
    setIsOptimizing(true);
    try {
      const improved = await optimizeDraft(value.trim());
      if (improved) setValue(improved);
    } catch {
      // Hook toasts.
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Describe how the image should change. Leave this empty if you only want to upscale.
      </p>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Example: align the colors with the Fortun palette, add a soft glow around the character, make the background a starlit sky..."
          className="min-h-[160px] resize-y pr-12 focus-visible:ring-blue-500/50"
          disabled={isOptimizing}
          aria-label="Transformation brief"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOptimize}
          disabled={!value.trim() || isOptimizing}
          aria-label="Optimize"
          title="Optimize"
          className="absolute bottom-2 right-2 h-9 w-9 cursor-pointer text-violet-400 transition-colors duration-200 hover:text-violet-300"
        >
          {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => onNext(value.trim())}
          disabled={isOptimizing}
          className="cursor-pointer gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {value.trim() ? 'Continue' : 'Continue (upscale only)'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
