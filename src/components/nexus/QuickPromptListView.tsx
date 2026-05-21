'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare } from 'lucide-react';
import type { QuickPrompt } from '@/hooks/useQuickPrompts';
import { modeLabels } from './promptLibraryConstants';
import { QuickPromptCard } from './QuickPromptCard';

interface QuickPromptListViewProps {
  mode: 'text' | 'research' | 'image';
  quickPrompts: QuickPrompt[];
  isLoading: boolean;
  onEdit: (prompt: QuickPrompt) => void;
  onDelete: (id: string) => void;
  onNewClick: () => void;
}

export const QuickPromptListView = ({
  mode,
  quickPrompts,
  isLoading,
  onEdit,
  onDelete,
  onNewClick,
}: QuickPromptListViewProps) => {
  return (
    <Card className="flex-1 border-border/50 flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">
              {modeLabels[mode]} Prompts
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Edit quick prompts that appear in the console sidebar
            </p>
          </div>
          <Button size="sm" className="h-9 shrink-0" onClick={onNewClick}>
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">New Quick Prompt</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : quickPrompts.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No quick prompts in this category</p>
              </div>
            ) : (
              quickPrompts.map((prompt) => (
                <QuickPromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
