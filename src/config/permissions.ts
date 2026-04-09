/**
 * Permissions Configuration
 * Centralized permission definitions and tool access mappings
 */

import type { LucideIcon } from 'lucide-react';
import { 
  FolderOpen, 
  Brain, 
  Bot, 
  Sparkles, 
   
  ListTodo,
  Megaphone
} from 'lucide-react';
import type { PermissionLevel } from '@/types/user';

// Re-export for convenience
export type { PermissionLevel };

export type ToolKey = 
  | 'files_manager' 
  | 'mastermind' 
  | 'ai_agents' 
  | 'wishdom' 
   
  | 'taskforce'
  | 'marketing_hub';

export interface ToolDefinition {
  key: ToolKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  iconColor: string;
  description: string;
  hasAdvancedOptions: boolean;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    key: 'files_manager',
    label: 'Files Manager',
    shortLabel: 'Files',
    icon: FolderOpen,
    iconColor: 'text-amber-500',
    description: 'Access to file storage and management',
    hasAdvancedOptions: true,
  },
  {
    key: 'mastermind',
    label: 'MasterMind',
    shortLabel: 'MasterMind',
    icon: Brain,
    iconColor: 'text-purple-500',
    description: 'AI-powered insights and automation',
    hasAdvancedOptions: true,
  },
  {
    key: 'ai_agents',
    label: 'AI Agents',
    shortLabel: 'AI Agents',
    icon: Bot,
    iconColor: 'text-cyan-500',
    description: 'Access to AI agent capabilities',
    hasAdvancedOptions: true,
  },
  {
    key: 'wishdom',
    label: 'Wishdom',
    shortLabel: 'Wishdom',
    icon: Sparkles,
    iconColor: 'text-fuchsia-500',
    description: 'Collectibles and inventory management',
    hasAdvancedOptions: true,
  },
  {
    key: 'taskforce',
    label: 'Taskforce',
    shortLabel: 'Tasks',
    icon: ListTodo,
    iconColor: 'text-orange-500',
    description: 'Task and project management',
    hasAdvancedOptions: true,
  },
  {
    key: 'marketing_hub',
    label: 'Marketing Hub',
    shortLabel: 'Marketing',
    icon: Megaphone,
    iconColor: 'text-rose-500',
    description: 'Marketing planning and operations',
    hasAdvancedOptions: true,
  },
];

// Get tool definition by key
export function getToolDefinition(key: ToolKey): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find(t => t.key === key);
}

// Get tool icon component
export function getToolIcon(key: ToolKey): LucideIcon {
  const tool = getToolDefinition(key);
  return tool?.icon ?? FolderOpen;
}

// Permission level labels
export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: 'No Access',
  view: 'View Only',
  limited: 'Limited',
  full: 'Full Access',
};

// Permission level descriptions
export const PERMISSION_LEVEL_DESCRIPTIONS: Record<PermissionLevel, string> = {
  none: 'No access to this tool',
  view: 'Can view but not modify',
  limited: 'Restricted access with specific permissions',
  full: 'Complete access to all features',
};
