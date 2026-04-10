"use client";
import { Suspense } from "react";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import NexusAgent from "@/screens/NexusAgent";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents">
      <Suspense>
        <NexusAgent />
      </Suspense>
    </ToolProtectedRoute>
  );
}
