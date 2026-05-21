import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import HeartRules from "@/screens/HeartRules";

export const metadata: Metadata = { title: 'Heart Rules | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <HeartRules />
    </ToolProtectedRoute>
  );
}
