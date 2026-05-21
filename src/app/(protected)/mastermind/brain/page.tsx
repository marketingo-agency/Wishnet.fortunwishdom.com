import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import BrainKnowledge from "@/screens/BrainKnowledge";

export const metadata: Metadata = { title: 'Brain Knowledge | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <BrainKnowledge />
    </ToolProtectedRoute>
  );
}
