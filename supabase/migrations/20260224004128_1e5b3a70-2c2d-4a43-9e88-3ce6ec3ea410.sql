ALTER TABLE public.pixel_messages ADD COLUMN is_video boolean DEFAULT false;
ALTER TABLE public.pixel_messages ADD COLUMN video_url text;