import type { Metadata } from 'next';
import Dashboard from "@/screens/Dashboard";

export const metadata: Metadata = { title: 'Dashboard | Fortun Wishnet' };

export default function Page() {
  return <Dashboard />;
}
