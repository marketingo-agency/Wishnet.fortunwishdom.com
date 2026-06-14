"use client";

/**
 * Wishpedia reference picker for the Omni Images wizard (step 1).
 *
 * Search a canon entry, expand it to browse its reference images, and pick the
 * exact images you want (individually). Images mix freely across entries up to a
 * total cap, so Omni recreates the real Wishpedia character (e.g. Wishu) from the
 * angles you choose instead of inventing a look-alike. The parent owns the
 * selected refs (so they persist into the run's step_state); this component only
 * edits that list.
 *
 * The total cap is a generous default (the max any supported edit model accepts).
 * Step 3 narrows/trims it to the chosen model's real limit, and the edge clamps.
 */

import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronRight, ImageIcon, Loader2, Search, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useWishpediaEntries } from '@/hooks/useWishpediaEntries';
import { useWishpediaImages, getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import { MAX_REFERENCE_IMAGES } from '@/config/llmModels';
import type { OmniWishReferenceRef } from '@/hooks/omni';

interface OmniWishReferencePickerProps {
  value: OmniWishReferenceRef[];
  onChange: (refs: OmniWishReferenceRef[]) => void;
  disabled?: boolean;
}

/** Interactive child: loads one entry's images and lets the user pick each. */
function EntryImageGrid({
  entryId,
  entryName,
  selectedIds,
  onToggleImage,
  disabled,
}: {
  entryId: string;
  entryName: string;
  selectedIds: Set<string>;
  onToggleImage: (ref: OmniWishReferenceRef) => void;
  disabled?: boolean;
}) {
  const { data: images, isLoading, error } = useWishpediaImages(entryId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading {entryName} images...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" /> Could not load {entryName} images
      </div>
    );
  }
  if (!images || images.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3 w-3" /> {entryName} has no images to reference
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5 px-2.5 pb-2 sm:grid-cols-5">
      {images.map((img) => {
        const selected = selectedIds.has(img.id);
        const ref: OmniWishReferenceRef = {
          wishpediaImageId: img.id,
          entryId,
          entryName,
          angle: img.angle,
          publicUrl: getWishpediaImageUrl(img.storage_path),
        };
        return (
          <button
            key={img.id}
            type="button"
            aria-pressed={selected}
            aria-label={`${selected ? 'Remove' : 'Add'} ${entryName}${img.angle ? ` ${img.angle}` : ''} reference`}
            onClick={() => onToggleImage(ref)}
            disabled={disabled}
            className={cn(
              'group relative aspect-square cursor-pointer overflow-hidden rounded-lg border transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
              selected ? 'border-cyan-500 ring-2 ring-cyan-500/40' : 'border-border hover:border-cyan-500/40',
            )}
          >
            {/* Plain img: wishpedia-media is a public bucket. */}
            <img src={ref.publicUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            {img.angle && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                {img.angle}
              </span>
            )}
            {selected && (
              <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-white">
                <Check className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function OmniWishReferencePicker({ value, onChange, disabled }: OmniWishReferencePickerProps) {
  const [search, setSearch] = useState('');
  // Entries expanded to browse their images; seeded so resumed selections show.
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(
    () => new Set(value.map((r) => r.entryId)),
  );

  const { data: entries = [], isLoading, error } = useWishpediaEntries({ search });

  const selectedIds = useMemo(() => new Set(value.map((r) => r.wishpediaImageId)), [value]);

  const toggleExpanded = useCallback((entryId: string) => {
    setExpandedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  const toggleImage = useCallback(
    (ref: OmniWishReferenceRef) => {
      if (value.some((r) => r.wishpediaImageId === ref.wishpediaImageId)) {
        onChange(value.filter((r) => r.wishpediaImageId !== ref.wishpediaImageId));
        return;
      }
      if (value.length >= MAX_REFERENCE_IMAGES) {
        toast.warning(`Up to ${MAX_REFERENCE_IMAGES} reference images. Remove one to add another.`);
        return;
      }
      onChange([...value, ref]);
    },
    [value, onChange],
  );

  const removeRef = useCallback(
    (imageId: string) => onChange(value.filter((r) => r.wishpediaImageId !== imageId)),
    [value, onChange],
  );

  const countFor = useCallback((entryId: string) => value.filter((r) => r.entryId === entryId).length, [value]);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
        <p className="text-xs font-medium">
          Reference a Wishpedia character <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Open a canon entry and pick the exact images to reference. Mix images from several entries, up to {MAX_REFERENCE_IMAGES}.
      </p>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Wishpedia entries..."
          disabled={disabled}
          className="h-8 pl-8 text-xs focus-visible:ring-cyan-500/40"
          aria-label="Search Wishpedia entries"
        />
      </div>

      <div className="max-h-[260px] overflow-y-auto rounded-lg border border-border bg-background/40">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 px-2.5 py-3 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" /> Could not load entries
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-3 text-xs text-muted-foreground">
            <ImageIcon className="h-3 w-3" /> {search ? 'No entries found' : 'No Wishpedia entries yet'}
          </div>
        ) : (
          <div className="py-0.5" role="group" aria-label="Wishpedia entries">
            {entries.map((entry) => {
              const expanded = expandedEntryIds.has(entry.id);
              const count = countFor(entry.id);
              return (
                <div key={entry.id}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggleExpanded(entry.id)}
                    disabled={disabled}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40',
                      // cyan text fails WCAG AA in Omni light mode, so the bright
                      // cyan is scoped to the page-local dark theme (dark: does NOT
                      // track data-omni-theme) with a darker light-mode fallback.
                      count > 0
                        ? 'text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    {expanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{entry.name}</span>
                    {count > 0 && (
                      <span className="shrink-0 rounded-full bg-cyan-500/15 px-1.5 text-[10px] font-bold text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300">
                        {count}
                      </span>
                    )}
                  </button>
                  {expanded && (
                    <EntryImageGrid
                      entryId={entry.id}
                      entryName={entry.name}
                      selectedIds={selectedIds}
                      onToggleImage={toggleImage}
                      disabled={disabled}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <>
          <p className="text-[11px] font-medium text-muted-foreground">
            Attached references{' '}
            <span className="text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300">
              {value.length}/{MAX_REFERENCE_IMAGES}
            </span>
          </p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            {value.map((ref) => (
              <div key={ref.wishpediaImageId} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                {/* Plain img: wishpedia-media is a public bucket. */}
                <img src={ref.publicUrl} alt={`${ref.entryName}${ref.angle ? ` (${ref.angle})` : ''}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                  <span className="block truncate text-[10px] text-white">{ref.angle || ref.entryName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRef(ref.wishpediaImageId)}
                  disabled={disabled}
                  aria-label={`Remove ${ref.entryName} reference`}
                  className="absolute right-0.5 top-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-100 transition-opacity hover:bg-background hover:text-rose-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
