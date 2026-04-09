/**
 * Navigation Configuration
 * Centralized navigation structure derived from route configs where possible.
 */

import type { LucideIcon } from 'lucide-react';
import { 
  LayoutDashboard,
  Bot,
  Megaphone,
  Sparkles,
  Settings,
  Newspaper,
  Settings2,
  FolderOpen,
  ListTodo,
  Brain,
} from 'lucide-react';
import type { ToolKey } from '@/config/permissions';
import {
  AI_AGENT_ROUTES,
  MASTERMIND_ROUTES,
  MARKETING_ROUTES,
  WISHDOM_ROUTES,
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
    defaultUrl: '/ai-agents',
    items: [
      { title: 'All AI Agents', url: '/ai-agents', icon: Bot, iconColor: 'text-cyan-500', end: true },
      // Nexus is nav-only (not in AI_AGENT_ROUTES which are agent-specific pages)
      { title: 'Nexus', url: '/ai-agents/nexus', icon: Settings2, iconColor: 'text-lime-500' },
      ...AI_AGENT_ROUTES.map(r => routeToNav(r)),
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing Hub',
    icon: Megaphone,
    iconColor: 'text-rose-500',
    toolKey: 'marketing_hub',
    defaultUrl: '/marketing/plan',
    items: routesToNavItems(MARKETING_ROUTES, false),
  },
  {
    id: 'wishdom',
    title: 'Fortun Wishdom',
    icon: Sparkles,
    iconColor: 'text-fuchsia-500',
    toolKey: 'wishdom',
    defaultUrl: '/wishdom',
    items: routesToNavItems(WISHDOM_ROUTES),
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
    item: { title: 'Taskforce', url: '/taskforce', icon: ListTodo, iconColor: 'text-orange-500' },
    toolKey: 'taskforce',
  },
  {
    item: { title: 'Files Manager', url: '/files', icon: FolderOpen, iconColor: 'text-amber-500' },
    toolKey: 'files_manager',
  },
];

// Check if a path is within a section
export function isPathInSection(pathname: string, sectionId: string): boolean {
  const section = NAV_SECTIONS.find(s => s.id === sectionId);
  if (!section) return false;
  return section.items.some(item => pathname.startsWith(item.url.split('/').slice(0, 2).join('/')));
}
