# Manual Supabase Changes (applied via MCP, not in migrations/)

These SQL changes were applied to the live Supabase project via MCP
tooling and are NOT tracked in `supabase/migrations/`. Re-apply them
manually if the database is ever rebuilt from migrations alone.

---

## 2026-04-09 — SUP-001 / SEC-007: lock down `wishpedia-media` bucket

```sql
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'wishpedia-media';

DROP POLICY IF EXISTS "Authenticated users can upload wishpedia media"
  ON storage.objects;

CREATE POLICY "Admins can upload wishpedia media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'wishpedia-media' AND is_admin(auth.uid()));
```

**Why:** bucket was anon-readable (expected) but allowed *any* authed
user to upload any file type at any size to any path. Admin-only INSERT
plus a 10 MB / image-only allowlist closes the hole.
