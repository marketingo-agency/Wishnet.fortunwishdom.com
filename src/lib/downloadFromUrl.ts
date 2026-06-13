/**
 * Download a (possibly cross-origin) URL as a file.
 *
 * A plain `<a href download>` is IGNORED by browsers when href is cross-origin
 * (e.g. a Supabase signed URL), and `window.open` merely navigates to it — the
 * image then renders inline because storage responses carry no
 * `Content-Disposition: attachment`. Fetching to a blob and downloading a
 * same-origin `blob:` object URL is the reliable path; the `download` filename
 * hint is honored for same-origin hrefs. The app CSP already allows fetching
 * from Supabase storage (connect-src https://*.supabase.co).
 *
 * Note: the response is buffered fully into memory (res.blob()). That is fine
 * for image- and document-scale assets; for very large media prefer a streamed
 * serve-file route instead.
 */
export async function downloadFromUrl(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke after the click is queued on the event loop.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
