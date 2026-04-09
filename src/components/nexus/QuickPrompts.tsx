import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare,
  Lightbulb, 
  FileText, 
  Languages, 
  Code, 
  Sparkles, 
  Mountain, 
  Palette,
  TrendingUp,
  Users,
  Cpu
} from 'lucide-react';
import { useQuickPrompts, QuickPrompt } from '@/hooks/useQuickPrompts';

interface QuickPromptsProps {
  onSelectPrompt: (prompt: string, mode: 'text' | 'image' | 'research') => void;
}

// Map icon names to components
const iconMap: Record<string, React.ElementType> = {
  Lightbulb,
  FileText,
  Languages,
  Code,
  Sparkles,
  Mountain,
  Palette,
  TrendingUp,
  Users,
  Cpu,
  MessageSquare,
};

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName] || Sparkles;
}

export function QuickPrompts({ onSelectPrompt }: QuickPromptsProps) {
  const { data: prompts = [], isLoading } = useQuickPrompts();

  const textPrompts = prompts.filter(p => p.mode === 'text');
  const imagePrompts = prompts.filter(p => p.mode === 'image');
  const researchPrompts = prompts.filter(p => p.mode === 'research');

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            Quick Prompts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderPromptList = (promptList: QuickPrompt[], title: string) => {
    if (promptList.length === 0) return null;
    
    return (
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {title}
        </h4>
        <div className="space-y-1.5">
          {promptList.map((template) => {
            const Icon = getIcon(template.icon);
            return (
              <Button
                key={template.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-auto py-2 px-3 text-left"
                onClick={() => onSelectPrompt(template.prompt, template.mode)}
              >
                <Icon className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{template.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-500" />
          Quick Prompts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderPromptList(textPrompts, 'Text Generation')}
        {renderPromptList(researchPrompts, 'Deep Research')}
        {renderPromptList(imagePrompts, 'Image Generation')}
      </CardContent>
    </Card>
  );
}
