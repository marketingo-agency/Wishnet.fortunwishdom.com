"use client";
import { Suspense } from "react";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import NexusAgent from "@/screens/NexusAgent";

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_nexus">
      <Suspense>
        <NexusAgent />
      </Suspense>
    </ToolProtectedRoute>
  );
}
