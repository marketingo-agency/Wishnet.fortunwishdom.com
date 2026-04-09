"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import BrainKnowledge from "@/screens/BrainKnowledge";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <BrainKnowledge />
    </ToolProtectedRoute>
  );
}
