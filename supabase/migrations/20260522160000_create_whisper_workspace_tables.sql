-- Whisper workspace — AI Podcast Generator.
-- 4 admin-only RLS tables + a private audio bucket. ElevenLabs key is shared with
-- Pulse (pulse_connections.provider='elevenlabs'); the whisper-api edge function
-- (service role) reads it, synthesizes audio, and uploads to whisper-audio.

-- ── whisper_shows (series) ───────────────────────────────────────────────────
create table if not exists public.whisper_shows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_cast jsonb not null default '{}'::jsonb,     -- { speakerLabel: elevenlabs_voice_id }
  intro_audio_path text,
  outro_audio_path text,
  cover_style text,
  language text not null default 'en',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.whisper_shows enable row level security;
create policy "Admins manage whisper_shows"
  on public.whisper_shows for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── whisper_episodes ─────────────────────────────────────────────────────────
create table if not exists public.whisper_episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references public.whisper_shows(id) on delete set null,
  title text,
  status text not null default 'draft',                -- draft|scripted|rendering|rendered|published|failed
  format text not null default 'two_host',             -- solo|two_host|interview|explainer
  language text not null default 'en',
  source_refs jsonb not null default '[]'::jsonb,       -- [{ type:'brain'|'wishpedia'|'url'|'text', ref, label }]
  script jsonb not null default '[]'::jsonb,            -- [{ speaker, voice_id, text, audio_path? }]
  audio_path text,
  transcript text,
  show_notes jsonb not null default '{}'::jsonb,        -- { title, description, chapters:[{time,label}], tags:[] }
  duration numeric,
  cover_path text,
  generated_by text,
  error text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists whisper_episodes_status_idx on public.whisper_episodes (status);
create index if not exists whisper_episodes_show_idx on public.whisper_episodes (show_id);
create index if not exists whisper_episodes_created_by_idx on public.whisper_episodes (created_by);
alter table public.whisper_episodes enable row level security;
create policy "Admins manage whisper_episodes"
  on public.whisper_episodes for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── whisper_voices (saved presets) ───────────────────────────────────────────
create table if not exists public.whisper_voices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  elevenlabs_voice_id text not null,
  settings jsonb not null default '{}'::jsonb,          -- { stability, similarity_boost, style, use_speaker_boost, speed }
  preview_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.whisper_voices enable row level security;
create policy "Admins manage whisper_voices"
  on public.whisper_voices for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── whisper_settings (single row) ────────────────────────────────────────────
create table if not exists public.whisper_settings (
  id uuid primary key default gen_random_uuid(),
  script_provider text not null default 'openai',       -- openai|gemini|fal
  script_model text not null default 'gpt-4.1',
  tts_model text not null default 'eleven_v3',          -- eleven_v3|eleven_multilingual_v2|eleven_flash_v2_5
  default_format text not null default 'two_host',
  default_language text not null default 'en',
  default_cast jsonb not null default '{}'::jsonb,
  music_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.whisper_settings enable row level security;
create policy "Admins manage whisper_settings"
  on public.whisper_settings for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.whisper_settings (script_provider, script_model, tts_model)
select 'openai', 'gpt-4.1', 'eleven_v3'
where not exists (select 1 from public.whisper_settings);

-- ── whisper-audio storage bucket (private) ───────────────────────────────────
insert into storage.buckets (id, name, public)
values ('whisper-audio', 'whisper-audio', false)
on conflict (id) do nothing;

create policy "Admins manage whisper-audio objects"
  on storage.objects for all to authenticated
  using (bucket_id = 'whisper-audio' and public.is_admin(auth.uid()))
  with check (bucket_id = 'whisper-audio' and public.is_admin(auth.uid()));
