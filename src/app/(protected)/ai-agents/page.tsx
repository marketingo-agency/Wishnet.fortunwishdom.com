"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import AIAgents from "@/screens/AIAgents";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents">
      <AIAgents />
    </ToolProtectedRoute>
  );
}
