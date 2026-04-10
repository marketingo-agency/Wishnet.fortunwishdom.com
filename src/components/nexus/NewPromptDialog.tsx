'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';

interface NewPromptFormData {
  name: string;
  description: string;
  content: string;
  category: 'system' | 'template' | 'agent';
  tags: string;
}

interface NewPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NewPromptFormData) => void;
}

export const NewPromptDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: NewPromptDialogProps) => {
  const [formData, setFormData] = useState<NewPromptFormData>({
    name: '',
    description: '',
    content: '',
    category: 'template',
    tags: '',
  });

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({ name: '', description: '', content: '', category: 'template', tags: '' });
  };

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setFormData({ name: '', description: '', content: '', category: 'template', tags: '' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="new-prompt-name">Name</Label>
            <Input
              id="new-prompt-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Expert Code Reviewer"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="new-prompt-desc">Description</Label>
            <Input
              id="new-prompt-desc"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this prompt"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as 'system' | 'template' | 'agent' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="template">Template</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="new-prompt-content">Content</Label>
            <Textarea
              id="new-prompt-content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter the prompt content..."
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="new-prompt-tags">Tags (comma-separated)</Label>
            <Input
              id="new-prompt-tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="e.g., code, review, technical"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-1.5" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
