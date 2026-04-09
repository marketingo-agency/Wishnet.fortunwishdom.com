-- Fix slugs: apply lower() before stripping non-alphanumeric characters
UPDATE public.wishpedia_entries
SET slug = regexp_replace(lower(replace(name, ' ', '-')), '[^a-z0-9-]', '', 'g');