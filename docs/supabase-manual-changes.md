# Manual Supabase Changes (applied via MCP, not in migrations/)

These SQL changes were applied to the live Supabase project via MCP
tooling and are NOT tracked in `supabase/migrations/`. Re-apply them
manually if the database is ever rebuilt from migrations alone.

---

## 2026-04-09 — RAG-001: process-embeddings needs redeploy

The chunker fix in `supabase/functions/process-embeddings/index.ts`
(line ~104, the main `chunkText` function) was committed to the repo
but the deployed edge function was NOT updated during the autonomous
Phase A run because the 790-line file is too large to deploy via the
MCP inline payload. **Action:** run `supabase functions deploy
process-embeddings --project-ref zlmideilxfnokemzkavm` once a
Supabase CLI is available.

(`process-ocr` received the same fix and *was* successfully deployed
as v99 on 2026-04-09.)

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
