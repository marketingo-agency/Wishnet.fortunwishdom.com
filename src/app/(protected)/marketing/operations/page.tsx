import type { Metadata } from 'next';
import { ComingSoonRoute } from "@/screens/ComingSoonRoute";

export const metadata: Metadata = { title: 'Marketing Operations | Fortun Wishnet' };

export default function Page() {
  return <ComingSoonRoute path="/marketing/operations" />;
}
