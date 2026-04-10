import type React from 'react';
import type { QuickPrompt } from '@/hooks/useQuickPrompts';

export interface Prompt {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'template' | 'agent';
  content: string;
  agentIds: string[];
  isFavorite: boolean;
  tags: string[];
}

export interface PromptLibraryProps {
  onSelectPrompt: (prompt: Prompt) => void;
  onSelectQuickPrompt: (prompt: QuickPrompt | null) => void;
  selectedPromptId: string | null;
}

export interface IconEntry {
  name: string;
  icon: React.ElementType;
}
