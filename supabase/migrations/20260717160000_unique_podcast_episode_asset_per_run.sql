-- Plan 3 QA (code-reviewer Critical): the client's manual Assemble and the
-- finisher's tab-closed assembly sweep could both submit a paid merge-audios
-- job in the same window. One non-failed podcast_episode asset per run,
-- enforced atomically - the insert IS the claim; the loser hits 23505 and
-- adopts the winner's row.
create unique index if not exists omni_assets_one_podcast_episode_per_run
  on public.omni_assets (run_id)
  where (metadata->>'kind') = 'podcast_episode' and status <> 'failed';
