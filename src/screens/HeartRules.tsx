"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Heart, 
  Plus, 
  Search, 
  MessageSquare,
  ShieldAlert,
  FileText,
  Scale,
  ChevronLeft,
  Globe,
  LayoutGrid,
  Check,
  Settings,
  Building2,
  Package,
  Users,
  Settings2,
  Sparkles,
  Zap,
  Target,
  Lightbulb,
  Eye,
  Edit2,
  Trash2,
  Bot,
  Database,
  Calendar,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useHeartRules, useCreateHeartRule, useToggleHeartRule, useDeleteHeartRule, useUpdateHeartRule, useReorderHeartRules } from '@/hooks/useHeartRules';
import { useHeartCategories } from '@/hooks/useHeartCategories';
import { AI_AGENTS } from '@/data/agents';
import type { HeartRule } from '@/types/brain';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateRuleDialog, SortableRuleCard, RuleCard } from '@/components/heart';
import { format } from 'date-fns';

// Icon mapping for dynamic categories
const ICON_MAP: Record<string, LucideIcon> = {
  Building2, Package, Users, Settings2, MessageSquare, ShieldAlert, FileText, Scale, Sparkles, Zap, Target, Lightbulb, LayoutGrid
};

function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || FileText;
}

// Color mapping for dynamic categories
const COLOR_MAP: Record<string, string> = {
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

export default function HeartRules() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [deleteRule, setDeleteRule] = useState<HeartRule | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<HeartRule | null>(null);
  
  // Ref to suppress card click when dropdown action is triggered
  const suppressNextCardClickRef = useRef(false);
  const suppressNextCardClick = () => {
    suppressNextCardClickRef.current = true;
    requestAnimationFrame(() => {
      suppressNextCardClickRef.current = false;
    });
  };
  
  // Edit states for scope editing in sheet
  const [editIsGlobal, setEditIsGlobal] = useState(true);
  const [editSelectedAgents, setEditSelectedAgents] = useState<string[]>([]);

  const { data: rules, isLoading } = useHeartRules();
  const { data: heartCategories } = useHeartCategories();
  const createMutation = useCreateHeartRule();
  const toggleMutation = useToggleHeartRule();
  const deleteMutation = useDeleteHeartRule();
  const updateMutation = useUpdateHeartRule();
  const reorderMutation = useReorderHeartRules();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { distance: 8 } 
    }),
    useSensor(KeyboardSensor, { 
      coordinateGetter: sortableKeyboardCoordinates 
    })
  );

  // Whether DnD is disabled (filtered or searching)
  const isDndDisabled = selectedType !== 'all' || searchQuery.trim().length > 0;

  // Build dynamic RULE_TYPES from database categories
  const ruleTypes = useMemo(() => {
    const allType = { id: 'all', name: 'All Types', icon: LayoutGrid, color: 'text-muted-foreground', colorName: 'gray' };
    const dynamicTypes = (heartCategories || []).map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: getIconComponent(cat.icon),
      color: COLOR_MAP[cat.color] || 'text-muted-foreground',
      colorName: cat.color || 'gray',
    }));
    return [allType, ...dynamicTypes];
  }, [heartCategories]);

  // Derive selectedRule from fresh rules data to fix stale state issue
  const selectedRule = useMemo(() => {
    if (!selectedItemId || !rules) return null;
    return rules.find(r => r.id === selectedItemId) || null;
  }, [selectedItemId, rules]);

  // Initialize edit states when selectedRule changes
  useEffect(() => {
    if (selectedRule) {
      setEditIsGlobal(selectedRule.is_global);
      setEditSelectedAgents(selectedRule.assigned_agents || []);
    }
  }, [selectedRule]);

  // Check if scope has been modified
  const scopeChanged = useMemo(() => {
    if (!selectedRule) return false;
    const originalIsGlobal = selectedRule.is_global;
    const originalAgents = selectedRule.assigned_agents || [];
    
    if (editIsGlobal !== originalIsGlobal) return true;
    if (!editIsGlobal) {
      if (editSelectedAgents.length !== originalAgents.length) return true;
      return !editSelectedAgents.every(id => originalAgents.includes(id));
    }
    return false;
  }, [selectedRule, editIsGlobal, editSelectedAgents]);

  const getTypeInfo = (typeId: string) => {
    return ruleTypes.find(t => t.id === typeId) || ruleTypes[0];
  };

  // Helper: apply search filter to a rule
  const matchesSearch = (rule: HeartRule) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rule.name.toLowerCase().includes(q) ||
      rule.description?.toLowerCase().includes(q) ||
      rule.rule_content.toLowerCase().includes(q)
    );
  };

  const filteredRules = (rules || []).filter(rule => {
    const matchesType = selectedType === 'all' || rule.category === selectedType;
    return matchesSearch(rule) && matchesType;
  });

  // Compute search-aware tab counts
  const tabCounts = useMemo(() => {
    const allRules = rules || [];
    const searched = allRules.filter(matchesSearch);
    const counts: Record<string, number> = { all: searched.length };
    for (const type of ruleTypes) {
      if (type.id !== 'all') {
        counts[type.id] = searched.filter(r => r.category === type.id).length;
      }
    }
    return counts;
  }, [rules, searchQuery, ruleTypes]);

  const handleToggle = async (rule: HeartRule) => {
    await toggleMutation.mutateAsync({ id: rule.id, isActive: !rule.is_active });
  };

  const handleDelete = async () => {
    if (!deleteRule) return;
    await deleteMutation.mutateAsync(deleteRule.id);
    setDeleteRule(null);
    setSelectedItemId(null);
  };

  const handleEdit = (rule: HeartRule) => {
    setEditRule(rule);
    setCreateDialogOpen(true);
  };

  const handleDuplicate = async (rule: HeartRule) => {
    await createMutation.mutateAsync({
      name: `Copy of ${rule.name}`,
      description: rule.description || undefined,
      ruleContent: rule.rule_content,
      category: rule.category,
      priority: rule.priority || 'medium',
      isGlobal: rule.is_global,
      assignedAgents: rule.assigned_agents || undefined,
    });
  };

  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setEditRule(null);
    }
  };

  const handleSaveScope = async () => {
    if (!selectedRule) return;
    await updateMutation.mutateAsync({
      id: selectedRule.id,
      updates: {
        is_global: editIsGlobal,
        assigned_agents: editIsGlobal ? null : editSelectedAgents,
      },
    });
  };

  const toggleAgentSelection = (agentId: string) => {
    setEditSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Only allow reorder on "All Types" with no search
    if (isDndDisabled) return;

    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = filteredRules.findIndex(r => r.id === active.id);
      const newIndex = filteredRules.findIndex(r => r.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedRules = arrayMove(filteredRules, oldIndex, newIndex);
        const updates = reorderedRules.map((rule, index) => ({
          id: rule.id,
          sort_order: index + 1,
        }));
        reorderMutation.mutate(updates);
      }
    }
  };

  // Context-aware empty state
  const emptyStateMessage = useMemo(() => {
    if (searchQuery.trim()) {
      return { title: 'No matching rules', subtitle: `No rules match "${searchQuery}". Try a different search.` };
    }
    if (selectedType !== 'all') {
      const typeInfo = getTypeInfo(selectedType);
      return { title: `No ${typeInfo.name} rules yet`, subtitle: `Create a rule in the ${typeInfo.name} category to get started.` };
    }
    return { title: 'No rules yet', subtitle: 'Create rules to define how your AI agents should behave and communicate.' };
  }, [searchQuery, selectedType, ruleTypes]);

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/mastermind')}
              className="gap-2 text-muted-foreground hover:text-foreground -ml-2 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">The Heart</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Rules Engine</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              className="gap-2 bg-rose-500 hover:bg-rose-600 text-sm"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Rule</span>
              <span className="sm:hidden">Create</span>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push('/mastermind/vector-store')}
                    className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 hover:bg-emerald-50 hover:border-emerald-200"
                  >
                    <Database className="w-4 h-4 text-emerald-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>RAG Knowledge Base</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push('/settings?tab=mastermind')}
                    className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>MasterMind Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            {filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-4 sm:px-6 py-3 border-b border-border/50 bg-muted/50/50 overflow-x-auto scrollbar-hide">
          <TooltipProvider>
            <ToggleGroup
              type="single"
              value={selectedType}
              onValueChange={(value) => value && setSelectedType(value)}
              className="justify-start gap-2 min-w-max"
            >
              {ruleTypes.map((type) => {
                const Icon = type.icon;
                const isActive = selectedType === type.id;
                const count = tabCounts[type.id] ?? 0;
                
                return (
                  <Tooltip key={type.id}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value={type.id}
                        className={`px-3 sm:px-4 py-2 h-9 rounded-full text-sm font-medium transition-all gap-1.5 sm:gap-2 ${
                          isActive
                            ? 'bg-card shadow-sm border border-border text-foreground'
                            : 'bg-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground/80'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? type.color : ''}`} />
                        <span className="text-xs sm:text-sm">{type.name}</span>
                        <Badge 
                          variant="secondary" 
                          className={`h-5 px-1.5 text-xs ${
                            isActive ? 'bg-muted' : 'bg-muted/50'
                          }`}
                        >
                          {count}
                        </Badge>
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    {/* Tooltip only on mobile where label is hidden */}
                    <TooltipContent className="sm:hidden">{type.name}</TooltipContent>
                  </Tooltip>
                );
              })}
            </ToggleGroup>
          </TooltipProvider>
        </div>

        {/* Rules Card Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
                  <Heart className="w-8 h-8 text-rose-400" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">{emptyStateMessage.title}</h3>
                <p className="text-muted-foreground max-w-md mb-4">
                  {emptyStateMessage.subtitle}
                </p>
                {!searchQuery.trim() && (
                  <Button 
                    className="bg-rose-500 hover:bg-rose-600 gap-2"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Create First Rule
                  </Button>
                )}
              </div>
            ) : (
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={filteredRules.map(r => r.id)} 
                  strategy={rectSortingStrategy}
                >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRules.map((rule) => {
                      const typeInfo = getTypeInfo(rule.category);
                      
                      return (
                        <SortableRuleCard key={rule.id} rule={rule} disabled={isDndDisabled}>
                          <RuleCard
                            rule={rule}
                            typeInfo={typeInfo}
                            isSelected={selectedItemId === rule.id}
                            onSelect={() => setSelectedItemId(rule.id)}
                            onToggle={() => handleToggle(rule)}
                            onEdit={() => handleEdit(rule)}
                            onDelete={() => setDeleteRule(rule)}
                            onDuplicate={() => handleDuplicate(rule)}
                            suppressNextCardClickRef={suppressNextCardClickRef}
                          />
                        </SortableRuleCard>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Rule Detail Sheet */}
      <Sheet open={!!selectedRule} onOpenChange={(open) => !open && setSelectedItemId(null)}>
        <SheetContent className="sm:max-w-md p-0 flex flex-col max-h-[100dvh]">
          {selectedRule && (() => {
            const typeInfo = getTypeInfo(selectedRule.category);
            const TypeIcon = typeInfo.icon;
            return (
              <>
                {/* Compact Elegant Header */}
                <div className="p-4 sm:p-6 border-b border-border/50 bg-card">
                  <SheetHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shrink-0">
                        <TypeIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <SheetTitle className="text-foreground text-lg mb-1">{selectedRule.name}</SheetTitle>
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {selectedRule.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge 
                            variant="outline" 
                            className={selectedRule.is_active 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-muted/50 text-muted-foreground border-border'
                            }
                          >
                            {selectedRule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                            {typeInfo.name}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </SheetHeader>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* Rule Content - Elevated */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">Rule Content</p>
                      <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-border text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {selectedRule.rule_content}
                      </div>
                    </div>

                    {/* Dates */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">Details</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span>Created {format(new Date(selectedRule.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        {selectedRule.updated_at !== selectedRule.created_at && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                            <span>Updated {format(new Date(selectedRule.updated_at), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Toggle - Prominent Card with live update */}
                    <div className="p-4 bg-card rounded-xl border border-border shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full transition-colors ${selectedRule.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">Status</p>
                            <p className={`text-xs transition-colors ${selectedRule.is_active ? 'text-emerald-600' : 'text-muted-foreground/70'}`}>
                              {selectedRule.is_active ? 'This rule is active and enforced' : 'This rule is currently disabled'}
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={selectedRule.is_active}
                          onCheckedChange={() => handleToggle(selectedRule)}
                          disabled={toggleMutation.isPending}
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">Category</p>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border/50">
                        <div className="w-9 h-9 rounded-lg bg-card shadow-sm flex items-center justify-center">
                          <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                        </div>
                        <span className="text-sm font-medium text-foreground/80">{typeInfo.name}</span>
                      </div>
                    </div>

                    {/* Scope - NOW EDITABLE */}
                    <div className="space-y-4">
                      <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Applies To</p>
                      
                      {/* Global Toggle */}
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-card shadow-sm flex items-center justify-center">
                            <Globe className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Apply to all agents</p>
                            <p className="text-xs text-muted-foreground">Rule enforced globally</p>
                          </div>
                        </div>
                        <Switch 
                          checked={editIsGlobal}
                          onCheckedChange={(val) => {
                            setEditIsGlobal(val);
                            if (val) setEditSelectedAgents([]);
                          }}
                        />
                      </div>

                      {/* Agent Selection (when not global) */}
                      {!editIsGlobal && (
                        <div className="space-y-3">
                          <Label className="text-xs font-medium text-muted-foreground">Select Agents</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {AI_AGENTS.map((agent) => {
                              const Icon = agent.icon;
                              const isSelected = editSelectedAgents.includes(agent.id);
                              return (
                                <div
                                  key={agent.id}
                                  onClick={() => toggleAgentSelection(agent.id)}
                                  className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-rose-500 bg-rose-50'
                                      : 'border-border/50 bg-card hover:border-border hover:bg-muted/50'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center mb-2`}>
                                    <Icon className="w-4 h-4 text-white" />
                                  </div>
                                  <p className="text-xs font-medium text-foreground">{agent.name}</p>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">{agent.role}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Save button if scope changed */}
                      {scopeChanged && (
                        <Button 
                          onClick={handleSaveScope} 
                          className="w-full bg-rose-500 hover:bg-rose-600"
                          disabled={updateMutation.isPending || (!editIsGlobal && editSelectedAgents.length === 0)}
                        >
                          {updateMutation.isPending ? 'Saving...' : 'Save Scope Changes'}
                        </Button>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* Actions Footer */}
                <div className="p-4 border-t border-border/50 bg-card">
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleEdit(selectedRule)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Rule
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => setDeleteRule(selectedRule)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRule} onOpenChange={(open) => !open && setDeleteRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRule?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Rule Dialog */}
      <CreateRuleDialog 
        open={createDialogOpen} 
        onOpenChange={handleDialogClose}
        editRule={editRule}
        defaultCategory={selectedType !== 'all' ? selectedType : undefined}
      />
    </div>
  );
}
