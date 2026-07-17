"use client";

/**
 * WishpediaPersonaPicker: pick a Wishpedia character to seed a persona —
 * canon portrait (public URL) + entry lore as the personality seed (Plan 3
 * Phase 4; "Wishu can host").
 */

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useWishpediaEntries } from '@/hooks/useWishpediaEntries';
import { getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import { toast } from 'sonner';

export interface WishpediaPersonaSeed {
  entryId: string;
  name: string;
  personalitySeed: string;
  portraitUrl: string | null;
}

interface WishpediaPersonaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (seed: WishpediaPersonaSeed) => void;
}

export function WishpediaPersonaPicker({ open, onOpenChange, onPick }: WishpediaPersonaPickerProps) {
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { data: entries = [], isLoading, isError } = useWishpediaEntries({ search });

  const pickEntry = async (entryId: string, name: string, description: string | null) => {
    setLoadingId(entryId);
    try {
      const { data, error } = await supabase
        .from('wishpedia_entry_images')
        .select('storage_path, is_primary')
        .eq('entry_id', entryId)
        .order('is_primary', { ascending: false })
        .order('sort_order', { ascending: true })
        .limit(1);
      if (error) throw error;
      const first = ((data ?? []) as { storage_path: string }[])[0];
      onPick({
        entryId,
        name,
        personalitySeed: description?.trim() ?? '',
        portraitUrl: first ? getWishpediaImageUrl(first.storage_path) : null,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load the character');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pick a Wishpedia character</DialogTitle>
          <DialogDescription>
            The character&apos;s canon portrait and lore seed the persona.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search characters…"
            className="pl-8"
            aria-label="Search Wishpedia characters"
          />
        </div>
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!isLoading && isError && (
            <p className="py-8 text-center text-sm text-destructive">Couldn&apos;t load Wishpedia. Close and retry.</p>
          )}
          {!isLoading && !isError && entries.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No entries match.</p>
          )}
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              disabled={loadingId !== null}
              onClick={() => void pickEntry(entry.id, entry.name, entry.description)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left transition-colors duration-200 hover:border-orange-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.name}</p>
                {entry.description && (
                  <p className="truncate text-xs text-muted-foreground">{entry.description}</p>
                )}
              </div>
              {loadingId === entry.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
