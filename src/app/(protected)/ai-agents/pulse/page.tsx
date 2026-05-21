import type { Metadata } from 'next';
import { ComingSoonRoute } from "@/screens/ComingSoonRoute";

export const metadata: Metadata = { title: 'Pulse | Fortun Wishnet' };

export default function Page() {
  return <ComingSoonRoute path="/ai-agents/pulse" />;
}
