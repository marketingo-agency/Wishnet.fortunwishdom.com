import { useState, useEffect } from 'react';
import { Bot, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUpdateBrainDocument } from '@/hooks/useBrainDocuments';
import { useBrainCategories } from '@/hooks/useBrainCategories';
import { AI_AGENTS } from '@/data/agents';
import type { BrainDocument } from '@/types/brain';

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: BrainDocument | null;
}

export function EditDocumentDialog({ 
  open, 
  onOpenChange, 
  document 
}: EditDocumentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [allowAllAgents, setAllowAllAgents] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const updateMutation = useUpdateBrainDocument();
  const { data: brainCategories } = useBrainCategories();

  // Initialize form when document changes
  useEffect(() => {
    if (document && open) {
      setName(document.name);
      setDescription(document.description || '');
      setCategory(document.category);
      
      const hasRestrictions = document.restricted_agents && document.restricted_agents.length > 0;
      setAllowAllAgents(!hasRestrictions);
      setSelectedAgents(hasRestrictions ? document.restricted_agents! : []);
    }
  }, [document, open]);

  const handleSubmit = async () => {
    if (!document || !name.trim()) return;

    await updateMutation.mutateAsync({
      id: document.id,
      updates: {
        name: name.trim(),
        description: description.trim() || null,
        category: category as any,
        restricted_agents: !allowAllAgents && selectedAgents.length > 0 ? selectedAgents : null,
      },
    });

    onOpenChange(false);
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Update document metadata and agent access settings.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-5 py-2">
            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Document Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for this document"
              />
            </div>

            {/* Category - Dynamic from database */}
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(brainCategories || []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this document..."
                rows={2}
              />
            </div>

            {/* Agent Access */}
            <div className="space-y-3">
              <Label>Agent Access</Label>
              
              {/* Toggle Switch in styled container */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-card shadow-sm flex items-center justify-center">
                    <Bot className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Allow access to all agents</p>
                    <p className="text-xs text-muted-foreground">Document will be available to every AI agent</p>
                  </div>
                </div>
                <Switch 
                  checked={allowAllAgents} 
                  onCheckedChange={(checked) => {
                    setAllowAllAgents(checked);
                    if (checked) setSelectedAgents([]);
                  }}
                />
              </div>

              {/* Agent Selection Grid (when not allowing all) */}
              {!allowAllAgents && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Select which agents can access this document:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AI_AGENTS.map((agent) => {
                      const Icon = agent.icon;
                      const isSelected = selectedAgents.includes(agent.id);
                      return (
                        <div
                          key={agent.id}
                          className={`relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-indigo-50 border-indigo-400 shadow-sm' 
                              : 'bg-card border-border hover:border-border hover:shadow-sm'
                          }`}
                          onClick={() => toggleAgent(agent.id)}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedAgents.length === 0 && (
                    <p className="text-xs text-amber-600">
                      Select at least one agent
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name.trim() || updateMutation.isPending || (!allowAllAgents && selectedAgents.length === 0)}
            className="bg-indigo-500 hover:bg-indigo-600"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
