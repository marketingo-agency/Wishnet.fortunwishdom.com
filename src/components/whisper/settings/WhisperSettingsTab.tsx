"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Plug, Bot } from 'lucide-react';
import { useWhisperSettings, useUpdateWhisperSettings } from '@/hooks/useWhisperSettings';
import { getTextModelsForProvider, type LLMProviderKey } from '@/config/llmModels';
import type { WhisperFormat } from '@/types/whisper';

const PROVIDERS: Array<{ value: LLMProviderKey; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'fal', label: 'fal.ai' },
];

const FORMATS: Array<{ value: WhisperFormat; label: string }> = [
  { value: 'two_host', label: 'Two-host conversation' },
  { value: 'solo', label: 'Solo narration' },
  { value: 'interview', label: 'Interview' },
  { value: 'explainer', label: 'Explainer' },
];

export function WhisperSettingsTab() {
  const { data: settings, isLoading } = useWhisperSettings();
  const updateSettings = useUpdateWhisperSettings();

  const [provider, setProvider] = useState<LLMProviderKey>('openai');
  const [model, setModel] = useState('gpt-4.1');
  const [format, setFormat] = useState<WhisperFormat>('two_host');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    if (!settings) return;
    setProvider((settings.script_provider as LLMProviderKey) ?? 'openai');
    setModel(settings.script_model ?? 'gpt-4.1');
    setFormat(settings.default_format ?? 'two_host');
    setLanguage(settings.default_language ?? 'en');
  }, [settings]);

  const handleProvider = (v: string) => {
    const next = v as LLMProviderKey;
    setProvider(next);
    setModel(getTextModelsForProvider(next)[0]?.value ?? '');
  };

  const handleSave = () => {
    updateSettings.mutate({
      script_provider: provider,
      script_model: model,
      default_format: format,
      default_language: language.trim() || 'en',
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Voice engine (fal — no separate account or key) */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-indigo-500" />
            <CardTitle className="text-sm">Voice engine</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Voices are synthesized through fal.ai (ElevenLabs voices on the app&apos;s fal key) — no separate
            account or key needed. Manage the fal.ai key in Settings &gt; LLM Providers.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Generation defaults */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-500" />
            <CardTitle className="text-sm">Generation defaults</CardTitle>
          </div>
          <CardDescription className="text-xs">
            The model that writes scripts, plus the default episode format and language.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Script provider</Label>
                  <Select value={provider} onValueChange={handleProvider}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value} className="text-sm">{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Script model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select a model" /></SelectTrigger>
                    <SelectContent>{getTextModelsForProvider(provider).map((m) => <SelectItem key={m.value} value={m.value} className="text-sm">{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Default format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as WhisperFormat)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{FORMATS.map((f) => <SelectItem key={f.value} value={f.value} className="text-sm">{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="whisper-lang" className="text-xs font-medium">Default language</Label>
                  <Input id="whisper-lang" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className="h-9 text-sm" />
                </div>
              </div>

              <div className="flex justify-end border-t pt-3">
                <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
                  {updateSettings.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save defaults
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
