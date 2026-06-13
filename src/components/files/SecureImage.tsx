"use client";

/**
 * Renders an image stored in the private `files` bucket via a freshly-signed
 * URL (re-signed on mount), falling back to a placeholder while resolving or
 * when the object is missing/orphaned. useSecureImageUrl passes external and
 * public-bucket URLs through unchanged, so this is safe for any stored ref.
 *
 * Use this anywhere a files-bucket image is DISPLAYED with a plain <img>
 * (pickers, galleries, chat outputs) instead of getPublicUrl, which 403s.
 */

import { useEffect, useState } from 'react';
import { AvatarImage } from '@/components/ui/avatar';
import { useSecureImageUrl } from '@/hooks/files';

interface SecureImageProps {
  /** A files-bucket storage path, or a stored public/signed URL. */
  stored: string | null | undefined;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  /** Shown while the signed URL resolves or if the image fails to load. */
  fallback?: React.ReactNode;
}

export function SecureImage({ stored, alt, className, loading = 'lazy', fallback = null }: SecureImageProps) {
  const url = useSecureImageUrl(stored);
  const [errored, setErrored] = useState(false);
  // Clear a prior load error when the resolved URL changes (the ref was swapped
  // or re-signed), so a one-off failure does not stick to a now-valid image.
  useEffect(() => setErrored(false), [url]);

  if (!url || errored) return <>{fallback}</>;

  return (
    <img
      src={url}
      alt={alt}
      loading={loading}
      onError={() => setErrored(true)}
      className={className}
    />
  );
}

/**
 * Radix AvatarImage that re-signs a private `files`-bucket avatar reference.
 * Public-bucket avatars (profile-pictures) and external URLs pass through
 * unchanged. Render inside an <Avatar>; AvatarFallback still shows initials
 * while the URL resolves or if the image is missing.
 */
export function SecureAvatarImage({ src, alt, className }: { src: string | null | undefined; alt?: string; className?: string }) {
  const resolved = useSecureImageUrl(src);
  return <AvatarImage src={resolved || undefined} alt={alt} className={className} />;
}
