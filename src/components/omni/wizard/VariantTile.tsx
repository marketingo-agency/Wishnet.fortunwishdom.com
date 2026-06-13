"use client";

/**
 * One live variant tile in the generation grid: skeleton while the queue job
 * runs, then the image with per-image actions (select / regenerate variation /
 * discard / download / save to Files library).
 */

import { useState } from 'react';
import { CheckCircle2, Download, Loader2, Maximize2, RefreshCw, Save, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { downloadFromUrl } from '@/lib/downloadFromUrl';
import type { VariantView } from '@/hooks/omni';

interface VariantTileProps {
  variant: VariantView;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
  onSaveToFiles: () => void;
  isSaving: boolean;
}

const TileAction = ({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="h-7 w-7 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

export function VariantTile({ variant, isSelected, onToggleSelect, onRegenerate, onDiscard, onSaveToFiles, isSaving }: VariantTileProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Real download: window.open just navigates to the signed URL (renders the
  // image inline). Fetch to a blob and save via a same-origin object URL.
  const handleDownload = async () => {
    if (!variant.url) return;
    // Match the extension on the path only, not the ?token= query string.
    const path = variant.url.split('?')[0];
    const ext = path.endsWith('.webp') ? 'webp' : /\.jpe?g$/i.test(path) ? 'jpg' : 'png';
    const safeName = variant.modelName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'image';
    try {
      await downloadFromUrl(variant.url, `omni-${safeName}-${variant.assetId.slice(0, 8)}.${ext}`);
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Download failed. The image link may have expired, refresh and try again.');
    }
  };

  if (variant.status === 'discarded') return null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-all duration-300',
        isSelected ? 'border-cyan-500 shadow-lg shadow-cyan-500/15' : 'border-border',
      )}
    >
      <div className="group/tile relative aspect-square bg-muted/40">
        {variant.status === 'generating' && (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            <p className="text-[11px] text-muted-foreground">Generating...</p>
          </div>
        )}
        {variant.status === 'failed' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
            <XCircle className="h-6 w-6 text-destructive" />
            <p className="line-clamp-3 text-[11px] text-muted-foreground">{variant.error ?? 'Generation failed'}</p>
          </div>
        )}
        {variant.status === 'done' && variant.url && (
          <>
            <button
              onClick={onToggleSelect}
              aria-pressed={isSelected}
              aria-label={isSelected ? 'Deselect this image' : 'Select this image to continue'}
              className="group h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* Signed Supabase URL (private bucket); plain img avoids next/image domain config */}
              <img src={variant.url} alt={`${variant.modelName} variant`} className="h-full w-full object-cover" />
              <span
                className={cn(
                  'absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200',
                  isSelected
                    ? 'border-cyan-400 bg-cyan-500 text-white'
                    : 'border-white/60 bg-black/40 text-white/70 opacity-0 group-hover:opacity-100',
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
              </span>
              {variant.isRegeneration && (
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                  Variation
                </span>
              )}
            </button>
            {/* Top-left preview affordance: reveals on hover (always shown on touch,
                where there is no hover) and on keyboard focus. Sibling of the
                select button so opening the lightbox does not toggle selection.
                h-9/w-9 keeps a comfortable tap target. */}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="View full size"
              className="absolute left-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/60 bg-black/55 text-white opacity-100 transition-opacity duration-200 hover:bg-black/70 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 sm:opacity-0 sm:group-hover/tile:opacity-100"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-border px-2 py-1.5">
        <p className="truncate text-[11px] text-muted-foreground">{variant.modelName}</p>
        {variant.status === 'done' && (
          <div className="flex shrink-0 items-center">
            <TileAction label="Regenerate a variation" onClick={onRegenerate}>
              <RefreshCw className="h-3.5 w-3.5" />
            </TileAction>
            <TileAction label="Download" onClick={() => { void handleDownload(); }}>
              <Download className="h-3.5 w-3.5" />
            </TileAction>
            <TileAction label="Save to Files library" onClick={onSaveToFiles} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </TileAction>
            <TileAction label="Discard" onClick={onDiscard}>
              <Trash2 className="h-3.5 w-3.5" />
            </TileAction>
          </div>
        )}
      </div>

      {variant.url && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          {/* Dark backdrop + text-white so the built-in close X (currentColor)
              stays visible over any image; object-contain keeps native dimensions. */}
          <DialogContent className="flex max-h-[95vh] max-w-[95vw] items-center justify-center overflow-hidden border-white/10 bg-black/95 p-2 text-white backdrop-blur-sm sm:max-w-[90vw]">
            <DialogTitle className="sr-only">Full-size preview of {variant.modelName} generated image</DialogTitle>
            <img
              src={variant.url}
              alt={`${variant.modelName} full size`}
              className="max-h-[90vh] w-auto max-w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
