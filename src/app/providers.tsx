"use client";

/**
 * Global providers for the Next.js App Router.
 * Preserves the exact nesting order from the old src/App.tsx:
 *   ErrorBoundary → QueryClient → Tooltip → Toaster + Sonner → Auth → Branding
 * `BrowserRouter` is NOT included — Next.js App Router replaces it.
 */
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/components/BrandingProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  // `useState` ensures the QueryClient is created once per browser session
  // (not recreated on every re-render, which would drop the cache).
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,          // 30s — avoid refetching on every mount
        retry: 1,                    // retry once, not 3 times
        refetchOnWindowFocus: false, // admin app, no need
      },
      mutations: {
        retry: 0, // never retry mutations
      },
    },
  }));

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthProvider>
              <BrandingProvider>{children}</BrandingProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
