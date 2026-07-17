"use client";

/**
 * Character Studio (Plan 1 Phase 10): a curated Studio entry, not a new mode.
 * Pick a Wishpedia character, review its canon images (auto-attached up to the
 * default edit model's reference cap), optionally shape the objective, and a
 * pre-seeded omni_images run opens in the Studio wizard at Stage 1. Zero new
 * step machinery, zero migration: step_state.origin marks the run's origin and
 * the attached references make Stage 2 default to the best edit model.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Check, Drama, ImageIcon, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useWishpediaEntries } from '@/hooks/useWishpediaEntries';
import { useWishpediaImages, getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import { FAL_EDIT_MODELS, MAX_REFERENCE_IMAGES } from '@/config/llmModels';
import { useCreateOmniRun } from '@/hooks/omni';
import type { OmniWishReferenceRef } from '@/hooks/omni';

// Auto-attach up to the DEFAULT edit model's cap (Stage 2 pre-selects
// FAL_EDIT_MODELS[0] when references exist); the user can still hand-pick up
// to the global cap and Stage 2 warns per model.
const AUTO_ATTACH_CAP = FAL_EDIT_MODELS[0]?.maxRefs ?? 8;

const objectiveTemplate = (name: string) =>
  `Create a new scene featuring ${name}, faithful to the attached canon references: exact appearance, colors, shapes, and proportions. Scene idea: `;

interface CharacterStudioPickerProps {
  onExit: () => void;
  /** Receives the pre-seeded Studio run id; the caller opens the wizard. */
  onCreated: (runId: string) => void;
}

export function CharacterStudioPicker({ onExit, onCreated }: CharacterStudioPickerProps) {
  const createRun = useCreateOmniRun();
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<{ id: string; name: string } | null>(null);
  const [refs, setRefs] = useState<OmniWishReferenceRef[]>([]);
  const [objective, setObjective] = useState('');

  const { data: entries = [], isLoading, error } = useWishpediaEntries({ search });
  const { data: images, isLoading: imagesLoading, error: imagesError } = useWishpediaImages(selectedEntry?.id);

  // Auto-attach the entry's canon images once they load (capped), and seed the
  // objective template — both reset when a different character is picked.
  useEffect(() => {
    if (!selectedEntry) {
      setRefs([]);
      setObjective('');
      return;
    }
    setObjective(objectiveTemplate(selectedEntry.name));
    if (!images) return;
    setRefs(
      images.slice(0, AUTO_ATTACH_CAP).map((img) => ({
        wishpediaImageId: img.id,
        entryId: selectedEntry.id,
        entryName: selectedEntry.name,
        angle: img.angle,
        publicUrl: getWishpediaImageUrl(img.storage_path),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reseed per entry/images load
  }, [selectedEntry?.id, images]);

  const selectedIds = useMemo(() => new Set(refs.map((r) => r.wishpediaImageId)), [refs]);

  const toggleImage = (imgId: string, angle: string | null, storagePath: string) => {
    if (!selectedEntry) return;
    if (selectedIds.has(imgId)) {
      setRefs((prev) => prev.filter((r) => r.wishpediaImageId !== imgId));
      return;
    }
    if (refs.length >= MAX_REFERENCE_IMAGES) {
      toast.warning(`Up to ${MAX_REFERENCE_IMAGES} reference images. Remove one to add another.`);
      return;
    }
    setRefs((prev) => [...prev, {
      wishpediaImageId: imgId,
      entryId: selectedEntry.id,
      entryName: selectedEntry.name,
      angle,
      publicUrl: getWishpediaImageUrl(storagePath),
    }]);
  };

  const handleCreate = async () => {
    if (!selectedEntry || refs.length === 0 || createRun.isPending) return;
    try {
      const run = await createRun.mutateAsync({
        mode: 'omni_images',
        title: `Character Studio · ${selectedEntry.name}`.slice(0, 80),
        current_step: 1,
        step_state: {
          objective: objective.trim() || objectiveTemplate(selectedEntry.name),
          reference_image_refs: refs,
          origin: 'character_studio',
          character_entry_id: selectedEntry.id,
          schema_version: 2,
        },
      });
      onCreated(run.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start the Character Studio run');
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Character Studio</p>
          <h1 className="truncate text-sm font-semibold sm:text-base">Create with a canon character</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          aria-label="Back to the Images hub"
          className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <section className="space-y-2" aria-label="Pick a character">
            <div className="flex items-center gap-2">
              <Drama className="h-4 w-4 text-fuchsia-400" />
              <p className="text-sm font-medium">Pick a Wishpedia character</p>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Wishpedia entries"
                className="h-9 pl-8 text-sm focus-visible:ring-fuchsia-500/40"
                aria-label="Search Wishpedia entries"
              />
            </div>

            {isLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />)}
              </div>
            ) : error ? (
              <p className="flex items-center gap-1.5 py-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> Could not load Wishpedia entries.
              </p>
            ) : entries.length === 0 ? (
              <p className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" /> {search ? 'No entries match this search.' : 'No Wishpedia entries yet — add characters in Wishpedia first.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Wishpedia characters">
                {entries.map((entry) => {
                  const active = selectedEntry?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedEntry(active ? null : { id: entry.id, name: entry.name })}
                      className={cn(
                        'cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50',
                        active
                          ? 'border-fuchsia-500/60 bg-fuchsia-500/10 text-fuchsia-700 [[data-omni-theme=dark]_&]:text-fuchsia-300'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {entry.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {selectedEntry && (
            <section className="space-y-2" aria-label="Canon references">
              <p className="text-sm font-medium">
                Canon references{' '}
                <span className="font-normal text-muted-foreground">
                  ({refs.length}/{MAX_REFERENCE_IMAGES} attached — the first {AUTO_ATTACH_CAP} attach automatically)
                </span>
              </p>
              {imagesLoading ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
                </div>
              ) : imagesError ? (
                <p className="flex items-center gap-1.5 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" /> Could not load {selectedEntry.name}&apos;s images.
                </p>
              ) : !images || images.length === 0 ? (
                <p className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" /> {selectedEntry.name} has no canon images yet — add art to its Wishpedia entry first.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {images.map((img) => {
                    const selected = selectedIds.has(img.id);
                    return (
                      <button
                        key={img.id}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${selected ? 'Remove' : 'Add'} ${selectedEntry.name}${img.angle ? ` ${img.angle}` : ''} reference`}
                        onClick={() => toggleImage(img.id, img.angle, img.storage_path)}
                        className={cn(
                          'group relative aspect-square cursor-pointer overflow-hidden rounded-lg border transition-all duration-200',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50',
                          selected ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/40' : 'border-border opacity-70 hover:opacity-100',
                        )}
                      >
                        {/* Plain img: wishpedia-media is a public bucket. */}
                        <img src={getWishpediaImageUrl(img.storage_path)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        {img.angle && (
                          <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                            {img.angle}
                          </span>
                        )}
                        {selected && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-500 text-white">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <Label htmlFor="character-objective">Scene objective</Label>
                <Textarea
                  id="character-objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Finish the scene idea here or in the next step — the Studio brief stage opens with it prefilled.
                </p>
              </div>

              <div className="flex justify-end border-t pt-4">
                <Button
                  onClick={() => void handleCreate()}
                  disabled={refs.length === 0 || createRun.isPending}
                  className="cursor-pointer gap-2 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
                >
                  {createRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {createRun.isPending ? 'Preparing the run' : `Create with ${selectedEntry.name}`}
                </Button>
              </div>
            </section>
          )}
        </div>
      </motion.div>
    </div>
  );
}
