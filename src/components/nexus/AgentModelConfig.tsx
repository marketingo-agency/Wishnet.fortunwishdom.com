import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import {
  OPENAI_TEXT_MODELS,
  GEMINI_TEXT_MODELS,
} from '@/hooks/useLLMSettings';

interface AgentModelConfigProps {
  provider: 'openai' | 'gemini';
  primaryModel: string;
  temperature: number[];
  maxTokens: string;
  onProviderChange: (provider: 'openai' | 'gemini') => void;
  onModelChange: (model: string) => void;
  onTemperatureChange: (value: number[]) => void;
  onMaxTokensChange: (value: string) => void;
}

export function AgentModelConfig({
  provider,
  primaryModel,
  temperature,
  maxTokens,
  onProviderChange,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
}: AgentModelConfigProps) {
  const allModels = provider === 'openai' ? OPENAI_TEXT_MODELS : GEMINI_TEXT_MODELS;

  return (
    <>
      {/* Model Assignment */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Model Assignment
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Provider</Label>
            <Select value={provider} onValueChange={(v) => onProviderChange(v as 'openai' | 'gemini')}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Model</Label>
            <Select value={primaryModel} onValueChange={onModelChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allModels.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Behavior Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Behavior Settings</h4>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs">Temperature</Label>
              <span className="text-xs text-muted-foreground">{temperature[0].toFixed(1)}</span>
            </div>
            <Slider
              value={temperature}
              onValueChange={onTemperatureChange}
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Lower = more focused, Higher = more creative
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Max Tokens</Label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => onMaxTokensChange(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
      </div>
    </>
  );
}
