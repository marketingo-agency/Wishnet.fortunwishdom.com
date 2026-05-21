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
  DoorOpen,
  Rabbit,
  PersonStanding,
  Spade,
  Package,
  ClipboardList,
  Cog,
  ListTodo,
  Nfc,
  Database,
  Boxes,
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
    description: 'Manages social media interactions, replies to comments and messages, and schedules posts across platforms.',
    icon: Share2,
    iconColor: 'text-pink-500',
    toolKey: 'ai_agents',
    isComingSoon: true,
  },
  {
    path: '/ai-agents/whisper',
    title: 'Whisper',
    description: 'Generates podcast scripts with AI, then turns them into studio-quality audio narration using the ElevenLabs API.',
    icon: Mic,
    iconColor: 'text-blue-500',
    toolKey: 'ai_agents',
    isComingSoon: true,
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

// Marketing Hub routes
export const MARKETING_ROUTES: RouteConfig[] = [
  {
    path: '/marketing/plan',
    title: 'Marketing Plan',
    description: 'Strategic marketing planning and campaign management tools.',
    icon: ClipboardList,
    iconColor: 'text-violet-500',
    toolKey: 'marketing_hub',
    isComingSoon: true,
  },
  {
    path: '/marketing/operations',
    title: 'Marketing Operations',
    description: 'Day-to-day marketing operations, workflows, and automation.',
    icon: Cog,
    iconColor: 'text-slate-500',
    toolKey: 'marketing_hub',
    isComingSoon: true,
  },
];

// Wishdom routes
export const WISHDOM_ROUTES: RouteConfig[] = [
  {
    path: '/wishdom',
    title: 'The Wishdom',
    description: 'Welcome to the magical world of collectibles and treasures.',
    icon: DoorOpen,
    iconColor: 'text-fuchsia-500',
    toolKey: 'wishdom',
    isComingSoon: true,
  },
  {
    path: '/wishdom/plushes',
    title: 'Plushes',
    description: 'Explore our collection of soft, cuddly plush toys and companions.',
    icon: Rabbit,
    iconColor: 'text-rose-400',
    toolKey: 'wishdom',
    isComingSoon: true,
  },
  {
    path: '/wishdom/figurines',
    title: 'Figurines',
    description: 'Discover detailed collectible figurines and display pieces.',
    icon: PersonStanding,
    iconColor: 'text-amber-500',
    toolKey: 'wishdom',
    isComingSoon: true,
  },
  {
    path: '/wishdom/cards',
    title: 'Cards',
    description: 'Browse and manage your trading card game collection.',
    icon: Spade,
    iconColor: 'text-sky-500',
    toolKey: 'wishdom',
    isComingSoon: true,
  },
  {
    path: '/wishdom/nfc-tags',
    title: 'NFC Tags',
    description: 'Manage cryptographic NFC codes for product authentication and verification.',
    icon: Nfc,
    iconColor: 'text-cyan-500',
    toolKey: 'wishdom',
    isComingSoon: true,
  },
  {
    path: '/wishdom/stock',
    title: 'Stocks',
    description: 'Track inventory levels and manage stock across all product categories.',
    icon: Package,
    iconColor: 'text-slate-500',
    toolKey: 'wishdom',
    isComingSoon: true,
  },
];

// Other routes
export const OTHER_ROUTES: RouteConfig[] = [
  {
    path: '/taskforce',
    title: 'Taskforce',
    description: 'Manage tasks and collaborate with your team.',
    icon: ListTodo,
    iconColor: 'text-orange-500',
    toolKey: 'taskforce',
    isComingSoon: true,
  },
];

// Get all coming soon routes
export const ALL_COMING_SOON_ROUTES: RouteConfig[] = [
  ...AI_AGENT_ROUTES,
  ...MASTERMIND_ROUTES,
  ...MARKETING_ROUTES,
  ...WISHDOM_ROUTES,
  
  ...OTHER_ROUTES,
].filter(route => route.isComingSoon);

// Helper to find route config by path
export function getRouteConfig(path: string): RouteConfig | undefined {
  return ALL_COMING_SOON_ROUTES.find(route => route.path === path);
}
