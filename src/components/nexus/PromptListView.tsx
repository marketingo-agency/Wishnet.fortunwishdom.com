'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Wand2 } from 'lucide-react';
import type { Prompt } from './promptLibraryTypes';
import { PromptCard } from './PromptCard';

interface PromptListViewProps {
  prompts: Prompt[];
  selectedPromptId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (prompt: Prompt) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onNewClick: () => void;
}

export const PromptListView = ({
  prompts,
  selectedPromptId,
  searchQuery,
  onSearchChange,
  onSelect,
  onToggleFavorite,
  onDelete,
  onNewClick,
}: PromptListViewProps) => {
  return (
    <Card className="flex-1 border-border/50 flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search prompts..."
              className="pl-9 h-9"
            />
          </div>
          <Button size="sm" className="h-9 shrink-0" onClick={onNewClick}>
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">New Prompt</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {prompts.length === 0 ? (
              <div className="text-center py-8">
                <Wand2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No prompts found</p>
              </div>
            ) : (
              prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  isSelected={selectedPromptId === prompt.id}
                  onSelect={onSelect}
                  onToggleFavorite={onToggleFavorite}
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
