import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sparkles, Bot, Wand2 } from 'lucide-react';

export type NexusTab = 'console' | 'agents' | 'prompts';

interface NexusTabsProps {
  activeTab: NexusTab;
  onTabChange: (tab: NexusTab) => void;
}

const tabOptions: { value: NexusTab; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'console', label: 'Console', icon: Sparkles, color: 'text-purple-600' },
  { value: 'agents', label: 'Agents', icon: Bot, color: 'text-emerald-600' },
  { value: 'prompts', label: 'Prompts', icon: Wand2, color: 'text-amber-600' },
];

export function NexusTabs({ activeTab, onTabChange }: NexusTabsProps) {
  return (
    <div className="px-3 sm:px-6 py-3 border-b border-border bg-muted/30">
      <ToggleGroup
        type="single"
        value={activeTab}
        onValueChange={(value) => value && onTabChange(value as NexusTab)}
        className="justify-start gap-1 sm:gap-2"
      >
        {tabOptions.map((option) => {
          const Icon = option.icon;
          const isActive = activeTab === option.value;
          
          return (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={`px-3 sm:px-4 py-2 h-9 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-background shadow-sm border border-border text-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-background/50'
              }`}
            >
              <Icon className={`h-4 w-4 mr-1.5 sm:mr-2 ${isActive ? option.color : ''}`} />
              <span className="text-xs sm:text-sm">{option.label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
