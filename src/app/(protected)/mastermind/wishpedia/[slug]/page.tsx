"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import WishpediaEntry from "@/screens/WishpediaEntry";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <WishpediaEntry />
    </ToolProtectedRoute>
  );
}
