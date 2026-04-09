/**
 * Root page — redirects to /dashboard via next.config.ts redirects().
 * This file exists only to satisfy Next.js's requirement that every route
 * group have at least one page.tsx.
 */
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
