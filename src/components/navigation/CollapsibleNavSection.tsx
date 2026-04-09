/**
 * CollapsibleNavSection
 * Reusable collapsible navigation section for the sidebar
 */

"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface NavSubItem {
  title: string;
  url: string;
  icon: LucideIcon;
  iconColor: string;
  end?: boolean;
}

interface CollapsibleNavSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  iconColor: string;
  items: NavSubItem[];
  defaultUrl: string;
  collapsed: boolean;
  className?: string;
}

export function CollapsibleNavSection({
  id,
  title,
  icon: Icon,
  iconColor,
  items,
  defaultUrl,
  collapsed,
  className,
}: CollapsibleNavSectionProps) {
  const pathname = usePathname() ?? '';

  // Check if any item in this section is active
  const isActive = items.some(item =>
    item.end
      ? pathname === item.url
      : pathname.startsWith(item.url)
  ) || pathname.startsWith(defaultUrl);

  const groupClassName = `group/${id}`;

  return (
    <Collapsible defaultOpen={isActive} className={cn(groupClassName, className)}>
      <SidebarMenuItem>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton asChild>
                <NavLink
                  to={defaultUrl}
                  className="flex items-center justify-center rounded-lg h-8 w-8 transition-all duration-150 text-foreground hover:bg-muted"
                  activeClassName="bg-blue-50 text-blue-500 font-medium"
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", iconColor)} strokeWidth={1.5} />
                </NavLink>
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right">{title}</TooltipContent>
          </Tooltip>
        ) : (
          <CollapsibleTrigger asChild>
            <SidebarMenuButton 
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-3.5 transition-all duration-150 text-foreground hover:bg-muted w-full",
                isActive && "bg-blue-50 text-blue-500 font-medium"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", iconColor)} strokeWidth={1.5} />
              <span className="flex-1 truncate text-base font-medium text-left">{title}</span>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  `group-data-[state=open]/${id}:rotate-180`
                )} 
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
        )}
        
        {!collapsed && (
          <CollapsibleContent>
            <SidebarMenuSub className="ml-6 mt-1 space-y-1">
              {items.map((item) => (
                <SidebarMenuSubItem key={item.title}>
                  <SidebarMenuSubButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-base font-medium text-foreground hover:bg-muted transition-all duration-150"
                      activeClassName="bg-blue-50 text-blue-500"
                    >
                      <item.icon className={cn("h-5 w-5", item.iconColor)} strokeWidth={1.5} />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}
