import type { NextConfig } from 'next';

const SUPABASE_HOSTNAME = 'zlmideilxfnokemzkavm.supabase.co';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // `/` → `/dashboard` (matches the old React Router <Navigate>)
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  // Allow remote images from Supabase storage + common avatar sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: SUPABASE_HOSTNAME },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },

  // pdfjs-dist ships a canvas dependency we never want bundled server-side
  serverExternalPackages: ['pdfjs-dist'],

  typescript: {
    // Keep TS errors failing the build; do not silently ignore.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
