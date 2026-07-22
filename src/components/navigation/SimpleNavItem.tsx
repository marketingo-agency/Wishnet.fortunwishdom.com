/**
 * SimpleNavItem
 * Reusable simple navigation item for the sidebar
 */

import type { LucideIcon } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface SimpleNavItemProps {
  title: string;
  url: string;
  icon: LucideIcon;
  iconColor: string;
  collapsed: boolean;
}

export function SimpleNavItem({
  title,
  url,
  icon: Icon,
  iconColor,
  collapsed,
}: SimpleNavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={title}>
        <NavLink
          to={url}
          className={cn(
            "flex items-center rounded-lg transition-all duration-150 text-foreground hover:bg-muted",
            collapsed 
              ? "justify-center h-8 w-8"
              : "gap-3 px-2 py-3.5 w-full"
          )}
          activeClassName="bg-blue-50 text-blue-500 font-medium"
        >
          <Icon className={cn("h-5 w-5 flex-shrink-0", iconColor)} strokeWidth={1.5} />
          {!collapsed && (
            <span className="flex-1 truncate text-base font-medium">{title}</span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
