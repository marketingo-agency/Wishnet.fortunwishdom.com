"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Search, X, Paperclip, ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useWishpediaEntries } from '@/hooks/useWishpediaEntries';
import { useWishpediaImages, getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import { toast } from 'sonner';
import type { PendingAttachment } from '@/types/attachments';

// ─── Types ────────────────────────────────────────────

export interface WishpediaImageRef {
  wishpediaImageId: string;
  entryId: string;
  entryName: string;
  angle: string | null;
  publicUrl: string;
}

interface WishReferencePanelProps {
  globalReferences: PendingAttachment[];
  onRemoveReference: (id: string) => void;
  onAttachFile: () => void;
  wishpediaImageRefs: WishpediaImageRef[];
  onAddWishpediaImages: (refs: WishpediaImageRef[]) => void;
  onRemoveWishpediaImage: (imageId: string) => void;
  onDropFiles: (files: FileList) => void;
  isPending: boolean;
}

// ─── EntryImageLoader (data-only) ─────────────────────

const MAX_TOTAL_IMAGES = 5;

function EntryImageLoader({
  entryId,
  entryName,
  onImagesLoaded,
}: {
  entryId: string;
  entryName: string;
  onImagesLoaded: (refs: WishpediaImageRef[]) => void;
}) {
  const { data: images, isLoading, error } = useWishpediaImages(entryId);

  useEffect(() => {
    if (!images) return;
    const refs: WishpediaImageRef[] = images.map(img => ({
      wishpediaImageId: img.id,
      entryId,
      entryName,
      angle: img.angle,
      publicUrl: getWishpediaImageUrl(img.storage_path),
    }));
    onImagesLoaded(refs);
    // Only fire when images data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading {entryName} images...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-destructive">
        <AlertCircle className="h-3 w-3" />
        Failed to load images
      </div>
    );
  }

  if (images && images.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        No images for {entryName}
      </div>
    );
  }

  return null;
}

// ─── Main Panel ───────────────────────────────────────

export function WishReferencePanel({
  globalReferences,
  onRemoveReference,
  onAttachFile,
  wishpediaImageRefs,
  onAddWishpediaImages,
  onRemoveWishpediaImage,
  onDropFiles,
  isPending,
}: WishReferencePanelProps) {
  const [search, setSearch] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);

  const { data: entries = [], isLoading: loadingEntries, error: entriesError } = useWishpediaEntries({ search });

  // ─── Entry selection ────────────────────────────────

  const toggleEntry = useCallback((entryId: string) => {
    setSelectedEntryIds(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
        // Remove images for deselected entry
        onRemoveWishpediaImage(entryId);
      } else {
        if (wishpediaImageRefs.length >= MAX_TOTAL_IMAGES) {
          toast.warning(`Maximum ${MAX_TOTAL_IMAGES} reference images allowed`);
          return prev;
        }
        next.add(entryId);
      }
      return next;
    });
  }, [wishpediaImageRefs.length, onRemoveWishpediaImage]);

  const handleImagesLoaded = useCallback((refs: WishpediaImageRef[]) => {
    // Enforce cap
    const currentCount = wishpediaImageRefs.filter(r => !refs.some(nr => nr.entryId === r.entryId)).length;
    const allowed = Math.max(0, MAX_TOTAL_IMAGES - currentCount);
    const capped = refs.slice(0, allowed);
    if (refs.length > allowed) {
      toast.warning(`Only ${allowed} of ${refs.length} images added (max ${MAX_TOTAL_IMAGES} total)`);
    }
    onAddWishpediaImages(capped);
  }, [wishpediaImageRefs, onAddWishpediaImages]);

  // ─── Drag & drop ────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    // Filter to image files only
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Only image files are accepted');
      return;
    }
    const dt = new DataTransfer();
    imageFiles.forEach(f => dt.items.add(f));
    onDropFiles(dt.files);
  }, [onDropFiles]);

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
        WishReference
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries..."
          className="h-7 pl-7 text-xs bg-muted/50 border-border focus-visible:ring-pink-500/30"
        />
      </div>

      {/* Entry picker */}
      <div className="max-h-[140px] overflow-y-auto rounded-lg border border-border bg-muted/20 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
        {loadingEntries ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : entriesError ? (
          <div className="flex items-center gap-1.5 px-2 py-3 text-[10px] text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            Could not load entries
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center gap-1.5 px-2 py-3 text-[10px] text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            {search ? 'No entries found' : 'No Wishpedia entries yet'}
          </div>
        ) : (
          <div className="py-0.5">
            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => toggleEntry(entry.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs transition-all text-left',
                  selectedEntryIds.has(entry.id)
                    ? 'text-pink-300 bg-pink-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <span className="truncate flex-1">{entry.name}</span>
                {selectedEntryIds.has(entry.id) && (
                  <span className="text-[8px] font-bold text-pink-400 uppercase shrink-0">Selected</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image loaders (data-only children) */}
      {Array.from(selectedEntryIds).map(entryId => {
        const entry = entries.find(e => e.id === entryId);
        if (!entry) return null;
        return (
          <EntryImageLoader
            key={entryId}
            entryId={entryId}
            entryName={entry.name}
            onImagesLoaded={handleImagesLoaded}
          />
        );
      })}

      {/* Wishpedia image chips */}
      {wishpediaImageRefs.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {wishpediaImageRefs.map(ref => (
            <div key={ref.wishpediaImageId} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
              <img
                src={ref.publicUrl}
                alt={`${ref.entryName}${ref.angle ? ` (${ref.angle})` : ''}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                <span className="text-[8px] text-white truncate block">
                  {ref.angle || ref.entryName}
                </span>
              </div>
              <button
                onClick={() => onRemoveWishpediaImage(ref.wishpediaImageId)}
                className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 text-muted-foreground hover:text-rose-400 hover:bg-background flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Global references preview */}
      {globalReferences.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {globalReferences.map(ref => (
            <div key={ref.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
              {ref.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(ref.file)}
                  alt={ref.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground truncate w-full text-center">{ref.name}</span>
                </div>
              )}
              <button
                onClick={() => onRemoveReference(ref.id)}
                className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 text-muted-foreground hover:text-rose-400 hover:bg-background flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
              {ref.status === 'processing' && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <div className="h-3 w-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drag-drop zone + attach button */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl border border-dashed transition-all',
          dragOver
            ? 'border-pink-500/50 bg-pink-500/5'
            : 'border-border'
        )}
      >
        <button
          onClick={onAttachFile}
          disabled={isPending}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
        >
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="text-xs">{dragOver ? 'Drop images here' : 'Attach reference'}</span>
        </button>
      </div>
    </div>
  );
}
