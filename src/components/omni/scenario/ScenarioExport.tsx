"use client";

/**
 * Scenario Studio stage 4: the shot list + export. The scenario is a
 * complete, reusable artifact on its own; "Send to Video Studio" ships
 * DISABLED with an honest note until Phase 5 activates it (interim-terminal
 * rule — no dead ends).
 */

import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Clapperboard, Copy, ImageOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { pollKeyframes } from '@/hooks/omni/useScenario';
import type { OmniVideoScenario } from '@/hooks/omni';

interface ScenarioExportProps {
  scenario: OmniVideoScenario;
  onFinish: () => void;
  /** Present once Video Studio exists (Phase 5+); absent keeps the honest stub. */
  onSendToStudio?: () => void;
  finishing: boolean;
}

export function ScenarioExport({ scenario, onFinish, onSendToStudio, finishing }: ScenarioExportProps) {
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    const ids = scenario.scenes.map((s) => s.keyframe_asset_id).filter((x): x is string => !!x);
    if (ids.length === 0) return;
    void pollKeyframes(ids).then((results) => {
      const next: Record<number, string> = {};
      for (const scene of scenario.scenes) {
        const r = results.find((x) => x.id === scene.keyframe_asset_id);
        if (r?.status === 'done' && r.url) next[scene.idx] = r.url;
      }
      setThumbs(next);
    }).catch(() => { /* thumbnails are cosmetic here */ });
  }, [scenario.scenes]);

  const totalSeconds = scenario.scenes.reduce((sum, s) => sum + (s.duration_s || 0), 0);

  const copyShotList = async () => {
    const text = [
      `${scenario.title} (${scenario.scenes.length} scenes, ≈${totalSeconds}s)`,
      '',
      ...scenario.scenes.map((s) =>
        `Scene ${s.idx} · ${s.duration_s}s · ${s.camera ?? 'no camera note'}\nVISUAL: ${s.visual_prompt}\nNARRATION: ${s.narration || '(visual only)'}`,
      ),
    ].join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the shot list');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{scenario.title}</h2>
          <p className="text-xs text-muted-foreground">{scenario.scenes.length} scenes · ≈{totalSeconds}s</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void copyShotList()} className="h-8 cursor-pointer gap-1.5 text-xs">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy shot list'}
        </Button>
      </div>

      <div className="space-y-2">
        {scenario.scenes.map((scene) => (
          <div key={scene.idx} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
              {thumbs[scene.idx] ? (
                <img src={thumbs[scene.idx]} alt={`Scene ${scene.idx} keyframe`} className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">
                Scene {scene.idx} <span className="font-normal text-muted-foreground">· {scene.duration_s}s · {scene.camera ?? 'no camera note'}</span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{scene.visual_prompt}</p>
              {scene.narration && (
                <p className="mt-0.5 line-clamp-2 text-xs italic text-muted-foreground/80">“{scene.narration}”</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-stretch justify-end gap-2 border-t pt-4 sm:flex-row sm:items-center">
        {onSendToStudio ? (
          <Button
            variant="outline"
            onClick={onSendToStudio}
            disabled={finishing}
            className="cursor-pointer gap-1.5"
          >
            <Clapperboard className="h-4 w-4" />
            Send to Video Studio
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled
            aria-label="Send to Video Studio (lands in Phase 5 of this build)"
            className="cursor-not-allowed gap-1.5 opacity-65"
          >
            <Clapperboard className="h-4 w-4" />
            Send to Video Studio
            <span className="rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Phase 5</span>
          </Button>
        )}
        <Button
          onClick={onFinish}
          disabled={finishing}
          className="cursor-pointer gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {finishing ? 'Saving…' : 'Finish scenario'}
        </Button>
      </div>
    </div>
  );
}
