import { useEffect, useState } from 'react';
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
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (!stored) {
      setUrl(undefined);
      return;
    }
    const path = extractFilesStoragePath(stored);
    if (!path) {
      // Not a files-bucket reference (e.g. external URL) — use as-is.
      setUrl(stored);
      return;
    }
    // Re-sign the path with the caller's session so the URL is always fresh.
    getSignedFileUrl(path, 60 * 60 * 24).then((signed) => {
      if (active) setUrl(signed ?? undefined);
    });
    return () => {
      active = false;
    };
  }, [stored]);

  return url;
}
