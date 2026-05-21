import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import AIAgents from "@/screens/AIAgents";

export const metadata: Metadata = { title: 'AI Agents | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents">
      <AIAgents />
    </ToolProtectedRoute>
  );
}
