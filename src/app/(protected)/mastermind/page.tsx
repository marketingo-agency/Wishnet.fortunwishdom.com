import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import MasterMind from "@/screens/MasterMind";

export const metadata: Metadata = { title: 'MasterMind | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <MasterMind />
    </ToolProtectedRoute>
  );
}
