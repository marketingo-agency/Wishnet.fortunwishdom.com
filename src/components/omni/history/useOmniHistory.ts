"use client";

/**
 * History data layer (Mode 6).
 * Runs and covers read through owner-scoped RLS. Delete removes the run row
 * (assets FK-cascade) plus the run's OWN storage folder only; referenced
 * images from Files or the Content Library live elsewhere and are untouched.
 * Retake clones a run into a fresh one seeded with pre-generation inputs so
 * old assets can never satisfy the new plan.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getAssetSignedUrl } from '@/hooks/omni';
import type { OmniAsset, OmniImagesState, OmniRun, OmniRunStatus } from '@/hooks/omni';
import { isRunDeletable } from './historyRouting';

export function useOmniRunsList() {
  return useQuery<OmniRun[]>({
    queryKey: ['omni-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omni_runs')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as OmniRun[];
    },
  });
}

/** One signed cover thumbnail per run (newest done image, outputs preferred). */
export function useRunCovers(runIds: string[]) {
  const key = [...runIds].sort().join(',');
  return useQuery<Record<string, string>>({
    queryKey: ['omni-run-covers', key],
    enabled: runIds.length > 0,
    staleTime: 20 * 60 * 1000,
    // Keep prior thumbnails on screen while a changed key refetches.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omni_assets')
        .select('id, run_id, storage_path, metadata, created_at')
        .in('run_id', runIds)
        .eq('status', 'done')
        .not('storage_path', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as Pick<OmniAsset, 'id' | 'run_id' | 'storage_path' | 'metadata' | 'created_at'>[];
      const coverByRun = new Map<string, string>();
      for (const row of rows) {
        if (coverByRun.has(row.run_id)) continue;
        // Prefer generated outputs over uploaded/referenced sources.
        if (row.metadata?.source && rows.some((r) => r.run_id === row.run_id && !r.metadata?.source)) continue;
        coverByRun.set(row.run_id, row.storage_path!);
      }

      const urls: Record<string, string> = {};
      await Promise.all(
        [...coverByRun.entries()].map(async ([runId, path]) => {
          const url = await getAssetSignedUrl(path);
          if (url) urls[runId] = url;
        }),
      );
      return urls;
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

async function deleteOneRun(run: OmniRun, userId: string): Promise<void> {
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
}

/**
 * Hard delete: run rows (assets cascade) + each run's own storage folder,
 * sparing files referenced by other runs. Pass 'all' to clear every deletable
 * run server-side (the on-screen list is capped at 200).
 */
export function useDeleteRuns() {
  const invalidate = useInvalidateHistory();
  return useMutation({
    mutationFn: async (target: OmniRun[] | 'all') => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');
      const userId = userData.user.id;

      let runs: OmniRun[];
      let skipped = 0;
      if (target === 'all') {
        const { data, error } = await supabase
          .from('omni_runs')
          .select('*')
          .in('status', ['active', 'failed'])
          .limit(1000);
        if (error) throw error;
        runs = (data ?? []) as OmniRun[];
      } else {
        runs = target.filter(isRunDeletable);
        skipped = target.length - runs.length;
      }

      let deleted = 0;
      let failed = 0;
      for (const run of runs) {
        try {
          await deleteOneRun(run, userId);
          deleted += 1;
        } catch (e) {
          failed += 1;
          Sentry.captureException(e, { tags: { feature: 'omni-history-delete' }, extra: { runId: run.id } });
        }
      }
      return { deleted, skipped, failed };
    },
    onSuccess: ({ deleted, skipped, failed }) => {
      invalidate();
      const parts = [`${deleted} deleted`];
      if (skipped > 0) parts.push(`${skipped} skipped (saved to the Content Library; archive them instead)`);
      if (failed > 0) parts.push(`${failed} failed`);
      const message = parts.join('. ');
      if (failed > 0) toast.error(message);
      else if (skipped > 0) toast.info(message);
      else toast.success(message);
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

/** Clone a run into a fresh one seeded with its pre-generation inputs. */
export function useRetakeRun() {
  const queryClient = useQueryClient();
  return useMutation<RetakeResult, Error, OmniRun>({
    mutationFn: async (source: OmniRun) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');
      const userId = userData.user.id;
      const state = source.step_state as OmniImagesState;

      const insertRun = async (seed: OmniImagesState, currentStep: number): Promise<OmniRun> => {
        const { data, error } = await supabase
          .from('omni_runs')
          .insert({
            user_id: userId,
            mode: source.mode,
            title: source.title,
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
          transform_prompt: state.transform_prompt,
          model_selections: state.model_selections,
        };
        const { data, error } = await supabase
          .from('omni_runs')
          .update({ current_step: 2, step_state: seed as never })
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
          objective: state.objective,
          locked_prompt: state.locked_prompt,
          generated_asset_ids: newIds,
          selected_asset_ids: newIds,
        };
        const { data, error } = await supabase
          .from('omni_runs')
          .update({ current_step: 7, step_state: seed as never })
          .eq('id', run.id)
          .select('*')
          .single();
        if (error || !data) throw new Error(error?.message ?? 'Could not seed the retake run');
        return { run: data as OmniRun };
      }

      // omni_images (and future modes): restart at step 1 with the creative inputs.
      const run = await insertRun(
        {
          objective: state.objective,
          optimized_prompt: state.optimized_prompt,
          locked_prompt: state.locked_prompt,
          model_selections: state.model_selections,
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
