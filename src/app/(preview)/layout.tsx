/**
 * Layout for the (preview) route group.
 *
 * Same server-side auth check as the (protected) group, but renders children
 * BARE, with no MainLayout/AppSidebar/Header chrome. This group hosts
 * full-viewport prototype pages (currently /preview/one-screen) that mock a
 * one-screen shell of their own.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
