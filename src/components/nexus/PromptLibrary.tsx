import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Star, 
  StarOff,
  Wand2,
  FileText,
  Bot,
  MessageSquare,
  Lightbulb,
  Code,
  Sparkles,
  Mountain,
  Palette,
  TrendingUp,
  Users,
  Cpu,
  Edit3,
  Trash2,
  Save,
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
import { useQuickPrompts, QuickPrompt, useDeleteQuickPrompt, useCreateQuickPrompt } from '@/hooks/useQuickPrompts';
import { toast } from '@/hooks/use-toast';

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

function getIconComponentByName(iconName: string): React.ElementType {
  const found = allIcons.find(i => i.name === iconName);
  return found?.icon || Sparkles;
}

interface Prompt {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'template' | 'agent';
  content: string;
  agentIds: string[];
  isFavorite: boolean;
  tags: string[];
}

interface PromptLibraryProps {
  onSelectPrompt: (prompt: Prompt) => void;
  onSelectQuickPrompt: (prompt: QuickPrompt | null) => void;
  selectedPromptId: string | null;
}

const mockPrompts: Prompt[] = [
  {
    id: '1',
    name: 'Helpful Assistant',
    description: 'Default helpful AI assistant persona',
    category: 'system',
    content: 'You are a helpful AI assistant. You provide accurate, helpful responses while being friendly and professional.',
    agentIds: ['nexus', 'osha'],
    isFavorite: true,
    tags: ['general', 'friendly'],
  },
  {
    id: '2',
    name: 'Code Reviewer',
    description: 'Technical code review specialist',
    category: 'system',
    content: 'You are an expert code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and best practices. Provide constructive feedback.',
    agentIds: ['promptor'],
    isFavorite: false,
    tags: ['technical', 'code'],
  },
  {
    id: '3',
    name: 'Creative Brainstorm',
    description: 'Generate creative ideas and solutions',
    category: 'template',
    content: 'Generate 5 creative ideas for {{topic}}. For each idea, include:\n1. Title\n2. Brief description\n3. Implementation steps\n4. Potential challenges',
    agentIds: ['osha'],
    isFavorite: true,
    tags: ['creative', 'brainstorm'],
  },
  {
    id: '4',
    name: 'Customer Support',
    description: 'Empathetic support agent template',
    category: 'agent',
    content: 'You are a customer support agent for {{company_name}}. Be empathetic, solution-focused, and always aim to resolve issues on first contact.',
    agentIds: ['echo'],
    isFavorite: false,
    tags: ['support', 'customer'],
  },
  {
    id: '5',
    name: 'Research Summary',
    description: 'Summarize research findings',
    category: 'template',
    content: 'Research and summarize the following topic: {{topic}}\n\nProvide:\n- Key findings\n- Sources\n- Implications\n- Further reading suggestions',
    agentIds: ['osha'],
    isFavorite: false,
    tags: ['research', 'summary'],
  },
];

const categoryIcons = {
  system: FileText,
  template: Wand2,
  agent: Bot,
};

const categoryLabels = {
  system: 'System',
  template: 'Template',
  agent: 'Agent',
};

// Map icon names to components for Quick Prompts display
const quickPromptIconMap: Record<string, React.ElementType> = {
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
};

function getQuickPromptIcon(iconName: string): React.ElementType {
  return quickPromptIconMap[iconName] || getIconComponentByName(iconName) || Sparkles;
}

export function PromptLibrary({ onSelectPrompt, onSelectQuickPrompt, selectedPromptId }: PromptLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'favorites' | 'agent'>('all');
  const [activeQuickPromptMode, setActiveQuickPromptMode] = useState<'text' | 'research' | 'image' | null>(null);
  const [prompts, setPrompts] = useState(mockPrompts);
  
  // Dialog states
  const [showNewQuickPromptDialog, setShowNewQuickPromptDialog] = useState(false);
  const [showNewPromptDialog, setShowNewPromptDialog] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  
  // New quick prompt form state
  const [newQuickPrompt, setNewQuickPrompt] = useState({
    label: '',
    prompt: '',
    mode: 'text' as 'text' | 'image' | 'research',
    icon: 'Sparkles'
  });
  
  // New prompt form state
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    description: '',
    content: '',
    category: 'template' as 'system' | 'template' | 'agent',
    tags: ''
  });
  
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

  const handleEditQuickPrompt = (prompt: QuickPrompt) => {
    onSelectQuickPrompt(prompt);
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

  const handleCreateQuickPrompt = async () => {
    if (!newQuickPrompt.label.trim() || !newQuickPrompt.prompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Label and prompt text are required.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await createQuickPrompt.mutateAsync({
        label: newQuickPrompt.label,
        prompt: newQuickPrompt.prompt,
        mode: newQuickPrompt.mode,
        icon: newQuickPrompt.icon,
      });
      toast({
        title: 'Quick prompt created',
        description: 'Your new quick prompt has been added.',
      });
      setShowNewQuickPromptDialog(false);
      setNewQuickPrompt({ label: '', prompt: '', mode: 'text', icon: 'Sparkles' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create quick prompt.',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePrompt = () => {
    if (!newPrompt.name.trim() || !newPrompt.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and content are required.',
        variant: 'destructive',
      });
      return;
    }
    
    const tagsArray = newPrompt.tags.split(',').map(t => t.trim()).filter(Boolean);
    
    const createdPrompt: Prompt = {
      id: `${Date.now()}`,
      name: newPrompt.name,
      description: newPrompt.description,
      category: newPrompt.category,
      content: newPrompt.content,
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
    setNewPrompt({ name: '', description: '', content: '', category: 'template', tags: '' });
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

  const NewQuickPromptIconComponent = getIconComponentByName(newQuickPrompt.icon);

  // Check if we're viewing quick prompts or regular prompts
  const isViewingQuickPrompts = activeQuickPromptMode !== null;

  return (
    <div className="flex flex-col lg:flex-row h-full gap-3 lg:gap-4">
      {/* Sidebar — horizontal scroll on mobile, vertical card on desktop */}
      <Card className="w-full lg:w-56 shrink-0 border-border/50">
        <CardHeader className="pb-3 hidden lg:block">
          <CardTitle className="text-sm font-semibold">Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible scrollbar-hide">
            {(['all', 'favorites', 'agent'] as const).map((cat) => {
              const count = cat === 'all' 
                ? prompts.length 
                : cat === 'favorites'
                ? prompts.filter(p => p.isFavorite).length
                : prompts.filter(p => p.category === 'agent').length;
              
              const label = cat === 'all' ? 'All Prompts' : cat === 'favorites' ? 'Favorites' : 'Agent Specific';
              
              return (
                <Button
                  key={cat}
                  variant={activeCategory === cat && !isViewingQuickPrompts ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-between h-8 whitespace-nowrap shrink-0"
                  onClick={() => {
                    setActiveCategory(cat);
                    setActiveQuickPromptMode(null);
                  }}
                >
                  <span className="truncate text-left">{label}</span>
                  <Badge variant="outline" className="text-xs h-5 px-1.5 ml-1">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          <Separator className="my-4 hidden lg:block" />

          {/* Quick Prompts Section */}
          <div className="space-y-2 lg:mt-0 mt-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 hidden lg:block">
              Quick Prompts
            </h4>
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible scrollbar-hide">
              {(['text', 'research', 'image'] as const).map((mode) => {
                const modeLabels = {
                  text: 'Text Generation',
                  research: 'Deep Research',
                  image: 'Image Generation',
                };
                const count = quickPrompts.filter(qp => qp.mode === mode).length;
                
                return (
                  <Button
                    key={mode}
                    variant={activeQuickPromptMode === mode ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-between h-8 whitespace-nowrap shrink-0"
                    onClick={() => {
                      setActiveQuickPromptMode(mode);
                      setActiveCategory('all');
                    }}
                  >
                    <span className="truncate text-left">{modeLabels[mode]}</span>
                    <Badge variant="outline" className="text-xs h-5 px-1.5 ml-1">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {isViewingQuickPrompts ? (
        /* Quick Prompts View */
        <Card className="flex-1 border-border/50 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  {activeQuickPromptMode === 'text' && 'Text Generation Prompts'}
                  {activeQuickPromptMode === 'research' && 'Deep Research Prompts'}
                  {activeQuickPromptMode === 'image' && 'Image Generation Prompts'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Edit quick prompts that appear in the console sidebar
                </p>
              </div>
              <Button size="sm" className="h-9 shrink-0" onClick={() => setShowNewQuickPromptDialog(true)}>
                <Plus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">New Quick Prompt</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {quickPromptsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : filteredQuickPrompts.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No quick prompts in this category</p>
                  </div>
                ) : (
                  filteredQuickPrompts.map((prompt) => {
                    const Icon = getQuickPromptIcon(prompt.icon);
                    return (
                      <div
                        key={prompt.id}
                        className="p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-all"
                      >
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
                                handleEditQuickPrompt(prompt);
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
                                handleDeleteQuickPrompt(prompt.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        /* Regular Prompts View */
        <Card className="flex-1 border-border/50 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts..."
                  className="pl-9 h-9"
                />
              </div>
              <Button size="sm" className="h-9 shrink-0" onClick={() => setShowNewPromptDialog(true)}>
                <Plus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">New Prompt</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {filteredPrompts.length === 0 ? (
                  <div className="text-center py-8">
                    <Wand2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No prompts found</p>
                  </div>
                ) : (
                  filteredPrompts.map((prompt) => {
                    const Icon = categoryIcons[prompt.category];
                    const isSelected = selectedPromptId === prompt.id;

                    return (
                      <div
                        key={prompt.id}
                        className={cn(
                          "p-3 rounded-lg border border-border/50 cursor-pointer transition-all hover:bg-muted/50",
                          isSelected && "ring-2 ring-primary bg-muted/50"
                        )}
                        onClick={() => onSelectPrompt(prompt)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium truncate">{prompt.name}</h4>
                              <p className="text-xs text-muted-foreground truncate">{prompt.description}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  {categoryLabels[prompt.category]}
                                </Badge>
                                {prompt.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
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
                                toggleFavorite(prompt.id);
                              }}
                            >
                              {prompt.isFavorite ? (
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              ) : (
                                <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrompt(prompt.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* New Quick Prompt Dialog */}
      <Dialog open={showNewQuickPromptDialog} onOpenChange={setShowNewQuickPromptDialog}>
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
                    <NewQuickPromptIconComponent className="h-4 w-4" />
                  </div>
                  <span className="text-muted-foreground">{newQuickPrompt.icon}</span>
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
                                  variant={newQuickPrompt.icon === name ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn(
                                    "h-10 w-10 p-0",
                                    newQuickPrompt.icon === name && "ring-2 ring-primary"
                                  )}
                                  onClick={() => {
                                    setNewQuickPrompt(prev => ({ ...prev, icon: name }));
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
                value={newQuickPrompt.label}
                onChange={(e) => setNewQuickPrompt(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Creative Ideas"
              />
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select 
                value={newQuickPrompt.mode} 
                onValueChange={(value) => setNewQuickPrompt(prev => ({ ...prev, mode: value as 'text' | 'image' | 'research' }))}
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
                value={newQuickPrompt.prompt}
                onChange={(e) => setNewQuickPrompt(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Enter the prompt text..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewQuickPromptDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuickPrompt} disabled={createQuickPrompt.isPending}>
              <Save className="h-4 w-4 mr-1.5" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Prompt Dialog */}
      <Dialog open={showNewPromptDialog} onOpenChange={setShowNewPromptDialog}>
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
                value={newPrompt.name}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Expert Code Reviewer"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="new-prompt-desc">Description</Label>
              <Input
                id="new-prompt-desc"
                value={newPrompt.description}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this prompt"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={newPrompt.category} 
                onValueChange={(value) => setNewPrompt(prev => ({ ...prev, category: value as 'system' | 'template' | 'agent' }))}
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
                value={newPrompt.content}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the prompt content..."
                className="min-h-[120px] resize-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="new-prompt-tags">Tags (comma-separated)</Label>
              <Input
                id="new-prompt-tags"
                value={newPrompt.tags}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., code, review, technical"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPromptDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePrompt}>
              <Save className="h-4 w-4 mr-1.5" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type { Prompt };
