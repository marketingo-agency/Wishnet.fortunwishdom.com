"use client";
import { Suspense } from "react";
import Settings from "@/screens/Settings";

export default function Page() {
  return (
    <Suspense>
      <Settings />
    </Suspense>
  );
}
