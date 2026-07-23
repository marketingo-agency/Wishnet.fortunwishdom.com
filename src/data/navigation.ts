/**
 * Navigation Configuration
 * Centralized navigation structure derived from route configs where possible.
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Bot,
  Settings,
  Newspaper,
  FolderOpen,
  Brain,
} from 'lucide-react';
import type { ToolKey } from '@/config/permissions';
import {
  AI_AGENT_ROUTES,
  MASTERMIND_ROUTES,
  type RouteConfig,
} from '@/routes/routeConfig';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  iconColor: string;
  end?: boolean; // For exact matching in NavLink
}

export interface NavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  iconColor: string;
  toolKey: ToolKey;
  items: NavItem[];
  defaultUrl: string;
}

/** Convert a RouteConfig to a NavItem, with optional overrides. */
function routeToNav(route: RouteConfig, overrides?: Partial<NavItem>): NavItem {
  return {
    title: route.title,
    url: route.path,
    icon: route.icon,
    iconColor: route.iconColor,
    ...overrides,
  };
}

/** Convert an array of RouteConfigs to NavItems. First item gets `end: true` by default. */
function routesToNavItems(routes: RouteConfig[], firstEnd = true): NavItem[] {
  return routes.map((r, i) => routeToNav(r, i === 0 && firstEnd ? { end: true } : undefined));
}

// Single nav items (no subitems)
export const SINGLE_NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    iconColor: 'text-[#46B4E8]',
  },
];

// Collapsible sections — derived from route configs
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'mastermind',
    title: 'Fortun MasterMind',
    icon: Brain,
    iconColor: 'text-purple-500',
    toolKey: 'mastermind',
    defaultUrl: '/mastermind',
    items: routesToNavItems(MASTERMIND_ROUTES),
  },
  {
    id: 'ai_agents',
    title: 'AI Agents',
    icon: Bot,
    iconColor: 'text-cyan-500',
    toolKey: 'ai_agents',
    // The listing page is gone: the menu goes straight to Osha and Omni.
    defaultUrl: '/ai-agents/osha',
    items: AI_AGENT_ROUTES.map(r => routeToNav(r)),
  },
];

// Footer nav items
export const FOOTER_NAV_ITEMS: NavItem[] = [
  { title: 'Settings', url: '/settings', icon: Settings, iconColor: 'text-gray-900' },
  { title: 'Release Notes', url: '/release-notes', icon: Newspaper, iconColor: 'text-indigo-500' },
];

// Simple items that need tool access check
export const TOOL_NAV_ITEMS: { item: NavItem; toolKey: ToolKey }[] = [
  {
    item: { title: 'Files Manager', url: '/files', icon: FolderOpen, iconColor: 'text-amber-500' },
    toolKey: 'files_manager',
  },
];
