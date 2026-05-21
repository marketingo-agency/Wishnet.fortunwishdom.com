import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import PixelAgent from "@/screens/PixelAgent";

export const metadata: Metadata = { title: 'Pixel | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_pixel">
      <PixelAgent />
    </ToolProtectedRoute>
  );
}
