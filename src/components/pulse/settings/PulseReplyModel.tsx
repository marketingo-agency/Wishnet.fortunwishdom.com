"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePulseWorkspaceSettings,
  useUpdatePulseWorkspaceSettings,
} from '@/hooks/usePulseWorkspaceSettings';
import { getTextModelsForProvider, type LLMProviderKey } from '@/config/llmModels';

const PROVIDERS: Array<{ value: LLMProviderKey; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'fal', label: 'fal.ai' },
];

export function PulseReplyModel() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = usePulseWorkspaceSettings(isAdmin === true);
  const updateSettings = useUpdatePulseWorkspaceSettings();

  const [provider, setProvider] = useState<LLMProviderKey>('openai');
  const [model, setModel] = useState('gpt-4.1');
  const [temperature, setTemperature] = useState(0.7);
  const [persona, setPersona] = useState('');

  useEffect(() => {
    if (!data) return;
    setProvider((data.reply_provider as LLMProviderKey) ?? 'openai');
    setModel(data.reply_model ?? 'gpt-4.1');
    setTemperature(typeof data.reply_temperature === 'number' ? data.reply_temperature : 0.7);
    setPersona(data.reply_persona ?? '');
  }, [data]);

  const models = getTextModelsForProvider(provider);

  const handleProviderChange = (value: string) => {
    const next = value as LLMProviderKey;
    setProvider(next);
    // snap to the first model of the new provider
    setModel(getTextModelsForProvider(next)[0]?.value ?? '');
  };

  const handleSave = () => {
    updateSettings.mutate({
      reply_provider: provider,
      reply_model: model,
      reply_temperature: temperature,
      reply_persona: persona.trim() || null,
    });
  };

  if (!isAdmin) return null;

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-rose-500" />
          <CardTitle className="text-sm">Reply Model</CardTitle>
        </div>
        <CardDescription className="text-xs">
          The model Pulse uses to draft replies — chosen independently of the global LLM settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Provider</Label>
                <Select value={provider} onValueChange={handleProviderChange}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="text-sm">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select a model" /></SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-sm">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Temperature</Label>
                <span className="text-xs tabular-nums text-muted-foreground">{temperature.toFixed(1)}</span>
              </div>
              <Slider
                value={[temperature]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={(v) => setTemperature(v[0] ?? 0.7)}
                aria-label="Reply temperature"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pulse-reply-persona" className="text-xs font-medium">Reply persona (optional)</Label>
              <Textarea
                id="pulse-reply-persona"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="e.g. Warm, concise, on-brand. Always thank the commenter and never make promises about delivery dates."
                className="min-h-[72px] text-sm"
              />
            </div>

            <div className="flex justify-end border-t pt-3">
              <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
                {updateSettings.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Reply Model
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
