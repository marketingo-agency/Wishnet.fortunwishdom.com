import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import WhisperAgent from "@/screens/WhisperAgent";

export const metadata: Metadata = { title: 'Whisper | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_whisper">
      <WhisperAgent />
    </ToolProtectedRoute>
  );
}
