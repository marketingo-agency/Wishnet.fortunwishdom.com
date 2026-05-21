import type { Metadata } from 'next';
import Profile from "@/screens/Profile";

export const metadata: Metadata = { title: 'Profile | Fortun Wishnet' };

export default function Page() {
  return <Profile />;
}
