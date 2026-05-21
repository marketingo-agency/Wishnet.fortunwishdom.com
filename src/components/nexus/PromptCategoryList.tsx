'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Prompt } from './promptLibraryTypes';
import type { QuickPrompt } from '@/hooks/useQuickPrompts';
import { modeLabels } from './promptLibraryConstants';

interface PromptCategoryListProps {
  prompts: Prompt[];
  quickPrompts: QuickPrompt[];
  activeCategory: 'all' | 'favorites' | 'agent';
  activeQuickPromptMode: 'text' | 'research' | 'image' | null;
  onCategoryChange: (category: 'all' | 'favorites' | 'agent') => void;
  onQuickPromptModeChange: (mode: 'text' | 'research' | 'image') => void;
}

export const PromptCategoryList = ({
  prompts,
  quickPrompts,
  activeCategory,
  activeQuickPromptMode,
  onCategoryChange,
  onQuickPromptModeChange,
}: PromptCategoryListProps) => {
  const isViewingQuickPrompts = activeQuickPromptMode !== null;

  return (
    <Card className="w-full lg:w-56 shrink-0 border-border/50">
      <CardHeader className="pb-3 hidden lg:block">
        <CardTitle className="text-sm font-semibold">Categories</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible scrollbar-hide">
          {(['all', 'favorites', 'agent'] as const).map((cat) => {
            const count = cat === 'all'
              ? prompts.length
              : cat === 'favorites'
              ? prompts.filter(p => p.isFavorite).length
              : prompts.filter(p => p.category === 'agent').length;

            const label = cat === 'all' ? 'All Prompts' : cat === 'favorites' ? 'Favorites' : 'Agent Specific';

            return (
              <Button
                key={cat}
                variant={activeCategory === cat && !isViewingQuickPrompts ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-between h-8 whitespace-nowrap shrink-0"
                onClick={() => onCategoryChange(cat)}
              >
                <span className="truncate text-left">{label}</span>
                <Badge variant="outline" className="text-xs h-5 px-1.5 ml-1">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        <Separator className="my-4 hidden lg:block" />

        {/* Quick Prompts Section */}
        <div className="space-y-2 lg:mt-0 mt-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 hidden lg:block">
            Quick Prompts
          </h4>
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible scrollbar-hide">
            {(['text', 'research', 'image'] as const).map((mode) => {
              const count = quickPrompts.filter(qp => qp.mode === mode).length;

              return (
                <Button
                  key={mode}
                  variant={activeQuickPromptMode === mode ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-between h-8 whitespace-nowrap shrink-0"
                  onClick={() => onQuickPromptModeChange(mode)}
                >
                  <span className="truncate text-left">{modeLabels[mode]}</span>
                  <Badge variant="outline" className="text-xs h-5 px-1.5 ml-1">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
