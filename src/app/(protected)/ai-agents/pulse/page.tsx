import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import PulseAgent from "@/screens/PulseAgent";

export const metadata: Metadata = { title: 'Pulse | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_pulse">
      <PulseAgent />
    </ToolProtectedRoute>
  );
}
