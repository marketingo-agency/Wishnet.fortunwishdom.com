"use client";

import React from 'react';
import Link from 'next/link';
import { LucideIcon, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgentStatus } from '@/data/agents';
import { useAgentSettings } from '@/hooks/useAgentSettings';

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  glowColor: string;
  tags: string[];
  status?: AgentStatus;
}

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const Icon = agent.icon;
  const isComingSoon = agent.status === 'coming_soon';

  // Only query DB for agents that are not "coming_soon"
  const { data: dbSettings } = useAgentSettings(isComingSoon ? null : agent.id);

  // Effective active state: DB overrides static status for launched agents
  const isInactive = !isComingSoon && dbSettings !== undefined && dbSettings !== null && !dbSettings.is_active;

  return (
    <Link href={`/ai-agents/${agent.id}`} className="relative block">
      <Card className={`group relative overflow-hidden border-0 bg-gradient-to-br ${agent.gradient} hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] cursor-pointer`}>
        {/* Decorative glow */}
        <div className={`absolute -top-10 -right-10 w-40 h-40 ${agent.glowColor} rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity`} />
        <div className={`absolute -bottom-10 -left-10 w-32 h-32 ${agent.glowColor} rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity`} />

        {/* Animated border gradient on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className={`absolute inset-0 bg-gradient-to-r ${agent.gradient} opacity-20`} />
        </div>

        <CardContent className="relative z-10 p-4 sm:p-6 text-center">
          {/* Icon */}
          <div
            className={`mx-auto mb-2 sm:mb-4 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
            style={{ boxShadow: `0 10px 40px -10px ${agent.glowColor.replace('bg-', 'var(--')}` }}
          >
            <Icon className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white" strokeWidth={1.5} />
          </div>

          {/* Name */}
          <h3 className={`text-base sm:text-xl font-bold uppercase tracking-wide bg-gradient-to-r ${agent.color} bg-clip-text text-transparent`}>
            {agent.name}
          </h3>

          {/* Role */}
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            {agent.role}
          </p>

          {/* Description */}
          <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2 sm:line-clamp-none">
            {agent.description}
          </p>

          {/* Status */}
          <div className="mt-3 sm:mt-5">
            {isInactive ? (
              <Badge className="bg-card/80 text-muted-foreground border-0 gap-1.5">
                <Lock className="h-3 w-3" />
                Inactive
              </Badge>
            ) : agent.status === 'active' ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Active
              </Badge>
            ) : isComingSoon ? (
              <Badge className="bg-card/80 text-muted-foreground hover:bg-card border-0 shadow-sm">
                <span className="animate-pulse mr-1.5 text-cyan-500">●</span>
                Coming Soon
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Active
              </Badge>
            )}
          </div>
        </CardContent>

        {/* Inactive dim overlay */}
        {isInactive && (
          <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 rounded-inherit">
            <Lock className="h-7 w-7 text-foreground/60" />
            <p className="text-xs font-medium text-foreground/70 text-center px-4">
              Inactive — activate from Nexus
            </p>
          </div>
        )}
      </Card>
    </Link>
  );
}
