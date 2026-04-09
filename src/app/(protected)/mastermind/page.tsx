"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import MasterMind from "@/screens/MasterMind";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <MasterMind />
    </ToolProtectedRoute>
  );
}
