import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_AGENTS, type AgentMetadata } from '@/data/agents';
import { useAllAgentSettings } from '@/hooks/useAgentSettings';
import { AGENT_GRADIENTS, AGENT_GRADIENT_FALLBACK } from './agentGradients';

interface AgentConfigGridProps {
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export function AgentConfigGrid({ selectedAgentId, onSelectAgent }: AgentConfigGridProps) {
  const { data: dbSettings } = useAllAgentSettings();

  /** Resolve the effective status, merging live DB is_active with static status */
  const resolveStatus = (agent: AgentMetadata): AgentMetadata['status'] => {
    // coming_soon agents are always unclickable regardless of DB
    if (agent.status === 'coming_soon') return 'coming_soon';
    // Find DB row if it exists
    const dbRow = dbSettings?.find(r => r.agent_id === agent.id);
    if (dbRow) return dbRow.is_active ? 'active' : 'inactive';
    return agent.status;
  };

  const getStatusBadge = (status: AgentMetadata['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
            Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary" className="text-xs">
            Inactive
          </Badge>
        );
      case 'coming_soon':
        return (
          <Badge variant="outline" className="text-muted-foreground text-xs bg-muted/50">
            Coming Soon
          </Badge>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {AI_AGENTS.map((agent) => {
        const Icon = agent.icon;
        const isSelected = selectedAgentId === agent.id;
        const effectiveStatus = resolveStatus(agent);
        const dbRow = dbSettings?.find(r => r.agent_id === agent.id);
        const liveModel = dbRow?.model || agent.model;
        const isComingSoon = effectiveStatus === 'coming_soon';
        const isInactive = effectiveStatus === 'inactive';

        return (
          <Card
            key={agent.id}
            className={cn(
              'transition-all border-border/50',
              isComingSoon
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer hover:shadow-md',
              isInactive && !isComingSoon && 'opacity-70',
              isSelected && !isComingSoon && 'ring-2 ring-primary ring-offset-2',
            )}
            onClick={() => {
              if (!isComingSoon) onSelectAgent(agent.id);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                      isComingSoon && 'grayscale opacity-50',
                    )}
                    style={{ background: AGENT_GRADIENTS[agent.id] ?? AGENT_GRADIENT_FALLBACK }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className={cn(
                      'font-semibold text-sm',
                      isComingSoon && 'text-muted-foreground',
                    )}>
                      {agent.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{agent.role}</p>
                    {liveModel && !isComingSoon && (
                      <Badge variant="outline" className="mt-1.5 text-xs px-1.5 py-0">
                        {liveModel}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(effectiveStatus)}
                  {!isComingSoon && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- re-exporting config data alongside component for backwards compatibility
export { AI_AGENTS as agents };
export type { AgentMetadata as Agent };
