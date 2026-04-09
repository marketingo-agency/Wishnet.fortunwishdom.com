"use client";
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import FilesManager from "@/screens/FilesManager";
export default function Page() {
  return (
    <ToolProtectedRoute toolKey="files_manager">
      <FilesManager />
    </ToolProtectedRoute>
  );
}
