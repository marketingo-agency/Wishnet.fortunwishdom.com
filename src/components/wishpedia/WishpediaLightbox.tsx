'use client';

import { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import type { WishpediaEntryImage } from '@/types/wishpedia';
import { cn } from '@/lib/utils';

interface WishpediaLightboxProps {
  images: WishpediaEntryImage[];
  activeIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}

const ANGLE_LABELS: Record<string, string> = {
  front: 'Front', back: 'Back', left: 'Left', right: 'Right', top: 'Top', bottom: 'Bottom',
};

export function WishpediaLightbox({ images, activeIndex, open, onOpenChange, onNavigate }: WishpediaLightboxProps) {
  const current = images[activeIndex];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < images.length - 1;

  const goPrev = useCallback(() => { if (hasPrev) onNavigate(activeIndex - 1); }, [hasPrev, activeIndex, onNavigate]);
  const goNext = useCallback(() => { if (hasNext) onNavigate(activeIndex + 1); }, [hasNext, activeIndex, onNavigate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, goPrev, goNext]);

  if (!current) return null;

  const angleLabel = current.angle ? ANGLE_LABELS[current.angle] ?? current.angle : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] w-full h-[92vh] p-0 bg-black/95 backdrop-blur-xl border-white/[0.08] flex items-center justify-center overflow-hidden [&>button]:hidden"
      >
        {/* Accessible title/description (visually hidden) — Radix requires a DialogTitle */}
        <DialogTitle className="sr-only">
          {current.original_name || (angleLabel ? `${angleLabel} view` : 'Image preview')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Full-screen image viewer. Use the left and right arrow keys to navigate, Escape to close.
        </DialogDescription>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Prev */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 min-h-[44px] min-w-[44px] rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Next */}
        {hasNext && (
          <button
            onClick={goNext}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 min-h-[44px] min-w-[44px] rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Image */}
        <img
          src={getWishpediaImageUrl(current.storage_path)}
          alt={current.original_name}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />

        {/* Bottom info pill */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
          {angleLabel && (
            <span className={cn(
              "inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
              "bg-white/[0.1] backdrop-blur-sm border border-white/[0.12] text-white/70"
            )}>
              {angleLabel}
            </span>
          )}
          <span className="text-[10px] text-white/40 tabular-nums">
            {activeIndex + 1} / {images.length}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
