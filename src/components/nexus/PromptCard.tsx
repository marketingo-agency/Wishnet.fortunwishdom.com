'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, StarOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Prompt } from './promptLibraryTypes';
import { categoryIcons, categoryLabels } from './promptLibraryConstants';

interface PromptCardProps {
  prompt: Prompt;
  isSelected: boolean;
  onSelect: (prompt: Prompt) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export const PromptCard = ({
  prompt,
  isSelected,
  onSelect,
  onToggleFavorite,
  onDelete,
}: PromptCardProps) => {
  const Icon = categoryIcons[prompt.category];

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border/50 cursor-pointer transition-all hover:bg-muted/50",
        isSelected && "ring-2 ring-primary bg-muted/50"
      )}
      onClick={() => onSelect(prompt)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium truncate">{prompt.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{prompt.description}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {categoryLabels[prompt.category]}
              </Badge>
              {prompt.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(prompt.id);
            }}
          >
            {prompt.isFavorite ? (
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            ) : (
              <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(prompt.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
