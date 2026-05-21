import type { Metadata } from 'next';
import ResetPassword from "@/screens/ResetPassword";

export const metadata: Metadata = { title: 'Reset Password | Fortun Wishnet' };

export default function Page() {
  return <ResetPassword />;
}
