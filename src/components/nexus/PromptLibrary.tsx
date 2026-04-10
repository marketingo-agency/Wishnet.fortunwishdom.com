'use client';

import React, { useState } from 'react';
import { useQuickPrompts, useDeleteQuickPrompt, useCreateQuickPrompt } from '@/hooks/useQuickPrompts';
import { toast } from '@/hooks/use-toast';
import type { Prompt, PromptLibraryProps } from './promptLibraryTypes';
import { mockPrompts } from './promptLibraryConstants';
import { PromptCategoryList } from './PromptCategoryList';
import { PromptListView } from './PromptListView';
import { QuickPromptListView } from './QuickPromptListView';
import { NewQuickPromptDialog } from './NewQuickPromptDialog';
import { NewPromptDialog } from './NewPromptDialog';

export const PromptLibrary = ({ onSelectPrompt, onSelectQuickPrompt, selectedPromptId }: PromptLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'favorites' | 'agent'>('all');
  const [activeQuickPromptMode, setActiveQuickPromptMode] = useState<'text' | 'research' | 'image' | null>(null);
  const [prompts, setPrompts] = useState(mockPrompts);
  const [showNewQuickPromptDialog, setShowNewQuickPromptDialog] = useState(false);
  const [showNewPromptDialog, setShowNewPromptDialog] = useState(false);

  const { data: quickPrompts = [], isLoading: quickPromptsLoading } = useQuickPrompts();
  const deleteQuickPrompt = useDeleteQuickPrompt();
  const createQuickPrompt = useCreateQuickPrompt();

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeCategory === 'all') return matchesSearch;
    if (activeCategory === 'favorites') return matchesSearch && prompt.isFavorite;
    if (activeCategory === 'agent') return matchesSearch && prompt.category === 'agent';
    return matchesSearch;
  });

  const filteredQuickPrompts = quickPrompts.filter(qp => qp.mode === activeQuickPromptMode);

  const toggleFavorite = (id: string) => {
    setPrompts(prev => prev.map(p =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const handleDeletePrompt = (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      setPrompts(prev => prev.filter(p => p.id !== id));
      if (selectedPromptId === id) {
        onSelectPrompt(null!);
      }
    }
  };

  const handleDeleteQuickPrompt = async (id: string) => {
    if (confirm('Are you sure you want to delete this quick prompt?')) {
      await deleteQuickPrompt.mutateAsync(id);
    }
  };

  const handleCreateQuickPrompt = async (data: { label: string; prompt: string; mode: 'text' | 'image' | 'research'; icon: string }) => {
    if (!data.label.trim() || !data.prompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Label and prompt text are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createQuickPrompt.mutateAsync(data);
      toast({
        title: 'Quick prompt created',
        description: 'Your new quick prompt has been added.',
      });
      setShowNewQuickPromptDialog(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create quick prompt.',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePrompt = (data: { name: string; description: string; content: string; category: 'system' | 'template' | 'agent'; tags: string }) => {
    if (!data.name.trim() || !data.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and content are required.',
        variant: 'destructive',
      });
      return;
    }

    const tagsArray = data.tags.split(',').map(t => t.trim()).filter(Boolean);

    const createdPrompt: Prompt = {
      id: `${Date.now()}`,
      name: data.name,
      description: data.description,
      category: data.category,
      content: data.content,
      agentIds: [],
      isFavorite: false,
      tags: tagsArray,
    };

    setPrompts(prev => [...prev, createdPrompt]);
    toast({
      title: 'Prompt created',
      description: 'Your new prompt has been added.',
    });
    setShowNewPromptDialog(false);
  };

  const handleCategoryChange = (category: 'all' | 'favorites' | 'agent') => {
    setActiveCategory(category);
    setActiveQuickPromptMode(null);
  };

  const handleQuickPromptModeChange = (mode: 'text' | 'research' | 'image') => {
    setActiveQuickPromptMode(mode);
    setActiveCategory('all');
  };

  const isViewingQuickPrompts = activeQuickPromptMode !== null;

  return (
    <div className="flex flex-col lg:flex-row h-full gap-3 lg:gap-4">
      <PromptCategoryList
        prompts={prompts}
        quickPrompts={quickPrompts}
        activeCategory={activeCategory}
        activeQuickPromptMode={activeQuickPromptMode}
        onCategoryChange={handleCategoryChange}
        onQuickPromptModeChange={handleQuickPromptModeChange}
      />

      {isViewingQuickPrompts ? (
        <QuickPromptListView
          mode={activeQuickPromptMode!}
          quickPrompts={filteredQuickPrompts}
          isLoading={quickPromptsLoading}
          onEdit={(p) => onSelectQuickPrompt(p)}
          onDelete={handleDeleteQuickPrompt}
          onNewClick={() => setShowNewQuickPromptDialog(true)}
        />
      ) : (
        <PromptListView
          prompts={filteredPrompts}
          selectedPromptId={selectedPromptId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={onSelectPrompt}
          onToggleFavorite={toggleFavorite}
          onDelete={handleDeletePrompt}
          onNewClick={() => setShowNewPromptDialog(true)}
        />
      )}

      <NewQuickPromptDialog
        open={showNewQuickPromptDialog}
        onOpenChange={setShowNewQuickPromptDialog}
        onSubmit={handleCreateQuickPrompt}
        isPending={createQuickPrompt.isPending}
      />

      <NewPromptDialog
        open={showNewPromptDialog}
        onOpenChange={setShowNewPromptDialog}
        onSubmit={handleCreatePrompt}
      />
    </div>
  );
};

export type { Prompt };
