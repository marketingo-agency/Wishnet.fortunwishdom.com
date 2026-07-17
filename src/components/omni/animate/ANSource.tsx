"use client";

/**
 * Animate stage 1: pick the character (Plan 2 Phase 9). Wishpedia entry
 * images are the v1 source — the Wishu engine; only entry-image IDs travel
 * to the edge (public URLs are preview-only). Files / Omni assets / Content
 * Library sources land in the polish pass (deviation logged).
 */

import { useMemo, useState } from 'react';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useWishpediaEntries } from '@/hooks/useWishpediaEntries';
import { useWishpediaImages } from '@/hooks/useWishpediaImages';
import type { OmniAnimateRef } from '@/hooks/omni';

const MAX_REFS = 9;

interface ANSourceProps {
  creating: boolean;
  onPicked: (refs: OmniAnimateRef[], entryName: string) => void;
}

export function ANSource({ creating, onPicked }: ANSourceProps) {
  const [search, setSearch] = useState('');
  const [entryId, setEntryId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, OmniAnimateRef>>(new Map());

  const entries = useWishpediaEntries({ search });
  const images = useWishpediaImages(entryId ?? undefined);
  const entryName = useMemo(
    () => (entries.data ?? []).find((e) => e.id === entryId)?.name ?? 'character',
    [entries.data, entryId],
  );

  const toggle = (imageId: string, storagePath: string, label: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(imageId)) {
        next.delete(imageId);
        return next;
      }
      if (next.size >= MAX_REFS) {
        toast.info(`Up to ${MAX_REFS} reference images (the model's cap).`);
        return prev;
      }
      const { data } = supabase.storage.from('wishpedia-media').getPublicUrl(storagePath);
      next.set(imageId, { wishpedia_image_id: imageId, url: data.publicUrl, label });
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Wishpedia characters"
          className="h-9 pl-8 text-sm"
          aria-label="Search Wishpedia entries"
        />
      </div>

      {entries.isLoading ? (
        <div className="flex justify-center py-8" aria-live="polite"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
      ) : entries.isError ? (
        <p className="py-8 text-center text-xs text-destructive">Wishpedia could not be loaded. Try again.</p>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Entries">
          {(entries.data ?? []).slice(0, 24).map((e) => (
            <button
              key={e.id}
              onClick={() => setEntryId(e.id)}
              aria-pressed={entryId === e.id}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                entryId === e.id ? 'border-violet-500/60 bg-violet-500/10 font-medium' : 'border-border hover:border-violet-500/40',
              )}
            >
              {e.name}
            </button>
          ))}
          {(entries.data ?? []).length === 0 && (
            <p className="w-full py-6 text-center text-xs text-muted-foreground">No entries match that search.</p>
          )}
        </div>
      )}

      {entryId && (
        images.isLoading ? (
          <div className="flex justify-center py-8" aria-live="polite"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
        ) : images.isError ? (
          <p className="py-8 text-center text-xs text-destructive" role="alert">The entry images could not be loaded. Try again.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(images.data ?? []).map((img) => {
              const isSel = selected.has(img.id);
              const label = `${entryName}${img.angle ? ` (${img.angle})` : ''}`;
              const { data } = supabase.storage.from('wishpedia-media').getPublicUrl(img.storage_path);
              return (
                <button
                  key={img.id}
                  onClick={() => toggle(img.id, img.storage_path, label)}
                  aria-pressed={isSel}
                  aria-label={isSel ? `Remove ${label}` : `Attach ${label}`}
                  className={cn(
                    'group relative aspect-square cursor-pointer overflow-hidden rounded-lg border transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSel ? 'border-violet-500 ring-2 ring-violet-500/40' : 'border-border hover:border-violet-500/50',
                  )}
                >
                  <img src={data.publicUrl} alt={label} loading="lazy" className="h-full w-full object-cover" />
                  {img.angle && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{img.angle}</span>
                  )}
                </button>
              );
            })}
            {(images.data ?? []).length === 0 && (
              <p className="col-span-full py-6 text-center text-xs text-muted-foreground">This entry has no images yet.</p>
            )}
          </div>
        )
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground" aria-live="polite">
          {selected.size}/{MAX_REFS} references · Files and Omni-asset sources land in the polish pass.
        </p>
        <Button
          size="sm"
          onClick={() => onPicked([...selected.values()], entryName)}
          disabled={creating || selected.size === 0}
          className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Animate this character
        </Button>
      </div>
    </div>
  );
}
