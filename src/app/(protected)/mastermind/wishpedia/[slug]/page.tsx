import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import WishpediaEntry from "@/screens/WishpediaEntry";

export const metadata: Metadata = { title: 'Wishpedia Entry | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <WishpediaEntry />
    </ToolProtectedRoute>
  );
}
