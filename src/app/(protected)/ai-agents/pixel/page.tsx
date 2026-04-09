"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import PixelAgent from "@/screens/PixelAgent";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents">
      <PixelAgent />
    </ToolProtectedRoute>
  );
}
