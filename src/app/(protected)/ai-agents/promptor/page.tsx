import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import PromptorAgent from "@/screens/PromptorAgent";

export const metadata: Metadata = { title: 'Promptor | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_promptor">
      <PromptorAgent />
    </ToolProtectedRoute>
  );
}
