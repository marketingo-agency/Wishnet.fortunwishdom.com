/**
 * Route Configuration
 * Centralized route definitions for the application
 */

import type { LucideIcon } from 'lucide-react';
import {
  Brain,
  BrainCircuit,
  Heart,
  Wand2,
  Bot,
  Mic,
  Share2,

  Palette,
  Book,
  Database,
  Boxes,
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
    path: '/ai-agents/promptor',
    title: 'Promptor',
    description: 'Your prompt engineering assistant that optimizes messages and generates refined prompts from directives.',
    icon: Wand2,
    iconColor: 'text-violet-500',
    toolKey: 'ai_agents',
    isComingSoon: false,
  },
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
    path: '/ai-agents/pixel',
    title: 'Pixel',
    description: 'Creates AI-generated images and videos for social media posts, presentations, and more.',
    icon: Palette,
    iconColor: 'text-pink-500',
    toolKey: 'ai_agents',
    isComingSoon: false,
  },
  {
    path: '/ai-agents/pulse',
    title: 'Pulse',
    description: 'Plan, generate, schedule, and publish posts across platforms, then manage comments and DMs with AI replies — your social operations hub.',
    icon: Share2,
    iconColor: 'text-pink-500',
    toolKey: 'ai_agents',
    isComingSoon: false,
  },
  {
    path: '/ai-agents/whisper',
    title: 'Whisper',
    description: 'Turns a topic or your Brain/Wishpedia sources into a fully scripted, multi-voice podcast episode with ElevenLabs audio.',
    icon: Mic,
    iconColor: 'text-blue-500',
    toolKey: 'ai_agents',
    isComingSoon: false,
  },
  {
    path: '/ai-agents/omni',
    title: 'Omni',
    description: 'Premium multimodal creation studio: brainstorming, multi-model image generation, transform and upscale, and social repurposing into the Pulse Content Library.',
    icon: Orbit,
    iconColor: 'text-cyan-500',
    toolKey: 'ai_agents',
    isComingSoon: false,
  },
  {
    path: '/ai-agents/atlas',
    title: 'ATLAS',
    description: 'Structures, calculates, verifies and monitors Kickstarter operations across SKU data, factory quotes, QC, freight, 3PL, pledge manager, backer delivery and financial modeling — flagging risks, missing data, and recommended next actions for human review.',
    icon: Boxes,
    iconColor: 'text-teal-500',
    toolKey: 'ai_agents',
    isComingSoon: true,
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
