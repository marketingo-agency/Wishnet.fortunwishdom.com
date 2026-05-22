import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import OshaAgent from "@/screens/OshaAgent";

export const metadata: Metadata = { title: 'Osha | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_osha">
      <OshaAgent />
    </ToolProtectedRoute>
  );
}
