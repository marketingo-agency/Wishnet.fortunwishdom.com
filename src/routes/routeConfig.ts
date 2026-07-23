/**
 * Route Configuration
 * Centralized route definitions for the application
 */

import type { LucideIcon } from 'lucide-react';
import {
  Brain,
  BrainCircuit,
  Heart,
  Bot,
  Book,
  Database,
  Orbit,
} from 'lucide-react';
import type { ToolKey } from '@/config/permissions';

export interface RouteConfig {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  toolKey?: ToolKey;
  isComingSoon?: boolean;
}

// AI Agent routes
export const AI_AGENT_ROUTES: RouteConfig[] = [
  {
    path: '/ai-agents/osha',
    title: 'Osha',
    description: 'Platform assistant, creative brainstorming partner, deep researcher, and knowledge manager.',
    icon: Bot,
    iconColor: 'text-sky-500',
    toolKey: 'ai_agents',
    isComingSoon: false,
  },
  {
    path: '/ai-agents/omni',
    title: 'Omni',
    description: 'Premium multimodal creation studio: brainstorming, multi-model image generation, video and audio tracks, and a Content hub that auto-publishes through Metricool.',
    icon: Orbit,
    iconColor: 'text-cyan-500',
    toolKey: 'ai_agents',
    isComingSoon: false,
  },
];

// MasterMind routes
// MasterMind routes - now have dedicated pages, keeping config for reference
export const MASTERMIND_ROUTES: RouteConfig[] = [
  {
    path: '/mastermind',
    title: 'The MasterMind',
    description: 'Central intelligence hub for your AI agents - manage knowledge and rules.',
    icon: Brain,
    iconColor: 'text-purple-500',
    toolKey: 'mastermind',
    isComingSoon: false, // Now has a dedicated page
  },
  {
    path: '/mastermind/brain',
    title: 'The Brain',
    description: 'Knowledge base with vector storage for AI context.',
    icon: BrainCircuit,
    iconColor: 'text-indigo-500',
    toolKey: 'mastermind',
    isComingSoon: false, // Now has a dedicated page
  },
  {
    path: '/mastermind/heart',
    title: 'The Heart',
    description: 'Rules engine for AI behavior and compliance.',
    icon: Heart,
    iconColor: 'text-rose-500',
    toolKey: 'mastermind',
    isComingSoon: false, // Now has a dedicated page
  },
  {
    path: '/mastermind/wishpedia',
    title: 'Wishpedia',
    description: 'Curated encyclopedia of the Fortun Wishdom universe.',
    icon: Book,
    iconColor: 'text-amber-500',
    toolKey: 'mastermind',
    isComingSoon: false,
  },
  {
    path: '/mastermind/vector-store',
    title: 'Vector Store',
    description: 'Monitor and manage your AI knowledge base embeddings.',
    icon: Database,
    iconColor: 'text-emerald-500',
    toolKey: 'mastermind',
    isComingSoon: false,
  },
];

// Get all coming soon routes
export const ALL_COMING_SOON_ROUTES: RouteConfig[] = [
  ...AI_AGENT_ROUTES,
  ...MASTERMIND_ROUTES,
].filter(route => route.isComingSoon);

// Helper to find route config by path
export function getRouteConfig(path: string): RouteConfig | undefined {
  return ALL_COMING_SOON_ROUTES.find(route => route.path === path);
}
