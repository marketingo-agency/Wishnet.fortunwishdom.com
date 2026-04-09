"use client";

import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    Omit<LinkProps, "href"> {
  /**
   * Backwards-compatible: accept either `to` (react-router-dom convention)
   * or `href` (Next.js convention). `to` wins for legacy callers.
   */
  to?: string;
  href?: string;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  end?: boolean;
}

/**
 * Drop-in replacement for the old react-router-dom NavLink wrapper.
 * Uses next/link + usePathname to compute the active state, so the API
 * (className/activeClassName/end) stays compatible with the rest of the app.
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    { className, activeClassName, pendingClassName, to, href, end, children, ...props },
    ref,
  ) => {
    const target = to ?? href ?? "/";
    const pathname = usePathname() ?? "";
    const isActive = end
      ? pathname === target
      : pathname === target || pathname.startsWith(`${target}/`);

    // pendingClassName has no equivalent in App Router; preserved as accepted
    // prop so existing call sites compile, but never applied.
    void pendingClassName;

    return (
      <Link
        ref={ref}
        href={target}
        className={cn(className, isActive && activeClassName)}
        {...props}
      >
        {children}
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
