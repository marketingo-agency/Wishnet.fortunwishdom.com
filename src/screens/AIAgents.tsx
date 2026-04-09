import React from 'react';
import { Bot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentCard } from '@/components/agents/AgentCard';
import { AI_AGENTS } from '@/data/agents';

export default function AIAgents() {
  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Header */}
        <div className="border-b px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100">
              <Bot className="h-6 w-6 sm:h-7 sm:w-7 text-cyan-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">AI Agents</h1>
              <p className="text-muted-foreground text-sm">
                Meet your intelligent assistants, each specialized for different tasks
              </p>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {AI_AGENTS.map((agent) => (
                <AgentCard 
                  key={agent.id} 
                  agent={{
                    id: agent.id,
                    name: agent.name,
                    role: agent.role,
                    description: agent.description,
                    icon: agent.icon,
                    color: agent.color,
                    gradient: agent.gradient,
                    glowColor: agent.glowColor,
                    tags: agent.tags,
                    status: agent.status,
                  }} 
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
