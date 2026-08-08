import type { Metadata } from 'next';
import { ToolProtectedRoute } from '@/components/ToolProtectedRoute';
import OneScreenPreview from '@/screens/OneScreenPreview';

export const metadata: Metadata = { title: 'One-Screen Preview | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_omni">
      <OneScreenPreview />
    </ToolProtectedRoute>
  );
}
