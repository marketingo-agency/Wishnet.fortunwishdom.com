/**
 * Supabase session refresh for Next.js middleware.
 * Keeps the user's auth tokens fresh on every request and writes any
 * updated cookies onto the outgoing response.
 *
 * Called from top-level middleware.ts on every request (except static assets).
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/integrations/supabase/types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    // Let the request through; env errors surface at runtime in pages.
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: DO NOT remove this line. Calling getUser() refreshes the
  // session cookie if needed. Skipping it will cause users to be logged
  // out randomly.
  await supabase.auth.getUser();

  return supabaseResponse;
}
