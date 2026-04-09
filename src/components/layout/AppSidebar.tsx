import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FortunLogo } from '@/components/brand/FortunLogo';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCurrentUserPermissions } from '@/hooks/useUserPermissions';
import { CollapsibleNavSection, SimpleNavItem } from '@/components/navigation';
import { 
  SINGLE_NAV_ITEMS, 
  NAV_SECTIONS, 
  FOOTER_NAV_ITEMS, 
  TOOL_NAV_ITEMS 
} from '@/data/navigation';
import type { ToolKey } from '@/config/permissions';

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const isMobile = useIsMobile();
  const { permissions, isLoading } = useCurrentUserPermissions();

  // Helper to check if user has access to a tool
  const hasToolAccess = (tool: ToolKey) => {
    if (!permissions) return false;
    return permissions[tool] !== 'none';
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-card shadow-sm">
      {/* Logo */}
      <SidebarHeader className={collapsed ? "p-2" : "px-6 py-8"}>
        <div className="flex items-center justify-center">
          {collapsed ? (
            <FortunLogo variant="mini" className="w-10 h-10" />
          ) : (
            <FortunLogo variant="full" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {/* Single navigation items (Dashboard) */}
              {SINGLE_NAV_ITEMS.map((item) => (
                <SimpleNavItem
                  key={item.url}
                  title={item.title}
                  url={item.url}
                  icon={item.icon}
                  iconColor={item.iconColor}
                  collapsed={collapsed}
                />
              ))}

              {/* Collapsible sections with tool access check */}
              {NAV_SECTIONS.map((section) => (
                hasToolAccess(section.toolKey) && (
                  <CollapsibleNavSection
                    key={section.id}
                    id={section.id}
                    title={section.title}
                    icon={section.icon}
                    iconColor={section.iconColor}
                    items={section.items.map(item => ({
                      title: item.title,
                      url: item.url,
                      icon: item.icon,
                      iconColor: item.iconColor,
                      end: item.end,
                    }))}
                    defaultUrl={section.defaultUrl}
                    collapsed={collapsed}
                  />
                )
              ))}

              {/* Tool-specific simple nav items */}
              {TOOL_NAV_ITEMS.map(({ item, toolKey }) => (
                hasToolAccess(toolKey) && (
                  <SimpleNavItem
                    key={item.url}
                    title={item.title}
                    url={item.url}
                    icon={item.icon}
                    iconColor={item.iconColor}
                    collapsed={collapsed}
                  />
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Settings and Collapse button */}
      <SidebarFooter className="px-2 py-4 mt-auto">
        <SidebarMenu className="space-y-2">
          {/* Footer navigation items */}
          {FOOTER_NAV_ITEMS.map((item) => (
            <SimpleNavItem
              key={item.url}
              title={item.title}
              url={item.url}
              icon={item.icon}
              iconColor={item.iconColor}
              collapsed={collapsed}
            />
          ))}

          {/* Collapse/Expand Button - Hidden on mobile since sidebar is a Sheet overlay */}
          {!isMobile && (
            <SidebarMenuItem>
              {collapsed ? (
                <SidebarMenuButton asChild tooltip="Expand">
                  <button
                    onClick={toggleSidebar}
                    className="flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-150 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton asChild>
                  <button
                    onClick={toggleSidebar}
                    className="flex items-center gap-3 w-full px-2 py-3.5 rounded-lg transition-all duration-150 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                    <span className="text-base">Collapse</span>
                  </button>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
