-- Root cause of "Finalize failed: Failed to create the Content Library posts":
-- YouTube + Pinterest were added to the Omni edge NETWORKS allowlist (commit 7cf14ee)
-- but content_library_posts.network still had the stale 4-value CHECK, so any post
-- targeting youtube/pinterest was rejected with a 23514 constraint violation (which,
-- with no transaction, also orphaned the just-created content_library_items row).
ALTER TABLE public.content_library_posts
  DROP CONSTRAINT IF EXISTS content_library_posts_network_check;

ALTER TABLE public.content_library_posts
  ADD CONSTRAINT content_library_posts_network_check
  CHECK (network = ANY (ARRAY['facebook','instagram','x','tiktok','youtube','pinterest']));
