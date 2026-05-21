import type { Metadata } from 'next';
import ReleaseNotes from "@/screens/ReleaseNotes";

export const metadata: Metadata = { title: 'Release Notes | Fortun Wishnet' };

export default function Page() {
  return <ReleaseNotes />;
}
