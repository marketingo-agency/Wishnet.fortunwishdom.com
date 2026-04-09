import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AI_AGENTS } from '@/data/agents';
import { Bot } from 'lucide-react';

interface AgentAccessSelectorProps {
  value: string[];
  onChange: (agents: string[]) => void;
  disabled?: boolean;
}

export function AgentAccessSelector({ value, onChange, disabled }: AgentAccessSelectorProps) {
  const toggleAgent = (agentId: string) => {
    onChange(
      value.includes(agentId)
        ? value.filter(id => id !== agentId)
        : [...value, agentId]
    );
  };

  const selectedCount = value.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          disabled={disabled}
        >
          <Bot className="w-4 h-4 mr-2" />
          {selectedCount === 0 
            ? 'All agents have access' 
            : `${selectedCount} agent${selectedCount > 1 ? 's' : ''} selected`
          }
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <ScrollArea className="h-64">
          <div className="space-y-1">
            {AI_AGENTS.map((agent) => {
              const Icon = agent.icon;
              const isSelected = value.includes(agent.id);
              return (
                <div
                  key={agent.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleAgent(agent.id)}
                >
                  <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
