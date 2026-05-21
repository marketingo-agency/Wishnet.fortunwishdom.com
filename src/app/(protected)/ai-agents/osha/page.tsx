import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import OshaAgent from "@/screens/OshaAgent";

export const metadata: Metadata = { title: 'Osha | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents">
      <OshaAgent />
    </ToolProtectedRoute>
  );
}
