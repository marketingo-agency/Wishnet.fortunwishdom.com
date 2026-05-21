"use client";

/**
 * Client wrapper for the protected route group.
 * Renders ProtectedRoute (client-side auth fallback) + MainLayout.
 * The server-side auth check in layout.tsx handles the primary redirect;
 * this wrapper catches edge cases like expired sessions mid-navigation.
 */
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}
