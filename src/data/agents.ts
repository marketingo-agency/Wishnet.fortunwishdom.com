/**
 * AI Agents Data
 * Single source of truth for all AI agent metadata
 */

import type { LucideIcon } from 'lucide-react';
import { 
  Settings2,
  Wand2,
  Bot,
  Headphones,
  Share2,
  Palette,
} from 'lucide-react';

export type AgentStatus = 'active' | 'inactive' | 'coming_soon';

export interface AgentMetadata {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: LucideIcon;
  color: string;           // Gradient for hero/full display
  gradient: string;        // Background gradient
  glowColor: string;       // Glow effect color
  iconColor: string;       // Icon color for sidebar/compact view
  tags: string[];
  status: AgentStatus;
  path: string;            // Route path
  model?: string;          // Associated model if active
}

export const AI_AGENTS: AgentMetadata[] = [
  {
    id: 'nexus',
    name: 'Nexus',
    role: 'LLM Control Center',
    description: 'Central hub for testing LLM provider connections and configuring all AI agent settings.',
    icon: Settings2,
    color: 'from-lime-500 to-green-600',
    gradient: 'from-lime-500/10 via-green-500/5 to-green-600/10',
    glowColor: 'bg-lime-500/30',
    iconColor: 'text-lime-500',
    tags: ['Providers', 'Configuration', 'Testing'],
    status: 'active',
    path: '/ai-agents/nexus',
    model: 'gpt-4o',
  },
  {
    id: 'promptor',
    name: 'Promptor',
    role: 'Prompt Engineer AI',
    description: 'Your prompt engineering assistant that optimizes messages and generates refined prompts from directives.',
    icon: Wand2,
    color: 'from-violet-500 to-purple-600',
    gradient: 'from-violet-500/10 via-purple-500/5 to-violet-600/10',
    glowColor: 'bg-violet-500/30',
    iconColor: 'text-violet-500',
    tags: ['Prompts', 'Optimization', 'Writing'],
    status: 'active',
    path: '/ai-agents/promptor',
    model: 'gpt-4o',
  },
  {
    id: 'osha',
    name: 'Osha',
    role: 'AI Assistant, Ideation & Research Agent',
    description: 'Platform assistant, creative brainstorming partner, deep researcher, and knowledge manager — guidance, ideation, web search, and knowledge-powered answers.',
    icon: Bot,
    color: 'from-sky-500 to-cyan-600',
    gradient: 'from-sky-500/10 via-cyan-500/5 to-sky-600/10',
    glowColor: 'bg-sky-500/30',
    iconColor: 'text-sky-500',
    tags: ['Assistant', 'Knowledge Base', 'Brainstorm', 'Ideas', 'Research', 'Web Search', 'Knowledge'],
    status: 'active',
    path: '/ai-agents/osha',
    model: 'gpt-4o',
  },
  {
    id: 'pixel',
    name: 'Pixel',
    role: 'Visual Creator AI',
    description: 'Creates AI-generated images and videos for social media posts, presentations, and more.',
    icon: Palette,
    color: 'from-pink-500 to-rose-600',
    gradient: 'from-pink-500/10 via-rose-500/5 to-pink-600/10',
    glowColor: 'bg-pink-500/30',
    iconColor: 'text-pink-500',
    tags: ['Images', 'Videos', 'Creative'],
    status: 'active',
    path: '/ai-agents/pixel',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    role: 'Community Manager AI',
    description: 'Manages social media interactions, replies to comments and messages, and schedules posts across platforms.',
    icon: Share2,
    color: 'from-pink-500 to-fuchsia-600',
    gradient: 'from-pink-500/10 via-fuchsia-500/5 to-pink-600/10',
    glowColor: 'bg-pink-500/30',
    iconColor: 'text-pink-500',
    tags: ['Social Media', 'Community', 'Posting'],
    status: 'coming_soon',
    path: '/ai-agents/pulse',
  },
  {
    id: 'echo',
    name: 'Echo',
    role: 'Customer Support AI',
    description: 'Handles customer support via Gmail, tickets, and serves as an embeddable chatbot for your website.',
    icon: Headphones,
    color: 'from-blue-500 to-indigo-600',
    gradient: 'from-blue-500/10 via-indigo-500/5 to-blue-600/10',
    glowColor: 'bg-blue-500/30',
    iconColor: 'text-blue-500',
    tags: ['Support', 'Email', 'Chatbot'],
    status: 'coming_soon',
    path: '/ai-agents/echo',
  },
];

// Helper functions
export function getAgentById(id: string): AgentMetadata | undefined {
  return AI_AGENTS.find(agent => agent.id === id);
}

export function getActiveAgents(): AgentMetadata[] {
  return AI_AGENTS.filter(agent => agent.status === 'active');
}

export function getAgentForNavigation(): { title: string; url: string; icon: LucideIcon; color: string }[] {
  return AI_AGENTS.map(agent => ({
    title: agent.name,
    url: agent.path,
    icon: agent.icon,
    color: agent.iconColor,
  }));
}
