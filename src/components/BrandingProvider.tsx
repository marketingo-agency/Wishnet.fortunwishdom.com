import { useEffect, useRef } from 'react';
import { useBranding } from '@/hooks/useBranding';

interface BrandingProviderProps {
  children: React.ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const { data: branding } = useBranding();
  const appliedTitle = useRef<string | null>(null);
  const appliedFavicon = useRef<string | null>(null);

  useEffect(() => {
    // Update document title only when the value actually changes
    if (branding?.app_title && branding.app_title !== appliedTitle.current) {
      document.title = branding.app_title;
      appliedTitle.current = branding.app_title;
    }

    // Update favicon only when the value actually changes
    const faviconUrl = branding?.favicon_url || '/favicon.svg';
    if (faviconUrl !== appliedFavicon.current) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (link) {
        link.href = faviconUrl;
      } else {
        link = document.createElement('link');
        link.rel = 'icon';
        link.href = faviconUrl;
        document.head.appendChild(link);
      }
      appliedFavicon.current = faviconUrl;
    }
  }, [branding?.app_title, branding?.favicon_url]);

  return <>{children}</>;
}
