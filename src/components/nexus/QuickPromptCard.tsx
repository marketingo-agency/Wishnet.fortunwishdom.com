'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit3, Trash2 } from 'lucide-react';
import type { QuickPrompt } from '@/hooks/useQuickPrompts';
import { getQuickPromptIcon } from './promptLibraryConstants';

interface QuickPromptCardProps {
  prompt: QuickPrompt;
  onEdit: (prompt: QuickPrompt) => void;
  onDelete: (id: string) => void;
}

export const QuickPromptCard = ({
  prompt,
  onEdit,
  onDelete,
}: QuickPromptCardProps) => {
  const Icon = getQuickPromptIcon(prompt.icon);

  return (
    <div className="p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium truncate">{prompt.label}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{prompt.prompt}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {prompt.mode}
              </Badge>
              {prompt.is_default && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Default
                </Badge>
              )}
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
              onEdit(prompt);
            }}
          >
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
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
