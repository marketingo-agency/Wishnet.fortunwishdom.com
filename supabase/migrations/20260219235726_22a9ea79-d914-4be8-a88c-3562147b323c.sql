
ALTER TABLE public.osha_settings
  ADD COLUMN IF NOT EXISTS bubble_show_status_dot boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bubble_sound_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bubble_button_size text NOT NULL DEFAULT 'standard';

NOTIFY pgrst, 'reload schema';
