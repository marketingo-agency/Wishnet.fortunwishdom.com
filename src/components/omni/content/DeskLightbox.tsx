"use client";

/**
 * Desk lightbox: fullscreen viewer for a post's media (images + videos).
 * Arrow keys / buttons navigate when several files exist; dark backdrop keeps
 * the built-in close visible. Shared by the Queue, the compose sheet, and the
 * Content Library.
 */

import { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { LightboxItem } from './contentConstants';

export type { LightboxItem };

interface DeskLightboxProps {
  items: LightboxItem[];
  /** Index of the open item; null = closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

export function DeskLightbox({ items, index, onIndexChange }: DeskLightboxProps) {
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;

  const step = useCallback((delta: number) => {
    if (index === null || items.length < 2) return;
    onIndexChange((index + delta + items.length) % items.length);
  }, [index, items.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onIndexChange(null); }}>
      <DialogContent className="h-[92vh] w-[95vw] max-w-none border-none bg-black/95 p-0 text-white backdrop-blur-xl sm:rounded-xl">
        <DialogTitle className="sr-only">{item?.label ?? 'Media preview'}</DialogTitle>
        <DialogDescription className="sr-only">Fullscreen media preview. Use the arrow keys to browse.</DialogDescription>
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-6 sm:p-10">
          {item && (
            item.kind === 'video' ? (
              <video
                key={item.id}
                src={item.url}
                controls
                autoPlay
                playsInline
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : (
              <img
                key={item.id}
                src={item.url}
                alt={item.label ?? ''}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            )
          )}

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous media"
                className={cn(
                  'absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full',
                  'bg-white/10 text-white transition-colors duration-200 hover:bg-white/20',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next media"
                className={cn(
                  'absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full',
                  'bg-white/10 text-white transition-colors duration-200 hover:bg-white/20',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium">
                {(index ?? 0) + 1} / {items.length}
              </span>
            </>
          )}
          {item?.label && (
            <span className="absolute bottom-3 right-3 max-w-[50%] truncate rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
              {item.label}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

