"use client";

/**
 * CastPersonasView: the Cast & Personas surface (Plan 3 Phase 4) — persona
 * registry with voice preview + the show/default-cast editor.
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Mic, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeletePersona, usePersonas, usePodcastVoices, type OmniPersona } from '@/hooks/omni/usePersonas';
import { PersonaEditorSheet } from './PersonaEditorSheet';
import { ShowsSection } from './ShowsSection';

interface CastPersonasViewProps {
  onExit: () => void;
}

export function CastPersonasView({ onExit }: CastPersonasViewProps) {
  const reduceMotion = useReducedMotion();
  const { data: personas = [], isLoading, isError: personasError } = usePersonas();
  const { data: voices = [] } = usePodcastVoices();
  const deletePersona = useDeletePersona();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<OmniPersona | null>(null);
  const [deleting, setDeleting] = useState<OmniPersona | null>(null);

  const voiceName = (voiceId: string | null) =>
    voiceId ? (voices.find((v) => v.voice_id === voiceId)?.name ?? 'Voice set') : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-6 sm:px-8">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-3xl"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="mb-4 -ml-2 cursor-pointer gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Audios
        </Button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent [[data-omni-theme=dark]_&]:from-orange-400 [[data-omni-theme=dark]_&]:to-rose-500">Cast &amp; Personas</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reusable speakers for every show: identity, voice, portrait.
            </p>
          </div>
          <Button
            onClick={() => { setEditing(null); setEditorOpen(true); }}
            className="cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New persona
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          {!isLoading && personasError && (
            <p className="col-span-full rounded-xl border border-destructive/30 px-4 py-10 text-center text-sm text-destructive">
              Couldn&apos;t load the personas. Reload the page to retry.
            </p>
          )}
          {!isLoading && !personasError && personas.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No personas yet. Create your first host — or seed one from a Wishpedia character.
            </p>
          )}
          {personas.map((p) => (
            <div key={p.id} className="group rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-orange-500/40">
              <div className="flex items-start gap-3">
                {p.portrait_url ? (
                  <img src={p.portrait_url} alt={`Portrait of ${p.name}`} className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                    <Mic className="h-5 w-5 text-orange-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold">{p.name}</h2>
                  {p.role && <p className="truncate text-xs text-muted-foreground">{p.role}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {voiceName(p.voice_id) && (
                      <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {voiceName(p.voice_id)}
                      </span>
                    )}
                    {p.wishpedia_entry_id && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400">
                        Wishpedia
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditing(p); setEditorOpen(true); }}
                    aria-label={`Edit ${p.name}`}
                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(p)}
                    aria-label={`Delete ${p.name}`}
                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {p.personality && (
                <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.personality}</p>
              )}
            </div>
          ))}
        </div>

        <ShowsSection personas={personas} />
      </motion.div>

      <PersonaEditorSheet open={editorOpen} onOpenChange={setEditorOpen} persona={editing} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Shows that reference this persona in their default cast will need a replacement speaker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleting) deletePersona.mutate(deleting.id); setDeleting(null); }}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
