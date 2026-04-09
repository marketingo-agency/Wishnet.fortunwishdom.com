import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X,
  Save,
  Lightbulb,
  FileText,
  Code,
  Sparkles,
  Mountain,
  Palette,
  TrendingUp,
  Users,
  Cpu,
  MessageSquare,
  Wand2,
  Bot,
  Star,
  Search,
  Globe,
  Mail,
  Send,
  BookOpen,
  Newspaper,
  Brush,
  Camera,
  Video,
  Music,
  Heart,
  Zap,
  Target,
  Flag,
  Award,
  Gift,
  ShoppingCart,
  DollarSign,
  BarChart,
  PieChart,
  Activity,
  Layers,
  Grid,
  List,
  Calendar,
  Clock,
  Bell,
  Settings,
  Wrench,
  Key,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Info,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickPrompt, useUpdateQuickPrompt } from '@/hooks/useQuickPrompts';
import { toast } from '@/hooks/use-toast';

interface QuickPromptEditorProps {
  prompt: QuickPrompt;
  onClose: () => void;
}

// Icon gallery organized by category
const iconCategories = {
  'Communication': [
    { name: 'MessageSquare', icon: MessageSquare },
    { name: 'Mail', icon: Mail },
    { name: 'Send', icon: Send },
    { name: 'Bell', icon: Bell },
  ],
  'Content': [
    { name: 'FileText', icon: FileText },
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Newspaper', icon: Newspaper },
    { name: 'List', icon: List },
  ],
  'Creative': [
    { name: 'Palette', icon: Palette },
    { name: 'Brush', icon: Brush },
    { name: 'Sparkles', icon: Sparkles },
    { name: 'Wand2', icon: Wand2 },
    { name: 'Lightbulb', icon: Lightbulb },
    { name: 'Star', icon: Star },
  ],
  'Media': [
    { name: 'Camera', icon: Camera },
    { name: 'Video', icon: Video },
    { name: 'Music', icon: Music },
    { name: 'Mountain', icon: Mountain },
  ],
  'Analytics': [
    { name: 'TrendingUp', icon: TrendingUp },
    { name: 'BarChart', icon: BarChart },
    { name: 'PieChart', icon: PieChart },
    { name: 'Activity', icon: Activity },
  ],
  'Technology': [
    { name: 'Code', icon: Code },
    { name: 'Cpu', icon: Cpu },
    { name: 'Bot', icon: Bot },
    { name: 'Globe', icon: Globe },
    { name: 'Layers', icon: Layers },
    { name: 'Grid', icon: Grid },
  ],
  'Actions': [
    { name: 'Zap', icon: Zap },
    { name: 'Target', icon: Target },
    { name: 'Flag', icon: Flag },
    { name: 'Award', icon: Award },
    { name: 'Check', icon: Check },
  ],
  'Business': [
    { name: 'Users', icon: Users },
    { name: 'ShoppingCart', icon: ShoppingCart },
    { name: 'DollarSign', icon: DollarSign },
    { name: 'Gift', icon: Gift },
    { name: 'Heart', icon: Heart },
  ],
  'Utility': [
    { name: 'Settings', icon: Settings },
    { name: 'Wrench', icon: Wrench },
    { name: 'Calendar', icon: Calendar },
    { name: 'Clock', icon: Clock },
    { name: 'Search', icon: Search },
  ],
  'Security': [
    { name: 'Key', icon: Key },
    { name: 'Lock', icon: Lock },
    { name: 'Shield', icon: Shield },
    { name: 'Eye', icon: Eye },
    { name: 'EyeOff', icon: EyeOff },
  ],
  'Feedback': [
    { name: 'AlertCircle', icon: AlertCircle },
    { name: 'Info', icon: Info },
    { name: 'HelpCircle', icon: HelpCircle },
  ],
};

// Flatten for lookup
const allIcons = Object.values(iconCategories).flat();

function getIconComponent(iconName: string): React.ElementType {
  const found = allIcons.find(i => i.name === iconName);
  return found?.icon || Sparkles;
}

export function QuickPromptEditor({ prompt, onClose }: QuickPromptEditorProps) {
  const [label, setLabel] = useState(prompt.label);
  const [promptText, setPromptText] = useState(prompt.prompt);
  const [mode, setMode] = useState<'text' | 'image' | 'research'>(prompt.mode);
  const [selectedIcon, setSelectedIcon] = useState(prompt.icon);
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  
  const updateQuickPrompt = useUpdateQuickPrompt();
  
  const SelectedIconComponent = getIconComponent(selectedIcon);

  const handleSave = async () => {
    try {
      await updateQuickPrompt.mutateAsync({
        id: prompt.id,
        updates: {
          label,
          prompt: promptText,
          mode,
          icon: selectedIcon,
        },
      });
      toast({
        title: 'Quick prompt updated',
        description: 'Your changes have been saved.',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update quick prompt.',
        variant: 'destructive',
      });
    }
  };

  const filteredIconCategories = Object.entries(iconCategories).reduce((acc, [category, icons]) => {
    const filtered = icons.filter(icon => 
      icon.name.toLowerCase().includes(iconSearch.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, typeof allIcons>);

  return (
    <Card className="h-full border-border/50 flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Edit Quick Prompt</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-auto min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-6">
            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <Dialog open={iconDialogOpen} onOpenChange={setIconDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start h-12">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center mr-3">
                      <SelectedIconComponent className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground">{selectedIcon}</span>
                  </Button>
                </DialogTrigger>
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
                                  variant={selectedIcon === name ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn(
                                    "h-10 w-10 p-0",
                                    selectedIcon === name && "ring-2 ring-primary"
                                  )}
                                  onClick={() => {
                                    setSelectedIcon(name);
                                    setIconDialogOpen(false);
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
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Enter a label for this prompt"
              />
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as 'text' | 'image' | 'research')}>
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
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Enter the prompt text..."
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This is the text that will be inserted when the user clicks this quick prompt.
              </p>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <SelectedIconComponent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">{label || 'Untitled'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateQuickPrompt.isPending} className="flex-1">
                <Save className="h-4 w-4 mr-1.5" />
                Save
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
