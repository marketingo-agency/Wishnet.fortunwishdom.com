import type { Metadata } from 'next';
import { ComingSoonRoute } from "@/screens/ComingSoonRoute";

export const metadata: Metadata = { title: 'ATLAS | Fortun Wishnet' };

export default function Page() {
  return <ComingSoonRoute path="/ai-agents/atlas" />;
}
