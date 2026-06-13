"use client";

/**
 * Wishpedia reference picker for the Omni Images wizard (step 1).
 *
 * Selecting a canon entry attaches its reference images so Omni recreates the
 * actual Wishpedia character (e.g. Wishu) instead of inventing a look-alike.
 * Mirrors the proven Pixel WishReferencePanel data flow: an entry list, a
 * data-only EntryImageLoader per selected entry, and thumbnail chips. The
 * parent owns the selected refs (so they persist into the run's step_state);
 * this component only edits that list. Capped to keep the edit call sane.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ImageIcon, Loader2, Search, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useWishpediaEntries } from '@/hooks/useWishpediaEntries';
import { useWishpediaImages, getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import type { OmniWishReferenceRef } from '@/hooks/omni';

const MAX_TOTAL_IMAGES = 4;

interface OmniWishReferencePickerProps {
  value: OmniWishReferenceRef[];
  onChange: (refs: OmniWishReferenceRef[]) => void;
  disabled?: boolean;
}

/** Data-only child: loads one entry's images and reports them up. */
function EntryImageLoader({
  entryId,
  entryName,
  onImagesLoaded,
}: {
  entryId: string;
  entryName: string;
  onImagesLoaded: (refs: OmniWishReferenceRef[]) => void;
}) {
  const { data: images, isLoading, error } = useWishpediaImages(entryId);

  useEffect(() => {
    if (!images) return;
    onImagesLoaded(
      images.map((img) => ({
        wishpediaImageId: img.id,
        entryId,
        entryName,
        angle: img.angle,
        publicUrl: getWishpediaImageUrl(img.storage_path),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire when images data changes
  }, [images]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading {entryName} images...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        Could not load {entryName} images
      </div>
    );
  }
  if (images && images.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        {entryName} has no images to reference
      </div>
    );
  }
  return null;
}

export function OmniWishReferencePicker({ value, onChange, disabled }: OmniWishReferencePickerProps) {
  const [search, setSearch] = useState('');
  // Entries the user has ticked; seeded from any refs restored with the run.
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(
    () => new Set(value.map((r) => r.entryId)),
  );

  const { data: entries = [], isLoading, error } = useWishpediaEntries({ search });

  const toggleEntry = useCallback(
    (entryId: string) => {
      setSelectedEntryIds((prev) => {
        const next = new Set(prev);
        if (next.has(entryId)) {
          next.delete(entryId);
          onChange(value.filter((r) => r.entryId !== entryId));
        } else {
          if (value.length >= MAX_TOTAL_IMAGES) {
            toast.warning(`Up to ${MAX_TOTAL_IMAGES} reference images`);
            return prev;
          }
          next.add(entryId);
        }
        return next;
      });
    },
    [value, onChange],
  );

  const handleImagesLoaded = useCallback(
    (refs: OmniWishReferenceRef[]) => {
      if (refs.length === 0) return;
      // Only add images for a FRESH entry. If the entry is already represented
      // in value (resume, or a partially-trimmed selection), leave that curated
      // set alone — otherwise resume would re-add images the user removed.
      const entryId = refs[0].entryId;
      if (value.some((r) => r.entryId === entryId)) return;
      const room = Math.max(0, MAX_TOTAL_IMAGES - value.length);
      if (room === 0) {
        toast.warning(`At the ${MAX_TOTAL_IMAGES}-image cap. Remove one to add ${refs[0].entryName}.`);
        return;
      }
      if (refs.length > room) toast.warning(`Added ${room} image${room === 1 ? '' : 's'} (max ${MAX_TOTAL_IMAGES})`);
      onChange([...value, ...refs.slice(0, room)]);
    },
    [value, onChange],
  );

  const removeRef = useCallback(
    (imageId: string) => {
      const next = value.filter((r) => r.wishpediaImageId !== imageId);
      onChange(next);
      // Untick the entry once its last image is gone.
      const removed = value.find((r) => r.wishpediaImageId === imageId);
      if (removed && !next.some((r) => r.entryId === removed.entryId)) {
        setSelectedEntryIds((prev) => {
          const s = new Set(prev);
          s.delete(removed.entryId);
          return s;
        });
      }
    },
    [value, onChange],
  );

  const activeEntries = useMemo(
    () => [...selectedEntryIds].map((id) => ({ id, name: entries.find((e) => e.id === id)?.name ?? value.find((r) => r.entryId === id)?.entryName ?? 'Entry' })),
    [selectedEntryIds, entries, value],
  );

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
        <p className="text-xs font-medium">Reference a Wishpedia character <span className="font-normal text-muted-foreground">(optional)</span></p>
      </div>
      <p className="text-xs text-muted-foreground">
        Attach canon art so Omni recreates the exact character (like Wishu) instead of a generic version.
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

      <div className="max-h-[150px] overflow-y-auto rounded-lg border border-border bg-background/40">
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
              const selected = selectedEntryIds.has(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleEntry(entry.id)}
                  disabled={disabled}
                  className={cn(
                    'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40',
                    // cyan text fails WCAG AA in Omni light mode, so the bright
                    // cyan is scoped to the page-local dark theme (dark: does NOT
                    // track data-omni-theme) with a darker light-mode fallback.
                    selected ? 'bg-cyan-500/10 text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <span className="flex-1 truncate">{entry.name}</span>
                  {selected && <span className="shrink-0 text-[10px] font-bold uppercase text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-400">Selected</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Data-only loaders for ticked entries. */}
      {activeEntries.map((e) => (
        <EntryImageLoader key={e.id} entryId={e.id} entryName={e.name} onImagesLoaded={handleImagesLoaded} />
      ))}

      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
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
                className="absolute right-0.5 top-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-100 transition-opacity hover:bg-background hover:text-rose-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
