"use client";

/**
 * Global 404 page. Visual and copy match src/screens/NotFound.tsx exactly,
 * but uses Next.js's usePathname instead of react-router's useLocation.
 * The original screens/NotFound.tsx is untouched (Vite still imports it).
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export default function NotFoundPage() {
  const pathname = usePathname();

  useEffect(() => {
    Sentry.captureMessage("404 Error: User attempted to access non-existent route", {
      level: "warning",
      extra: { pathname },
    });
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
}
