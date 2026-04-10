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

---

## 2026-04-10 — SUP-004: Add 6 missing FK indexes

```sql
CREATE INDEX IF NOT EXISTS idx_brain_documents_uploaded_by ON brain_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_files_sector_id ON files(sector_id);
CREATE INDEX IF NOT EXISTS idx_heart_rules_created_by ON heart_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_wishpedia_entries_category_id ON wishpedia_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_wishpedia_entry_images_entry_id ON wishpedia_entry_images(entry_id);
```

**Why:** 6 foreign keys had no covering index, causing full table scans
on JOIN/WHERE clauses involving these columns.

---

## 2026-04-10 — SEC-008: Leaked password protection

**Action required (manual):** Toggle "Leaked password protection" ON in
Supabase Dashboard → Authentication → Settings → Password Protection.
This cannot be set via SQL — it's a dashboard-only setting.

---

## 2026-04-10 — RAG-001 / process-embeddings deployed

The process-embeddings chunker fix from Phase A has now been deployed
as v110 via MCP (previously noted as pending CLI deploy). The note
above about needing a manual CLI deploy is now resolved.
