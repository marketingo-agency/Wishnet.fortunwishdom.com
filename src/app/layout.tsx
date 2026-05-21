/* eslint-disable react-refresh/only-export-components -- Next.js layout files must co-export route config (dynamic, metadata) alongside the component */
/**
 * Root layout for the Next.js App Router.
 * Loads global CSS, fonts (Inter + Poppins via next/font), exports metadata,
 * and wraps the tree in the client-side Providers.
 */
import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Providers } from "./providers";

// Only load Vercel telemetry when actually running on Vercel's CDN.
// Locally-hosted or self-hosted deploys have no /_vercel/* endpoints, so the
// scripts 404 and throw console errors. This flag keeps local dev quiet.
const isVercelDeployment = !!process.env.VERCEL;

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Skip build-time prerendering — every route in this admin app needs runtime
// auth cookies, and the legacy Supabase client (replaced in Phase 4) is not
// SSR-safe under all import paths. Phase 4 may relax this per-route.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fortun Wishnet",
  description: "Fortun Wishnet",
  authors: [{ name: "Fortun Wishnet" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Fortun Wishnet",
    description: "Fortun Wishnet",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fortun Wishnet",
    description: "Fortun Wishnet",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-sans`} suppressHydrationWarning>
        {/* UI-010: skip-to-content link for keyboard/screen-reader users (WCAG 2.4.1) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        {isVercelDeployment && <Analytics />}
        {isVercelDeployment && <SpeedInsights />}
      </body>
    </html>
  );
}
