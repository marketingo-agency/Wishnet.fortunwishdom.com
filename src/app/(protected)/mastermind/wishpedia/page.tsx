"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import WishpediaIndex from "@/screens/WishpediaIndex";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <WishpediaIndex />
    </ToolProtectedRoute>
  );
}
