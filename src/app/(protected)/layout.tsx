/**
 * Layout for the (protected) route group.
 *
 * SEC-019 / UI-026: Server-side auth check runs BEFORE any client JS,
 * eliminating the flash of protected content for unauthenticated users.
 * The ProtectedShell (client) keeps a fallback guard for edge cases
 * like expired sessions during client-side navigation.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProtectedShell } from './ProtectedShell';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}
