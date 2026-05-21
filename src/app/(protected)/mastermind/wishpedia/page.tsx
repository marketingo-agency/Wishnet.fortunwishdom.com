import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import WishpediaIndex from "@/screens/WishpediaIndex";

export const metadata: Metadata = { title: 'Wishpedia | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <WishpediaIndex />
    </ToolProtectedRoute>
  );
}
