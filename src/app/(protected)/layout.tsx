"use client";

/**
 * Layout for the (protected) route group.
 * Wraps every authenticated page in:
 *   1. ProtectedRoute — redirects to /login if no user, shows spinner while loading
 *   2. MainLayout — sidebar + header + osha floating bubble shell
 *
 * Both components are reused unchanged from the Vite app.
 */
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}
