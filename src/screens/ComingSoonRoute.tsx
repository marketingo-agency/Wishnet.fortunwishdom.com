"use client";

/**
 * Helper that mirrors the old src/App.tsx ComingSoonRoute pattern.
 * Looks up a route in routeConfig.ts by path, renders <ComingSoon /> with
 * the matching title/description/icon, and conditionally wraps it in
 * <ToolProtectedRoute> if the route has a toolKey.
 */
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import ComingSoon from "@/screens/ComingSoon";
import { Sparkles } from "lucide-react";
import {
  AI_AGENT_ROUTES,
  MARKETING_ROUTES,
  WISHDOM_ROUTES,
  OTHER_ROUTES,
} from "@/routes/routeConfig";

const ALL_ROUTES = [
  ...AI_AGENT_ROUTES,
  ...MARKETING_ROUTES,
  ...WISHDOM_ROUTES,
  ...OTHER_ROUTES,
];

export function ComingSoonRoute({ path }: { path: string }) {
  const route = ALL_ROUTES.find((r) => r.path === path);

  if (!route) {
    return (
      <ComingSoon
        title="Coming Soon"
        description="This feature is on the roadmap."
        icon={Sparkles}
        iconColor="text-muted-foreground"
      />
    );
  }

  const content = (
    <ComingSoon
      title={route.title}
      description={route.description}
      icon={route.icon}
      iconColor={route.iconColor}
    />
  );

  if (route.toolKey) {
    return (
      <ToolProtectedRoute toolKey={route.toolKey}>{content}</ToolProtectedRoute>
    );
  }

  return content;
}
