"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import HeartRules from "@/screens/HeartRules";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="mastermind">
      <HeartRules />
    </ToolProtectedRoute>
  );
}
