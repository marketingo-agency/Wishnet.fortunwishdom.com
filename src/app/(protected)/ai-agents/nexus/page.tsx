"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import NexusAgent from "@/screens/NexusAgent";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents">
      <NexusAgent />
    </ToolProtectedRoute>
  );
}
