import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import OmniAgent from "@/screens/OmniAgent";

export const metadata: Metadata = { title: 'Omni | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_omni">
      <OmniAgent />
    </ToolProtectedRoute>
  );
}
