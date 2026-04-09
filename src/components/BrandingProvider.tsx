import { useEffect } from 'react';
import { useBranding } from '@/hooks/useBranding';

interface BrandingProviderProps {
  children: React.ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const { data: branding } = useBranding();

  useEffect(() => {
    // Update document title
    if (branding?.app_title) {
      document.title = branding.app_title;
    }

    // Update favicon - use custom or default to infinity symbol
    const faviconUrl = branding?.favicon_url || '/favicon.svg';
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (link) {
      link.href = faviconUrl;
    } else {
      link = document.createElement('link');
      link.rel = 'icon';
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
  }, [branding]);

  return <>{children}</>;
}
