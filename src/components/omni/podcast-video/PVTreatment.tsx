"use client";

/**
 * PVTreatment (stage 2): what this episode becomes. The audiogram builds
 * inline (stage 3); highlight clips cut from it; talking-persona promos ride
 * the Videos track's Animate wizard (persona portraits + lipsync live there).
 */

import { Clapperboard, ExternalLink, Film, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PVTreatmentProps {
  onNext: () => void;
  onOpenAnimate: () => void;
}

export function PVTreatment({ onNext, onOpenAnimate }: PVTreatmentProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
            <Film className="h-4 w-4 text-pink-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Full-episode audiogram</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Cover art + episode audio composed into one MP4 for YouTube. The canvas follows the
              cover&apos;s aspect; the audio sets the length.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
            <Scissors className="h-4 w-4 text-rose-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Highlight clips</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pick time windows and cut promo clips from the audiogram. Vertical reframes and
              captions ride the Videos track&apos;s Repurpose &amp; Enhance afterwards.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
            <Clapperboard className="h-4 w-4 text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Talking persona promo</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A persona portrait speaking a promo line (Kling AI Avatar + ElevenLabs). This lives in
              the Videos track&apos;s Animate mode — pick the persona&apos;s Wishpedia art there.
            </p>
            <Button variant="outline" size="sm" onClick={onOpenAnimate} className="mt-2 h-7 cursor-pointer gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              Open Animate
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          className="cursor-pointer bg-gradient-to-r from-pink-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Build the audiogram
        </Button>
      </div>
    </div>
  );
}
