/**
 * RuleCard Component
 * 
 * Individual rule card with index status badge and manual index button.
 * Uses hooks to track indexing status per-card.
 */

import {
  Eye,
  Edit2,
  Trash2,
  Globe,
  Bot,
  MoreVertical,
  Database,
  Check,
  AlertCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRuleIndexStatus } from '@/hooks/useOcrIndexing';
import { useProcessHeartRuleEmbedding } from '@/hooks/useKnowledgeEmbeddings';
import { AI_AGENTS } from '@/data/agents';
import type { HeartRule } from '@/types/brain';
import { useQueryClient } from '@tanstack/react-query';

// Accent bar colors for category identification
const ACCENT_COLOR_MAP: Record<string, string> = {
  violet: 'bg-violet-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  indigo: 'bg-indigo-500',
  cyan: 'bg-cyan-500',
  gray: 'bg-muted-foreground/50',
};

// Background colors for category icons
const BG_COLOR_MAP: Record<string, string> = {
  violet: 'bg-violet-100',
  red: 'bg-red-100',
  blue: 'bg-blue-100',
  amber: 'bg-amber-100',
  emerald: 'bg-emerald-100',
  rose: 'bg-rose-100',
  indigo: 'bg-indigo-100',
  cyan: 'bg-cyan-100',
  gray: 'bg-muted',
};

function getAccentColor(colorName: string): string {
  return ACCENT_COLOR_MAP[colorName] || 'bg-muted-foreground/50';
}

function getBgColor(colorName: string): string {
  return BG_COLOR_MAP[colorName] || 'bg-muted';
}

interface RuleCardProps {
  rule: HeartRule;
  typeInfo: {
    id: string;
    name: string;
    icon: LucideIcon;
    color: string;
    colorName: string;
  };
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  suppressNextCardClickRef: React.MutableRefObject<boolean>;
}

export function RuleCard({
  rule,
  typeInfo,
  isSelected,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  suppressNextCardClickRef,
}: RuleCardProps) {
  const queryClient = useQueryClient();
  const TypeIcon = typeInfo.icon;
  
  // Index status hook
  const { data: indexStatus, isLoading: isCheckingIndex } = useRuleIndexStatus(rule.id);
  
  // Index mutation hook
  const indexMutation = useProcessHeartRuleEmbedding();

  const assignedAgentNames = rule.assigned_agents
    ? rule.assigned_agents.map(id => AI_AGENTS.find(a => a.id === id)?.name || id)
    : [];

  const suppressNextCardClick = () => {
    suppressNextCardClickRef.current = true;
    requestAnimationFrame(() => {
      suppressNextCardClickRef.current = false;
    });
  };

  const handleIndex = async () => {
    suppressNextCardClick();
    await indexMutation.mutateAsync(rule.id);
    queryClient.invalidateQueries({ queryKey: ['rule-index-status', rule.id] });
  };

  return (
    <Card 
      className={`relative overflow-hidden border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group ${
        isSelected ? 'ring-2 ring-rose-500' : ''
      } ${!rule.is_active ? 'opacity-70' : ''}`}
      onClick={() => {
        if (suppressNextCardClickRef.current) return;
        onSelect();
      }}
    >
      {/* Colored Accent Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 transition-colors ${
        rule.is_active ? getAccentColor(typeInfo.colorName) : 'bg-muted-foreground/30'
      }`} />
      
      <CardContent className="pt-4 pb-3 px-4 sm:pt-5 sm:pb-4 sm:px-5">
        {/* Category Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${getBgColor(typeInfo.colorName)}`}>
              <TypeIcon className={`w-3.5 h-3.5 ${typeInfo.color}`} />
            </div>
            <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
              {typeInfo.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Switch
              checked={rule.is_active}
              onCheckedChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              aria-label={rule.is_active ? 'Deactivate rule' : 'Activate rule'}
              className="scale-90"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Rule actions"
                  className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuItem onSelect={onSelect}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => {
                  suppressNextCardClick();
                  onEdit();
                }}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Manual Index Button */}
                <DropdownMenuItem 
                  onSelect={handleIndex}
                  disabled={indexMutation.isPending}
                >
                  {indexMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4 mr-2" />
                  )}
                  {indexStatus?.isIndexed ? 'Re-index to Knowledge Base' : 'Index to Knowledge Base'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onSelect={() => {
                    suppressNextCardClick();
                    onDelete();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Rule Name */}
        <h3 className="font-semibold text-foreground text-base mb-1 line-clamp-2">
          {rule.name}
        </h3>

        {/* Description (if exists) */}
        {rule.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
            {rule.description}
          </p>
        )}

        {/* Content Preview */}
        <div className="p-3 bg-muted/50 rounded-lg mb-4">
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            "{rule.rule_content}"
          </p>
        </div>

        {/* Footer Badges */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Badge */}
          <Badge 
            variant="outline" 
            className="bg-card border-border text-muted-foreground text-xs py-0.5"
          >
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${rule.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
            {rule.is_active ? 'Active' : 'Inactive'}
          </Badge>
          
          {/* Scope Badge */}
          <Badge 
            variant="outline" 
            className={`text-xs py-0.5 ${rule.is_global 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
          >
            {rule.is_global ? (
              <>
                <Globe className="w-3 h-3 mr-1" />
                Global
              </>
            ) : (
              <>
                <Bot className="w-3 h-3 mr-1" />
                {assignedAgentNames.length} agent{assignedAgentNames.length !== 1 ? 's' : ''}
              </>
            )}
          </Badge>
          
          {/* Index Status Badge */}
          {indexMutation.isPending ? (
            <Badge
              variant="outline"
              className="text-xs py-0.5 bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
            >
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Indexing…
            </Badge>
          ) : !isCheckingIndex && (
            <Badge
              variant="outline"
              className={`text-xs py-0.5 ${
                indexStatus?.isIndexed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {indexStatus?.isIndexed ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  {indexStatus.chunkCount} chunk{indexStatus.chunkCount !== 1 ? 's' : ''}
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not indexed
                </>
              )}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
