import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface AgentSystemPromptProps {
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  onReset: () => void;
}

export function AgentSystemPrompt({
  systemPrompt,
  onSystemPromptChange,
  onReset,
}: AgentSystemPromptProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">System Prompt</h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onReset}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>
      <Textarea
        value={systemPrompt}
        onChange={(e) => onSystemPromptChange(e.target.value)}
        className="min-h-[120px] text-sm"
        placeholder="Define the agent's behavior and personality..."
      />
      <p className="text-xs text-muted-foreground">
        {systemPrompt.length} characters
      </p>
    </div>
  );
}
