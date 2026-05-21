import type { Metadata } from 'next';
import { ComingSoonRoute } from "@/screens/ComingSoonRoute";

export const metadata: Metadata = { title: 'Taskforce | Fortun Wishnet' };

export default function Page() {
  return <ComingSoonRoute path="/taskforce" />;
}
