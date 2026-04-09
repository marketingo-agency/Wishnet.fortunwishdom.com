/**
 * Save Text to Brain Dialog
 * Allows users to save Osha text responses to the Brain knowledge base as cleaned PDFs
 * with destination (General/Agent-specific), category, and name options.
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { edgeFunctionUrl } from '@/lib/apiHelpers';
import { useQueryClient } from '@tanstack/react-query';
import { useBrainCategories } from '@/hooks/useBrainCategories';
import { AI_AGENTS } from '@/data/agents';

interface SaveTextToBrainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  messageId: string;
}

export function SaveTextToBrainDialog({ open, onOpenChange, content, messageId }: SaveTextToBrainDialogProps) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useBrainCategories();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState<'general' | string>('general');
  const [category, setCategory] = useState<string>('brand');
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(`Osha Response - ${format(new Date(), 'MMM d, yyyy HH:mm')}`);
      setDescription('');
      setDestination('general');
      setCategory(categories.length > 0 ? categories[0].id : 'brand');
    }
  }, [open, categories]);

  const activeAgents = AI_AGENTS.filter(a => a.status === 'active');

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        edgeFunctionUrl('osha-chat'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'save-to-brain',
            title: name.trim(),
            content,
            category,
            destination,
            description: description.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save' }));
        throw new Error(err.error || 'Failed to save to Brain');
      }

      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ['brain-documents'] });
      const savedName = result.fileName || 'document';
      toast.success(`Saved as "${savedName}" to Brain`);
      onOpenChange(false);
    } catch (error) {
      console.error('Save to Brain error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-teal-500" />
            Save to Brain as PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="brain-text-name">Name</Label>
            <Input
              id="brain-text-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Document name"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="brain-text-desc">Description (optional)</Label>
            <Textarea
              id="brain-text-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this content about?"
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label>Destination</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Knowledge</SelectItem>
                {activeAgents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name} — {agent.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.filter(c => c.is_active).map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Content will be cleaned by AI to remove metadata tags, then saved as a PDF document.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Cleaning & saving…</>
            ) : (
              <><BrainCircuit className="h-4 w-4 mr-1.5" />Save to Brain</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
