import { withSentryConfig } from '@sentry/nextjs';
import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const SUPABASE_HOSTNAME = 'zlmideilxfnokemzkavm.supabase.co';

// Baseline security headers applied to every response.
// See SEC-002 in the audit — addresses clickjacking, MIME sniffing,
// forced-TLS, cross-origin leakage, and permission abuse.
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      // fal.media + the two fal GCS gallery paths: model-catalog thumbnails and
      // generated previews rendered by the Omni agent (render-only image sources).
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://fal.media https://*.fal.media https://storage.googleapis.com/falserverless/ https://storage.googleapis.com/fal_cdn/",
      "font-src 'self' data:",
      `connect-src 'self' https://${SUPABASE_HOSTNAME} wss://${SUPABASE_HOSTNAME} https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://va.vercel-scripts.com`,
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // PROD-005: long cache for the 1.4 MB pdfjs worker (content-hashed by Next.js)
      {
        source: '/pdf.worker.min.mjs',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

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

const analyzedConfig = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig);

export default withSentryConfig(analyzedConfig, {
  // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for better stack traces in production
  widenClientFileUpload: true,

  // Disable Sentry telemetry
  telemetry: false,
});
