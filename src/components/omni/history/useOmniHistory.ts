"use client";

/**
 * History data layer (Mode 6).
 * Runs load through cursor-paginated infinite scroll (the old hard 200 cap is
 * gone). Delete removes the run row (assets FK-cascade) plus the run's OWN
 * storage folder only; referenced images from Files or the Content Library
 * live elsewhere and are untouched. Every delete checks for linked Content
 * Library items UNCONDITIONALLY (HIST-04) and removes them in ONE batched
 * edge call per run (HIST-08). Retake clones a run into a fresh one seeded
 * with pre-generation inputs (optionally edited first) so old assets can
 * never satisfy the new plan.
 */

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callContentLibrary } from '@/lib/contentLibraryApi';
import { estimateAssetsCost } from '@/config/falPricing';
import type { OmniAsset, OmniImagesState, OmniRun, OmniRunStatus } from '@/hooks/omni';
import { V1_TRANSFORM_RESEED_STEP, V2_HANDOFF_STAGE, stageOrdinal } from '../stepRegistry';

const PAGE_SIZE = 50;

export type HistorySort = 'updated_desc' | 'created_desc' | 'created_asc' | 'title';

export const HISTORY_SORTS: { id: HistorySort; label: string }[] = [
  { id: 'updated_desc', label: 'Recently updated' },
  { id: 'created_desc', label: 'Newest first' },
  { id: 'created_asc', label: 'Oldest first' },
  { id: 'title', label: 'Title A-Z' },
];

interface RunsPage {
  runs: OmniRun[];
  nextCursor: string | null;
}

/**
 * Cursor-paginated runs (HIST-09 sort + infinite scroll). Time sorts use a
 * strict keyset cursor on the sort column (microsecond timestamps make ties
 * effectively impossible; pages are still deduped by id downstream). Title
 * sort fetches in recency order and sorts the loaded pages client-side —
 * titles are nullable/duplicated, which breaks a naive title keyset.
 */
export function useOmniRunsInfinite(sort: HistorySort) {
  const timeCol = sort === 'updated_desc' ? 'updated_at' : 'created_at';
  const ascending = sort === 'created_asc';
  return useInfiniteQuery<RunsPage>({
    queryKey: ['omni-runs', sort],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('omni_runs')
        .select('*')
        .order(timeCol, { ascending })
        .limit(PAGE_SIZE);
      const cursor = pageParam as string | null;
      if (cursor) query = ascending ? query.gt(timeCol, cursor) : query.lt(timeCol, cursor);
      const { data, error } = await query;
      if (error) throw error;
      const runs = (data ?? []) as OmniRun[];
      const last = runs[runs.length - 1] as (OmniRun & Record<string, unknown>) | undefined;
      return {
        runs,
        nextCursor: runs.length === PAGE_SIZE && last ? String(last[timeCol]) : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export interface RunThumbs {
  /** Signed URLs of up to 4 output images (falls back to sources). */
  urls: string[];
  /** Count of DONE output images (uploaded/referenced sources excluded). */
  imageCount: number;
  /** Distinct fal models that produced assets in this run. */
  modelCount: number;
  /** Estimated fal spend across produced assets, or null when nothing priced. */
  estCost: number | null;
  /** True when a produced asset could not be priced (opaque model / no dims). */
  hasUnknownCost: boolean;
}

const THUMBS_PER_RUN = 4;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type ThumbAssetRow = Pick<OmniAsset, 'id' | 'run_id' | 'storage_path' | 'metadata' | 'created_at' | 'model_id' | 'width' | 'height' | 'status'>;

/**
 * Per-run card data: thumbnail strip (≤4), image count, model count, and the
 * estimated fal spend (HIST-10). The asset rows were always fetched here —
 * they are now kept instead of collapsed to one cover — and ALL thumbnails
 * are signed in batched createSignedUrls calls instead of one round-trip per
 * image (HIST-07).
 */
export function useRunThumbs(runIds: string[]) {
  const key = [...runIds].sort().join(',');
  return useQuery<Record<string, RunThumbs>>({
    queryKey: ['omni-run-thumbs', key],
    enabled: runIds.length > 0,
    staleTime: 20 * 60 * 1000,
    // Keep prior thumbnails on screen while a changed key refetches.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // Chunk the run-id filter: an unbounded .in() list would blow past URL
      // length limits once infinite scroll loads a few hundred runs.
      const rows: ThumbAssetRow[] = [];
      for (const ids of chunk(runIds, 80)) {
        const { data, error } = await supabase
          .from('omni_assets')
          .select('id, run_id, storage_path, metadata, created_at, model_id, width, height, status')
          .in('run_id', ids)
          .in('status', ['done', 'discarded'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        rows.push(...((data ?? []) as ThumbAssetRow[]));
      }

      const byRun = new Map<string, ThumbAssetRow[]>();
      for (const row of rows) {
        const list = byRun.get(row.run_id) ?? [];
        list.push(row);
        byRun.set(row.run_id, list);
      }

      const thumbs: Record<string, RunThumbs> = {};
      const pathsToSign: string[] = [];
      const pathOwners = new Map<string, { runId: string }[]>();

      for (const [runId, assets] of byRun) {
        const done = assets.filter((a) => a.status === 'done' && a.storage_path);
        // Prefer generated outputs over uploaded/referenced sources.
        const outputs = done.filter((a) => !a.metadata?.source);
        const strip = (outputs.length > 0 ? outputs : done).slice(0, THUMBS_PER_RUN);
        const produced = assets.filter((a) => a.model_id);
        const { total, hasUnknown } = estimateAssetsCost(assets);
        thumbs[runId] = {
          urls: [],
          imageCount: outputs.length,
          modelCount: new Set(produced.map((a) => a.model_id)).size,
          estCost: total > 0 ? total : null,
          hasUnknownCost: hasUnknown,
        };
        for (const a of strip) {
          const path = a.storage_path!;
          if (!pathOwners.has(path)) pathsToSign.push(path);
          const owners = pathOwners.get(path) ?? [];
          owners.push({ runId });
          pathOwners.set(path, owners);
        }
      }

      // One batched signing call per 100 paths (HIST-07) instead of N sequential.
      const urlByPath = new Map<string, string>();
      for (const paths of chunk(pathsToSign, 100)) {
        const { data: signed, error } = await supabase.storage.from('files').createSignedUrls(paths, 60 * 60 * 24);
        if (error) {
          console.warn('History thumbs: batch signing failed:', error.message);
          continue;
        }
        for (const s of signed ?? []) {
          if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
        }
      }
      for (const [runId, assets] of byRun) {
        const done = assets.filter((a) => a.status === 'done' && a.storage_path);
        const outputs = done.filter((a) => !a.metadata?.source);
        const strip = (outputs.length > 0 ? outputs : done).slice(0, THUMBS_PER_RUN);
        thumbs[runId].urls = strip
          .map((a) => urlByPath.get(a.storage_path!))
          .filter((u): u is string => !!u);
      }
      return thumbs;
    },
  });
}

function useInvalidateHistory() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['omni-runs'] });
}

export function useArchiveRun() {
  const invalidate = useInvalidateHistory();
  return useMutation({
    mutationFn: async (params: { runId: string; status: Extract<OmniRunStatus, 'archived' | 'completed'> }) => {
      const { error } = await supabase
        .from('omni_runs')
        .update({ status: params.status })
        .eq('id', params.runId);
      if (error) throw error;
    },
    onSuccess: (_, params) => {
      invalidate();
      toast.success(params.status === 'archived' ? 'Run archived' : 'Run restored');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Bulk Archive for the selected rows (HIST-06) — one UPDATE, not N. */
export function useBulkArchive() {
  const invalidate = useInvalidateHistory();
  return useMutation({
    mutationFn: async (runIds: string[]) => {
      const { error } = await supabase
        .from('omni_runs')
        .update({ status: 'archived' })
        .in('id', runIds);
      if (error) throw error;
      return runIds.length;
    },
    onSuccess: (count) => {
      invalidate();
      toast.success(`${count} ${count === 1 ? 'run' : 'runs'} archived`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

async function listRunFolder(folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data: page, error } = await supabase.storage.from('files').list(folder, { limit: 200, offset });
    if (error) throw new Error(`Could not list stored images: ${error.message}`);
    if (!page || page.length === 0) break;
    paths.push(...page.map((f) => `${folder}/${f.name}`));
    if (page.length < 200) break;
  }
  return paths;
}

async function deleteOneRun(run: OmniRun, userId: string): Promise<{ libraryFailed: boolean }> {
  // HIST-04: check for linked Content Library items UNCONDITIONALLY — status
  // is not proof (a completed run can be demoted, an item can outlive a
  // status flip). Items found are removed in ONE batched edge call (HIST-08)
  // so bulk clears use one rate-limit slot per run, not one per item. Posts
  // cascade with the items server-side. Admin-only: a non-admin's item query
  // returns nothing (RLS) and the run still deletes.
  let libraryFailed = false;
  const { data: items } = await supabase
    .from('content_library_items')
    .select('id')
    .eq('source_run_id', run.id)
    .limit(1);
  if (((items ?? []) as { id: string }[]).length > 0) {
    try {
      await callContentLibrary('delete-items-by-run', { run_id: run.id });
    } catch (e) {
      // Transient edge failure: leave the item rather than block the run
      // delete; the caller warns per run (the cron marks a post 'failed'
      // when its asset is gone, so the library degrades, not breaks).
      libraryFailed = true;
      Sentry.captureException(e, { tags: { feature: 'omni-history-delete-library' }, extra: { runId: run.id } });
    }
  }

  const folder = `${userId}/omni-images/${run.id}`;
  const paths = await listRunFolder(folder);
  if (paths.length > 0) {
    // Retake clones reference bytes in their source run's folder verbatim;
    // never destroy a file another run still points at.
    const { data: refs, error: refsError } = await supabase
      .from('omni_assets')
      .select('storage_path')
      .neq('run_id', run.id)
      .like('storage_path', `${folder}/%`);
    if (refsError) throw new Error(`Could not check references: ${refsError.message}`);
    const referenced = new Set(((refs ?? []) as { storage_path: string | null }[]).map((r) => r.storage_path));
    const toRemove = paths.filter((path) => !referenced.has(path));
    if (toRemove.length > 0) {
      const { error: removeError } = await supabase.storage.from('files').remove(toRemove);
      if (removeError) throw new Error(`Could not delete stored images: ${removeError.message}`);
    }
  }
  const { error } = await supabase.from('omni_runs').delete().eq('id', run.id);
  if (error) throw error;
  return { libraryFailed };
}

/**
 * Hard delete: run rows (assets cascade) + each run's own storage folder,
 * sparing files referenced by other runs. Linked Content Library items are
 * removed via the batched edge action (deleteOneRun). Pass 'all' to clear
 * every run server-side — it LOOPS until the table is empty (HIST-05), so
 * accounts larger than one fetch window still clear completely.
 */
export function useDeleteRuns() {
  const invalidate = useInvalidateHistory();
  return useMutation({
    mutationFn: async (target: OmniRun[] | 'all') => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');
      const userId = userData.user.id;

      let deleted = 0;
      let failed = 0;
      const libraryWarnings: string[] = [];

      const deleteBatch = async (runs: OmniRun[]) => {
        for (const run of runs) {
          try {
            const { libraryFailed } = await deleteOneRun(run, userId);
            if (libraryFailed) libraryWarnings.push(run.title || 'Untitled run');
            deleted += 1;
          } catch (e) {
            failed += 1;
            Sentry.captureException(e, { tags: { feature: 'omni-history-delete' }, extra: { runId: run.id } });
          }
        }
      };

      if (target === 'all') {
        // Loop until empty: each pass fetches a fresh window; runs that
        // failed to delete are excluded from the next pass's count check via
        // the failure guard (bail if a full pass deletes nothing).
        for (;;) {
          const { data, error } = await supabase.from('omni_runs').select('*').limit(200);
          if (error) throw error;
          const runs = (data ?? []) as OmniRun[];
          if (runs.length === 0) break;
          const before = deleted;
          await deleteBatch(runs);
          if (deleted === before) break; // nothing deletable left — avoid spinning
        }
      } else {
        await deleteBatch(target);
      }
      return { deleted, failed, libraryWarnings };
    },
    onSuccess: ({ deleted, failed, libraryWarnings }) => {
      invalidate();
      const message = failed > 0 ? `${deleted} deleted. ${failed} failed` : `${deleted} deleted`;
      if (failed > 0) toast.error(message);
      else toast.success(message);
      // Per-run warning when a linked library entry could not be removed (HIST-04).
      for (const title of libraryWarnings.slice(0, 3)) {
        toast.warning(`"${title}": its Content Library entry could not be removed. Delete it from Pulse → Library.`);
      }
      if (libraryWarnings.length > 3) {
        toast.warning(`${libraryWarnings.length - 3} more runs kept their Content Library entries.`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Reference an existing asset's storage in a new run (bytes are never copied). */
async function referenceAssetInRun(runId: string, userId: string, asset: OmniAsset): Promise<string> {
  const { data: created, error } = await supabase
    .from('omni_assets')
    .insert({
      user_id: userId,
      run_id: runId,
      kind: 'image',
      status: 'done',
      storage_path: asset.storage_path,
      mime_type: asset.mime_type,
      width: asset.width,
      height: asset.height,
      metadata: { source: 'retake', source_asset_id: asset.id } as never,
    })
    .select('id')
    .single();
  if (error || !created) throw new Error(error?.message ?? 'Could not reference the source image');
  return (created as { id: string }).id;
}

export interface RetakeResult {
  run: OmniRun;
}

/** Edits applied to the clone's seed before it is created (HIST-15). */
export interface RetakeOverrides {
  title?: string;
  objective?: string;
  /** locked_prompt for Studio-family runs, transform_prompt for Transform. */
  prompt?: string;
  /** Carry the source's model selections into the clone (default true). */
  keepModels?: boolean;
}

export interface RetakeInput {
  source: OmniRun;
  overrides?: RetakeOverrides;
}

/** Clone a run into a fresh one seeded with its (optionally edited) inputs. */
export function useRetakeRun() {
  const queryClient = useQueryClient();
  return useMutation<RetakeResult, Error, RetakeInput>({
    mutationFn: async ({ source, overrides }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');
      const userId = userData.user.id;
      const state = source.step_state as OmniImagesState;

      const title = overrides?.title?.trim() || source.title;
      const objective = overrides?.objective?.trim() || state.objective;
      const promptOverride = overrides?.prompt?.trim() || undefined;
      const keepModels = overrides?.keepModels !== false;
      const modelSelections = keepModels ? state.model_selections : undefined;

      const insertRun = async (seed: OmniImagesState, currentStep: number): Promise<OmniRun> => {
        const { data, error } = await supabase
          .from('omni_runs')
          .insert({
            user_id: userId,
            mode: source.mode,
            title,
            current_step: currentStep,
            step_state: seed as never,
          })
          .select('*')
          .single();
        if (error || !data) throw new Error(error?.message ?? 'Could not create the retake run');
        return data as OmniRun;
      };

      const fetchAssets = async (ids: string[]): Promise<OmniAsset[]> => {
        if (ids.length === 0) return [];
        const { data, error } = await supabase.from('omni_assets').select('*').in('id', ids);
        if (error) throw error;
        return (data ?? []) as OmniAsset[];
      };

      if (source.mode === 'transform_upscale') {
        const [original] = await fetchAssets(state.source_asset_id ? [state.source_asset_id] : []);
        if (!original?.storage_path) throw new Error('The original source image no longer exists');
        const run = await insertRun({}, 1);
        const newRef = await referenceAssetInRun(run.id, userId, original);
        const seed: OmniImagesState = {
          source_asset_id: newRef,
          analysis: state.analysis,
          transform_prompt: promptOverride ?? state.transform_prompt,
          model_selections: modelSelections,
          retake_of: source.id,
        };
        const { data, error } = await supabase
          .from('omni_runs')
          .update({ current_step: V1_TRANSFORM_RESEED_STEP, step_state: seed as never })
          .eq('id', run.id)
          .select('*')
          .single();
        if (error || !data) throw new Error(error?.message ?? 'Could not seed the retake run');
        return { run: data as OmniRun };
      }

      if (source.mode === 'repurposing') {
        const originals = (await fetchAssets(state.selected_asset_ids ?? [])).filter((a) => a.storage_path);
        if (originals.length === 0) throw new Error('The original source images no longer exist');
        const run = await insertRun({}, 1);
        const newIds: string[] = [];
        for (const original of originals) {
          newIds.push(await referenceAssetInRun(run.id, userId, original));
        }
        const seed: OmniImagesState = {
          objective,
          locked_prompt: promptOverride ?? state.locked_prompt,
          generated_asset_ids: newIds,
          selected_asset_ids: newIds,
          schema_version: 2,
          retake_of: source.id,
        };
        const { data, error } = await supabase
          .from('omni_runs')
          .update({ current_step: stageOrdinal(V2_HANDOFF_STAGE), step_state: seed as never })
          .eq('id', run.id)
          .select('*')
          .single();
        if (error || !data) throw new Error(error?.message ?? 'Could not seed the retake run');
        return { run: data as OmniRun };
      }

      // omni_images / surprise_me / brainstorming: restart at step 1 with the
      // creative inputs. Brainstorm clones keep their conversation and lock
      // flag (HIST-03): without idea_locked the clone routed to an EMPTY chat
      // even though the source had already locked its idea into the wizard.
      const run = await insertRun(
        {
          objective,
          optimized_prompt: state.optimized_prompt,
          locked_prompt: promptOverride ?? state.locked_prompt,
          // An edited prompt is user-authored again: the edge re-grounds it.
          prompt_provenance: promptOverride ? 'raw' : state.prompt_provenance,
          model_selections: modelSelections,
          // Wishpedia character anchoring survives the retake: without the
          // refs a Character Studio clone would generate a look-alike.
          reference_image_refs: state.reference_image_refs,
          origin: state.origin,
          character_entry_id: state.character_entry_id,
          retake_of: source.id,
          // Clones are born v2 (stage ordinal 1 = brief). Brainstorm clones
          // keep their conversation + lock flag (HIST-03); an UNLOCKED clone
          // stays unstamped so it keeps routing to the chat surface.
          ...(source.mode === 'brainstorming'
            ? { messages: state.messages, idea_locked: state.idea_locked, ...(state.idea_locked ? { schema_version: 2 } : {}) }
            : { schema_version: 2 }),
        },
        1,
      );
      return { run };
    },
    onSuccess: ({ run }) => {
      queryClient.setQueryData(['omni-run', run.id], run);
      queryClient.invalidateQueries({ queryKey: ['omni-runs'] });
      toast.success('Retake created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
