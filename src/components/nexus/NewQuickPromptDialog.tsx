'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iconCategories, getIconComponentByName } from './promptLibraryConstants';
import type { IconEntry } from './promptLibraryTypes';

interface NewQuickPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { label: string; prompt: string; mode: 'text' | 'image' | 'research'; icon: string }) => void;
  isPending: boolean;
}

export const NewQuickPromptDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: NewQuickPromptDialogProps) => {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [formData, setFormData] = useState({
    label: '',
    prompt: '',
    mode: 'text' as 'text' | 'image' | 'research',
    icon: 'Sparkles',
  });

  const filteredIconCategories = Object.entries(iconCategories).reduce((acc, [category, icons]) => {
    const filtered = icons.filter(icon =>
      icon.name.toLowerCase().includes(iconSearch.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, IconEntry[]>);

  const IconComponent = getIconComponentByName(formData.icon);

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({ label: '', prompt: '', mode: 'text', icon: 'Sparkles' });
  };

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setFormData({ label: '', prompt: '', mode: 'text', icon: 'Sparkles' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Quick Prompt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
              <Button
                variant="outline"
                className="w-full justify-start h-12"
                onClick={() => setIconPickerOpen(true)}
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center mr-3">
                  <IconComponent className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground">{formData.icon}</span>
              </Button>
              <DialogContent className="max-w-2xl max-h-[70vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Select Icon</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      placeholder="Search icons..."
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-6 pr-4">
                      {Object.entries(filteredIconCategories).map(([category, icons]) => (
                        <div key={category}>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">{category}</h4>
                          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                            {icons.map(({ name, icon: Icon }) => (
                              <Button
                                key={name}
                                variant={formData.icon === name ? 'default' : 'outline'}
                                size="sm"
                                className={cn(
                                  "h-10 w-10 p-0",
                                  formData.icon === name && "ring-2 ring-primary"
                                )}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, icon: name }));
                                  setIconPickerOpen(false);
                                }}
                              >
                                <Icon className="h-4 w-4" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="new-qp-label">Label</Label>
            <Input
              id="new-qp-label"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="e.g., Creative Ideas"
            />
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <Label>Mode</Label>
            <Select
              value={formData.mode}
              onValueChange={(value) => setFormData(prev => ({ ...prev, mode: value as 'text' | 'image' | 'research' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Generation</SelectItem>
                <SelectItem value="research">Deep Research</SelectItem>
                <SelectItem value="image">Image Generation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prompt Text */}
          <div className="space-y-2">
            <Label htmlFor="new-qp-prompt">Prompt</Label>
            <Textarea
              id="new-qp-prompt"
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Enter the prompt text..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            <Save className="h-4 w-4 mr-1.5" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
