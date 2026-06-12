"use client";

/**
 * One live variant tile in the generation grid: skeleton while the queue job
 * runs, then the image with per-image actions (select / regenerate variation /
 * discard / download / save to Files library).
 */

import { CheckCircle2, Download, Loader2, RefreshCw, Save, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
  if (variant.status === 'discarded') return null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-all duration-300',
        isSelected ? 'border-cyan-500 shadow-lg shadow-cyan-500/15' : 'border-border',
      )}
    >
      <div className="relative aspect-square bg-muted/40">
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
              <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                Variation
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-border px-2 py-1.5">
        <p className="truncate text-[11px] text-muted-foreground">{variant.modelName}</p>
        {variant.status === 'done' && (
          <div className="flex shrink-0 items-center">
            <TileAction label="Regenerate a variation" onClick={onRegenerate}>
              <RefreshCw className="h-3.5 w-3.5" />
            </TileAction>
            <TileAction label="Download" onClick={() => variant.url && window.open(variant.url, '_blank')}>
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
    </div>
  );
}
