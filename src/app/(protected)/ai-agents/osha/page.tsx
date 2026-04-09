"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import OshaAgent from "@/screens/OshaAgent";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents">
      <OshaAgent />
    </ToolProtectedRoute>
  );
}
