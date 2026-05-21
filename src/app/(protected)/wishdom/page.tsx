import type { Metadata } from 'next';
import { ComingSoonRoute } from "@/screens/ComingSoonRoute";

export const metadata: Metadata = { title: 'Fortun Wishdom | Fortun Wishnet' };

export default function Page() {
  return <ComingSoonRoute path="/wishdom" />;
}
