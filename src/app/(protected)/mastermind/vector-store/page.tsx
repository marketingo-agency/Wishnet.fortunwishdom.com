import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import VectorStore from "@/screens/VectorStore";

export const metadata: Metadata = { title: 'Vector Store | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <VectorStore />
    </ToolProtectedRoute>
  );
}
