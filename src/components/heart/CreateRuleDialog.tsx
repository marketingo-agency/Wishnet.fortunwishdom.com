import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Check, 
  Heart, 
  Bot, 
  MessageSquare, 
  ShieldAlert, 
  FileText, 
  Scale,
  Building2,
  Package,
  Users,
  Settings2,
  Sparkles,
  Zap,
  Target,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { AI_AGENTS } from '@/data/agents';
import { useCreateHeartRule, useUpdateHeartRule } from '@/hooks/useHeartRules';
import { useHeartCategories } from '@/hooks/useHeartCategories';
import type { HeartRule } from '@/types/brain';

// Icon mapping for dynamic categories
const ICON_MAP: Record<string, LucideIcon> = {
  Building2, Package, Users, Settings2, MessageSquare, ShieldAlert, FileText, Scale, Sparkles, Zap, Target, Lightbulb
};

function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || FileText;
}

const getCategoryColors = (colorName: string, isSelected: boolean) => {
  const colors: Record<string, { bg: string; border: string; selectedBorder: string }> = {
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', selectedBorder: 'border-violet-400' },
    red: { bg: 'bg-red-50', border: 'border-red-200', selectedBorder: 'border-red-400' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', selectedBorder: 'border-blue-400' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', selectedBorder: 'border-amber-400' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', selectedBorder: 'border-emerald-400' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', selectedBorder: 'border-rose-400' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', selectedBorder: 'border-indigo-400' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', selectedBorder: 'border-cyan-400' },
    gray: { bg: 'bg-muted/50', border: 'border-border', selectedBorder: 'border-border' },
  };
  const c = colors[colorName] || colors.gray;
  return isSelected ? `${c.bg} ${c.selectedBorder} shadow-md` : `${c.bg} ${c.border}`;
};

const getIconColor = (colorName: string): string => {
  const iconColors: Record<string, string> = {
    violet: 'text-violet-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    indigo: 'text-indigo-600',
    cyan: 'text-cyan-600',
    gray: 'text-muted-foreground',
  };
  return iconColors[colorName] || 'text-muted-foreground';
};

interface CreateRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRule?: HeartRule | null;
  defaultCategory?: string;
}

export function CreateRuleDialog({ open, onOpenChange, editRule, defaultCategory }: CreateRuleDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [ruleContent, setRuleContent] = useState('');

  const createMutation = useCreateHeartRule();
  const updateMutation = useUpdateHeartRule();
  const { data: heartCategories } = useHeartCategories();
  const isEditing = !!editRule;

  // Reset form when dialog opens/closes or editRule changes
  useEffect(() => {
    if (open && editRule) {
      setName(editRule.name);
      setDescription(editRule.description || '');
      setCategory(editRule.category);
      setIsGlobal(editRule.is_global);
      setSelectedAgents(editRule.assigned_agents || []);
      setRuleContent(editRule.rule_content);
    } else if (open && !editRule) {
      // Set default category when creating new rule - use passed defaultCategory or first from DB
      const categoryToUse = defaultCategory && defaultCategory !== 'all' 
        ? defaultCategory 
        : heartCategories?.[0]?.id;
      if (categoryToUse) {
        setCategory(categoryToUse);
      }
    } else if (!open) {
      // Reset form when closing
      setName('');
      setDescription('');
      setCategory(heartCategories?.[0]?.id || 'communication');
      setIsGlobal(true);
      setSelectedAgents([]);
      setRuleContent('');
    }
  }, [open, editRule, heartCategories, defaultCategory]);

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !ruleContent.trim()) return;

    try {
      if (isEditing && editRule) {
        await updateMutation.mutateAsync({
          id: editRule.id,
          updates: {
            name: name.trim(),
            description: description.trim() || null,
            category,
            is_global: isGlobal,
            assigned_agents: !isGlobal && selectedAgents.length > 0 ? selectedAgents : null,
            rule_content: ruleContent.trim(),
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          ruleContent: ruleContent.trim(),
          category,
          priority: 'medium', // Default priority for DB compatibility
          isGlobal,
          assignedAgents: !isGlobal && selectedAgents.length > 0 ? selectedAgents : undefined,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutations
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isValid = name.trim() && ruleContent.trim() && (isGlobal || selectedAgents.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>{isEditing ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Update the behavioral rule for your AI agents.' : 'Add a behavioral rule for your AI agents.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-5 py-4">
            {/* Rule Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Professional Tone"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Category as Selectable Cards - Dynamic from database */}
            <div className="space-y-3">
              <Label>Category</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(heartCategories || []).map((cat) => {
                  const Icon = getIconComponent(cat.icon);
                  const isSelected = category === cat.id;
                  const colorClass = getCategoryColors(cat.color, isSelected);
                  const iconColor = getIconColor(cat.color);
                  return (
                    <div
                      key={cat.id}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-sm ${colorClass}`}
                      onClick={() => setCategory(cat.id)}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <Icon className={`w-5 h-5 mb-2 ${iconColor}`} />
                      <p className="text-sm font-medium text-foreground">{cat.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cat.description || ''}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this rule does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Rule Content - Moved up */}
            <div className="space-y-2">
              <Label htmlFor="content">Rule Content *</Label>
              <Textarea
                id="content"
                placeholder="Define the rule content. For example: 'Always maintain a professional tone in all customer interactions. Avoid slang and casual language.'"
                value={ruleContent}
                onChange={(e) => setRuleContent(e.target.value)}
                rows={5}
                className="resize-none"
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
                    <p className="text-xs text-muted-foreground">Rule will be available to every AI agent</p>
                  </div>
                </div>
                <Switch checked={isGlobal} onCheckedChange={setIsGlobal} />
              </div>

              {/* Agent Selection Grid (when not allowing all) */}
              {!isGlobal && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Select which agents can access this rule:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AI_AGENTS.map((agent) => {
                      const Icon = agent.icon;
                      const isSelected = selectedAgents.includes(agent.id);
                      return (
                        <div
                          key={agent.id}
                          className={`relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-rose-50 border-rose-400 shadow-sm' 
                              : 'bg-card border-border hover:border-border hover:shadow-sm'
                          }`}
                          onClick={() => toggleAgent(agent.id)}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isLoading}
            className="bg-rose-500 hover:bg-rose-600"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
