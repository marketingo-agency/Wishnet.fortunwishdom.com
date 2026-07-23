/**
 * AI Agents Data
 * Single source of truth for all AI agent metadata
 */

import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Orbit,
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
    id: 'omni',
    name: 'Omni',
    role: 'Multimodal Creation AI',
    description: 'Premium multimodal creation studio: brainstorm ideas, generate images across every fal.ai model, transform and upscale, repurpose for social networks, and a Content hub that auto-publishes approved posts through Metricool.',
    icon: Orbit,
    color: 'from-cyan-500 to-violet-600',
    gradient: 'from-cyan-500/10 via-blue-500/5 to-violet-600/10',
    glowColor: 'bg-cyan-500/30',
    iconColor: 'text-cyan-500',
    tags: ['Images', 'Audio', 'Video', 'Creative', 'Repurposing'],
    status: 'active',
    path: '/ai-agents/omni',
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
