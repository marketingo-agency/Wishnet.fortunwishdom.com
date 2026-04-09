"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Preserve the originally requested path so /login can return the user.
      const search = pathname && pathname !== '/login'
        ? `?from=${encodeURIComponent(pathname)}`
        : '';
      router.replace(`/login${search}`);
      return;
    }

    if (requireAdmin && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, isAdmin, requireAdmin, router, pathname]);

  if (isLoading || !user || (requireAdmin && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
