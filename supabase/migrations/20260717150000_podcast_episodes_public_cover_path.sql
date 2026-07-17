-- Plan 3 Phase 9: publish-episode copies the episode cover into the public
-- podcast-public bucket; the feed generator needs the stored object path
-- (audio already has public_audio_path - this is its cover twin).
alter table public.podcast_episodes
  add column if not exists public_cover_path text;
