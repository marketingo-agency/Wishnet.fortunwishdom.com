import type { Metadata } from 'next';
import { Suspense } from "react";
import Login from "@/screens/Login";

export const metadata: Metadata = { title: 'Login | Fortun Wishnet' };

export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
