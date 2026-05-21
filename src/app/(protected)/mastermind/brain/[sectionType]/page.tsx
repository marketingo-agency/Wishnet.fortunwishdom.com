import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import BrainSection from "@/screens/BrainSection";

export const metadata: Metadata = { title: 'Brain Section | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <BrainSection />
    </ToolProtectedRoute>
  );
}
