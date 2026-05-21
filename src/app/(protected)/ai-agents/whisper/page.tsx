import type { Metadata } from 'next';
import { ComingSoonRoute } from "@/screens/ComingSoonRoute";

export const metadata: Metadata = { title: 'Whisper | Fortun Wishnet' };

export default function Page() {
  return <ComingSoonRoute path="/ai-agents/whisper" />;
}
