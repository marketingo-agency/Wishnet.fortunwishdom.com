import { useEffect, useMemo, useState } from 'react';
import { extractFilesStoragePath, getSignedFileUrl } from './fileUrls';

/**
 * Resolve a stored image reference (a private `files` bucket URL/path) to a FRESH
 * signed URL on every mount, so AI-generated images (Osha, Pixel) never break when
 * the originally-stored 24h signed URL expires. The `files` bucket is private and
 * the storage RLS lets the owner (whose id is the first path segment) re-sign.
 *
 * - `files`-bucket references → re-signed (24h) on mount; returns undefined until resolved.
 * - External / non-`files` URLs → returned as-is.
 * - Empty input → undefined.
 */
export function useSecureImageUrl(stored: string | null | undefined): string | undefined {
  // A `files`-bucket reference needs an async signed URL; anything else
  // (external / public-bucket URL) is used verbatim and resolves synchronously.
  const path = useMemo(() => (stored ? extractFilesStoragePath(stored) : null), [stored]);
  // Track which path the signed URL belongs to, so a `stored` change never
  // returns the PREVIOUS ref's signed URL for a tick (no stale image flash).
  const [entry, setEntry] = useState<{ path: string | null; url: string | undefined }>({ path: null, url: undefined });

  useEffect(() => {
    let active = true;
    if (!path) {
      setEntry({ path: null, url: undefined });
      return;
    }
    getSignedFileUrl(path, 60 * 60 * 24)
      .then((signed) => { if (active) setEntry({ path, url: signed ?? undefined }); })
      .catch(() => { if (active) setEntry({ path, url: undefined }); });
    return () => { active = false; };
  }, [path]);

  if (!stored) return undefined;
  if (!path) return stored; // non-files ref: synchronous passthrough
  return entry.path === path ? entry.url : undefined; // files ref: only the URL signed for THIS path
}
