/**
 * Root layout for the Next.js App Router.
 * Loads global CSS, fonts (Inter + Poppins via next/font), exports metadata,
 * and wraps the tree in the client-side Providers.
 */
import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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
      <body className={`${inter.variable} ${poppins.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
