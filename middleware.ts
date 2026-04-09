/**
 * Next.js middleware — refreshes Supabase session on every request.
 * Matches all paths except static assets, image optimizer, and Next internals.
 */
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.svg, favicon.ico
     * - Any file with an extension (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.svg|favicon\\.ico|.*\\..*).*)',
  ],
};
