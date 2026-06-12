"use client";

/**
 * Transform step 2: vision analysis of the source image with the
 * Fortun-universe relation (RAG-grounded) and improvement suggestions.
 * Suggestion chips prefill the transformation brief in step 3.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BrainCircuit, Heart, Loader2, RefreshCw, Sparkles, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAnalyzeImage, getAssetSignedUrl, type OmniAnalysis } from '@/hooks/omni';
import { supabase } from '@/integrations/supabase/client';

interface TStepAnalysisProps {
  sourceAssetId: string;
  initialAnalysis: OmniAnalysis | null;
  onNext: (analysis: OmniAnalysis, prefillBrief: string) => void;
}

export function TStepAnalysis({ sourceAssetId, initialAnalysis, onNext }: TStepAnalysisProps) {
  const analyze = useAnalyzeImage();
  const [analysis, setAnalysis] = useState<OmniAnalysis | null>(initialAnalysis);
  const [isBusy, setIsBusy] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [prefill, setPrefill] = useState('');
  const autoRanRef = useRef(false);

  const run = async () => {
    setIsBusy(true);
    try {
      const result = await analyze.mutateAsync(sourceAssetId);
      setAnalysis(result);
    } catch {
      // Hook toasts.
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!initialAnalysis && !autoRanRef.current) {
      autoRanRef.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- analyze once on first visit
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.from('omni_assets').select('storage_path').eq('id', sourceAssetId).maybeSingle();
      const path = (data as { storage_path: string | null } | null)?.storage_path;
      const url = path ? await getAssetSignedUrl(path) : null;
      if (active) setSourceUrl(url);
    })();
    return () => { active = false; };
  }, [sourceAssetId]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
          {sourceUrl ? (
            <img src={sourceUrl} alt="Source image" className="h-full w-full object-cover" />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {isBusy || !analysis ? (
            <div className="space-y-2" aria-label="Analyzing the image">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing with vision, Heart rules, and the knowledge base...
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{analysis.description}</p>
          )}
        </div>
      </div>

      {analysis && !isBusy && (
        <>
          <div
            className={cn(
              'rounded-xl border p-4',
              analysis.universe_relation.related
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-border bg-muted/30',
            )}
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className={cn('h-4 w-4', analysis.universe_relation.related ? 'text-emerald-400' : 'text-muted-foreground')} />
              {analysis.universe_relation.related ? 'Related to the Fortun universe' : 'Not clearly related to the Fortun universe'}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">{analysis.universe_relation.conclusion}</p>
            <p className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" /> {analysis.retrieval.heart_rules} Heart rules</span>
              <span className="flex items-center gap-1"><BrainCircuit className="h-3 w-3 text-violet-400" /> {analysis.retrieval.brain_chunks} knowledge chunks</span>
            </p>
          </div>

          {analysis.suggestions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Suggested improvements (tap to use as your brief)</p>
              <div className="flex flex-col gap-2">
                {analysis.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setPrefill(s.text)}
                    aria-pressed={prefill === s.text}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-lg border bg-card p-3 text-left text-sm transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      prefill === s.text ? 'border-blue-500/60 shadow-md shadow-blue-500/10' : 'border-border hover:border-blue-500/30',
                    )}
                  >
                    {s.type === 'upscale'
                      ? <ZoomIn className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                      : <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />}
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => void run()}
          disabled={isBusy}
          className="cursor-pointer gap-1.5 transition-colors duration-200"
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Re-analyze
        </Button>
        <Button
          onClick={() => analysis && onNext(analysis, prefill)}
          disabled={!analysis || isBusy}
          className="cursor-pointer gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
