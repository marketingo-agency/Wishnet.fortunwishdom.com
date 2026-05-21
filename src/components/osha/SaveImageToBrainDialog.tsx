/**
 * Save Image to Brain Dialog
 * Allows users to save Osha-generated images to the Brain knowledge base
 * with destination (General/Agent-specific), category, and name options.
 */

import { useState, useEffect } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { useBrainCategories } from '@/hooks/useBrainCategories';
import { useBrainSections } from '@/hooks/useBrainSections';
import { useOcrIndexing } from '@/hooks/useOcrIndexing';
import { AI_AGENTS } from '@/data/agents';
import type { BrainCategory as BrainCategoryEnum } from '@/types/brain';
import * as Sentry from '@sentry/nextjs';

interface SaveImageToBrainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  messageId: string;
}

export function SaveImageToBrainDialog({ open, onOpenChange, imageUrl, messageId }: SaveImageToBrainDialogProps) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useBrainCategories();
  const { data: sections = [] } = useBrainSections();
  const { mutateAsync: runOcr } = useOcrIndexing();

  const [name, setName] = useState(`Osha Image - ${format(new Date(), 'MMM d, yyyy')}`);
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState<'general' | string>('general');
  const [category, setCategory] = useState<string>('brand');
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(`Osha Image - ${format(new Date(), 'MMM d, yyyy HH:mm')}`);
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
      // 1. Fetch image as blob
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const mimeType = blob.type || 'image/png';

      // 2. Resolve target section
      let sectionId: string;
      let restrictedAgents: string[] | null = null;

      if (destination === 'general') {
        const generalSection = sections.find(s => s.type === 'general');
        if (!generalSection) throw new Error('General knowledge section not found');
        sectionId = generalSection.id;
      } else {
        // Agent-specific
        const agentSection = sections.find(s => s.agent_id === destination);
        if (!agentSection) throw new Error(`Section for agent "${destination}" not found`);
        sectionId = agentSection.id;
        restrictedAgents = [destination];
      }

      // 3. Upload to brain-documents bucket
      const timestamp = Date.now();
      const storagePath = `${destination === 'general' ? 'general' : destination}/${timestamp}_osha-image.png`;

      const { error: uploadError } = await supabase.storage
        .from('brain-documents')
        .upload(storagePath, blob, { contentType: mimeType });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 4. Insert brain_documents row
      const { data: doc, error: insertError } = await supabase
        .from('brain_documents')
        .insert({
          section_id: sectionId,
          name: name.trim(),
          original_name: `osha-image-${messageId}.png`,
          storage_path: storagePath,
          mime_type: mimeType,
          size: blob.size,
          category: category as BrainCategoryEnum,
          description: description.trim() || null,
          restricted_agents: restrictedAgents,
        })
        .select('id')
        .single();

      if (insertError) throw new Error(`Failed to create document: ${insertError.message}`);

      // 5. Trigger OCR indexing (GPT-4o Vision for images)
      toast.info('Image saved — now indexing to vector store…');

      runOcr({
        documentId: doc.id,
        storagePath,
        mimeType,
      });

      // 6. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['brain-documents'] });

      toast.success('Image saved to Brain knowledge base');
      onOpenChange(false);
    } catch (error) {
      Sentry.captureException(error instanceof Error ? error : new Error('Save to Brain error'), { extra: { context: 'Save to Brain error (Osha image)' } });
      toast.error(error instanceof Error ? error.message : 'Failed to save image');
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
            Save Image to Brain
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="brain-img-name">Name</Label>
            <Input
              id="brain-img-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Document name"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="brain-img-desc">Description (optional)</Label>
            <Textarea
              id="brain-img-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this image contain?"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</>
            ) : (
              <><BrainCircuit className="h-4 w-4 mr-1.5" />Save to Brain</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
