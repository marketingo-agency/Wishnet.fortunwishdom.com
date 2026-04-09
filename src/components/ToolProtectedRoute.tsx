"use client";

import React from 'react';
import { useCurrentUserPermissions, ToolPermissionKey } from '@/hooks/useUserPermissions';
import type { PermissionLevel } from '@/types/user';
import { Loader2, ShieldX } from 'lucide-react';

interface ToolProtectedRouteProps {
  children: React.ReactNode;
  toolKey: ToolPermissionKey;
  requiredLevel?: PermissionLevel;
}

// Check if user's permission level meets the required level
function meetsPermissionLevel(userLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean {
  const levelOrder: PermissionLevel[] = ['none', 'view', 'limited', 'full'];
  const userIndex = levelOrder.indexOf(userLevel);
  const requiredIndex = levelOrder.indexOf(requiredLevel);
  return userIndex >= requiredIndex;
}

export function ToolProtectedRoute({ 
  children, 
  toolKey, 
  requiredLevel = 'view' 
}: ToolProtectedRouteProps) {
  const { permissions, isLoading } = useCurrentUserPermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userLevel = permissions?.[toolKey] || 'none';
  const hasAccess = meetsPermissionLevel(userLevel, requiredLevel);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <ShieldX className="h-16 w-16 text-muted-foreground/50" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access this tool. Please contact an administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
