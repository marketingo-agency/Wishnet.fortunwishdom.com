"use client";
import { Suspense } from "react";
import Login from "@/screens/Login";
export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
