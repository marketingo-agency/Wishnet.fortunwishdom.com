ALTER TABLE public.osha_settings
  ADD COLUMN IF NOT EXISTS bubble_name text NOT NULL DEFAULT 'Osha',
  ADD COLUMN IF NOT EXISTS bubble_subtitle text NOT NULL DEFAULT 'Fortun Wishnet Assistant · Online',
  ADD COLUMN IF NOT EXISTS bubble_accent_color text NOT NULL DEFAULT 'sky',
  ADD COLUMN IF NOT EXISTS bubble_position text NOT NULL DEFAULT 'bottom-right',
  ADD COLUMN IF NOT EXISTS bubble_panel_size text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS bubble_show_mode_selector boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bubble_show_clear_button boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bubble_launch_animation text NOT NULL DEFAULT 'slide-up';