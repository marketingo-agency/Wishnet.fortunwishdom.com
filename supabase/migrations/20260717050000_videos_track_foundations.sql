-- Plan 2 (Omni Videos track) Phase 1 foundations — D-V1/D-V7/D-V8/D-V10.
-- 1) omni_runs.mode gains the five video modes (ONE widening — landmine #11:
--    all five land before any client writes them).
-- 2) omni_assets.status gains 'persisting' (the D-V7 compare-and-set claim
--    state shared by client poll and the finisher).
-- 3) Private omni-video bucket (whisper-audio precedent, but owner-scoped
--    like omni assets + admin read for the Content Library).
-- 4) content_library media_type columns ('image' default — backfill-free).

alter table public.omni_runs drop constraint omni_runs_mode_check;
alter table public.omni_runs add constraint omni_runs_mode_check
  check (mode in (
    'omni_images','transform_upscale','repurposing','surprise_me','brainstorming',
    'video_scenario','omni_videos','video_clips','video_animate','video_repurpose'
  ));

alter table public.omni_assets drop constraint omni_assets_status_check;
alter table public.omni_assets add constraint omni_assets_status_check
  check (status in ('pending','generating','persisting','done','failed','discarded'));

-- ── omni-video storage bucket (private; signed URLs only) ────────────────────
insert into storage.buckets (id, name, public)
values ('omni-video', 'omni-video', false)
on conflict (id) do nothing;

create policy "Users manage own omni-video objects"
  on storage.objects for all
  using (bucket_id = 'omni-video' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'omni-video' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins read omni-video objects"
  on storage.objects for select
  using (bucket_id = 'omni-video' and public.is_admin(auth.uid()));

-- ── media_type ('image' default keeps every existing row + old client valid) ─
alter table public.content_library_items
  add column if not exists media_type text not null default 'image'
  check (media_type in ('image','video'));

alter table public.content_library_posts
  add column if not exists media_type text not null default 'image'
  check (media_type in ('image','video'));
