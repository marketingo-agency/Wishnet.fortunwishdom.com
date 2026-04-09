"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import BrainSection from "@/screens/BrainSection";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <BrainSection />
    </ToolProtectedRoute>
  );
}
