/**
 * Browser Supabase client backed by @supabase/ssr.
 *
 * `createBrowserClient` reads/writes auth state to cookies (via document.cookie)
 * so the same session is visible to:
 *   - Client components in this file's consumers
 *   - Server components / Route Handlers via src/lib/supabase/server.ts
 *   - middleware.ts (which refreshes the access token on every request)
 *
 * The exported `supabase` symbol keeps the same shape as the legacy
 * @supabase/supabase-js client, so all existing call sites (45 files using
 * `supabase.from(...)`, `.auth.*`, `.functions.invoke(...)`, `.storage.from(...)`)
 * continue to work without changes.
 *
 * Phase 4 changes:
 *   - Removed hardcoded URL + anon key (now read from NEXT_PUBLIC_* env)
 *   - Removed `storage: localStorage` (cookies replace localStorage)
 *   - Removed manual SSR guard (createBrowserClient is SSR-safe)
 */
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in env. ' +
      'See ENV_MIGRATION.md for the Vite → Next.js mapping.',
  );
}

export const supabase = createBrowserClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);
