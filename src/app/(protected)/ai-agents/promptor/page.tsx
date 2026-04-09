"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import PromptorAgent from "@/screens/PromptorAgent";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents">
      <PromptorAgent />
    </ToolProtectedRoute>
  );
}
