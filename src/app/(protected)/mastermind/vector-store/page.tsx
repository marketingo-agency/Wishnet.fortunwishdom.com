"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import VectorStore from "@/screens/VectorStore";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <VectorStore />
    </ToolProtectedRoute>
  );
}
