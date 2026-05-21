import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import FilesManager from "@/screens/FilesManager";

export const metadata: Metadata = { title: 'Files | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="files_manager">
      <FilesManager />
    </ToolProtectedRoute>
  );
}
