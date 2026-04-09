/**
 * Layout for the (public) route group — pure pass-through.
 * /login and /reset-password render full-bleed without the sidebar.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
