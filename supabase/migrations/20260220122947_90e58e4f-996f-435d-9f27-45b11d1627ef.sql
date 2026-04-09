
-- Add slug column
ALTER TABLE public.wishpedia_entries ADD COLUMN slug text;

-- Backfill existing entries
UPDATE public.wishpedia_entries SET slug = lower(regexp_replace(replace(name, ' ', '-'), '[^a-z0-9-]', '', 'g'));

-- Set NOT NULL and UNIQUE
ALTER TABLE public.wishpedia_entries ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.wishpedia_entries ADD CONSTRAINT wishpedia_entries_slug_key UNIQUE (slug);
