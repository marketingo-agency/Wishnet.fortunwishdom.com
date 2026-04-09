import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings2,
  RotateCcw,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { agents } from './AgentConfigGrid';
import {
  OPENAI_TEXT_MODELS,
  GEMINI_TEXT_MODELS,
  LLMSettings,
} from '@/hooks/useLLMSettings';
import { useAgentSettings, useUpsertAgentSettings } from '@/hooks/useAgentSettings';
import { useAIChat } from '@/hooks/useLLMSettings';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PANEL_GRADIENTS: Record<string, string> = {
  nexus:    'linear-gradient(135deg, #84cc16, #16a34a)',
  promptor: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
  osha:     'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  echo:     'linear-gradient(135deg, #3b82f6, #4f46e5)',
  pulse:    'linear-gradient(135deg, #ec4899, #d946ef)',
  
  pixel:    'linear-gradient(135deg, #ec4899, #f43f5e)',
};

const defaultSystemPrompts: Record<string, string> = {
  nexus:    'You are Nexus, the central control hub for AI operations. You help users test and configure AI capabilities with precision and clarity.',
  promptor: 'You are Promptor, an expert prompt engineer. You optimize and craft prompts for maximum effectiveness, ensuring clear communication between users and AI systems.',
  osha:     'You are Osha, a friendly platform assistant. You help users navigate the platform, answer questions, and provide guidance on features and capabilities.',
  echo:     'You are Echo, a dedicated support agent. You provide empathetic, solution-focused assistance to resolve user issues quickly and effectively.',
  pulse:    'You are Pulse, a social media strategist. You create engaging content strategies, analyze trends, and optimize social presence for maximum impact.',
  
  pixel:    'You are Pixel, a visual designer specialist. You create stunning visuals, optimize image generation prompts, and ensure visual consistency across projects.',
};

interface AgentConfigPanelProps {
  agentId: string | null;
  settings: LLMSettings | null;
}

type ButtonState = 'idle' | 'testing' | 'saving' | 'success' | 'failed';

export function AgentConfigPanel({ agentId, settings }: AgentConfigPanelProps) {
  const agent = agents.find(a => a.id === agentId);
  const { data: savedSettings, isLoading: loadingSettings } = useAgentSettings(agentId);
  const upsert = useUpsertAgentSettings();
  const aiChat = useAIChat();

  // Form state – initialised from DB then kept locally
  const [isActive, setIsActive]         = useState(true);
  const [provider, setProvider]         = useState<'openai' | 'gemini'>('openai');
  const [primaryModel, setPrimaryModel] = useState('gpt-4o');
  const [temperature, setTemperature]   = useState([0.7]);
  const [maxTokens, setMaxTokens]       = useState('2048');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [buttonState, setButtonState]   = useState<ButtonState>('idle');

  // Guard flag: true while syncing from DB so provider-change effect doesn't fire
  const isInitialLoad = useRef(true);

  // Sync form when DB data loads or agentId changes
  useEffect(() => {
    if (!agentId) return;
    isInitialLoad.current = true;
    if (savedSettings) {
      setIsActive(savedSettings.is_active);
      setProvider(savedSettings.provider as 'openai' | 'gemini');
      setPrimaryModel(savedSettings.model);
      setTemperature([Number(savedSettings.temperature)]);
      setMaxTokens(String(savedSettings.max_tokens));
      setSystemPrompt(savedSettings.system_prompt ?? defaultSystemPrompts[agentId] ?? '');
    } else {
      // No DB row yet – fall back to defaults
      setIsActive(true);
      setProvider('openai');
      setPrimaryModel(agent?.model || 'gpt-4o');
      setTemperature([0.7]);
      setMaxTokens('2048');
      setSystemPrompt(defaultSystemPrompts[agentId] ?? '');
    }
    setButtonState('idle');
    // Allow provider-change effect to fire after this render cycle
    setTimeout(() => { isInitialLoad.current = false; }, 0);
  }, [agentId, savedSettings, agent?.model]);

  // Reset model to a valid option when provider is changed by the user
  useEffect(() => {
    if (isInitialLoad.current) return;
    const models = provider === 'openai' ? OPENAI_TEXT_MODELS : GEMINI_TEXT_MODELS;
    const firstModel = models[0]?.value;
    if (firstModel) setPrimaryModel(firstModel);
  }, [provider]);

  if (!agent) {
    return (
      <Card className="h-full border-border/50 flex items-center justify-center">
        <CardContent className="text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Settings2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Select an agent to configure</p>
        </CardContent>
      </Card>
    );
  }

  const Icon = agent.icon;
  const allModels = provider === 'openai' ? OPENAI_TEXT_MODELS : GEMINI_TEXT_MODELS;
  const isNexus = agent.id === 'nexus';

  const handleTestAndSave = async () => {
    if (!agentId) return;

    // Step 1: Test
    setButtonState('testing');
    let testPassed = false;
    try {
      const result = await aiChat.mutateAsync({
        provider,
        model: primaryModel,
        temperature: temperature[0],
        systemPrompt,
        message: 'Hello — respond with one sentence confirming you are ready.',
        mode: 'text',
      });
      testPassed = !!result;
    } catch {
      testPassed = false;
    }

    // Step 2: Save regardless of test result
    setButtonState('saving');
    try {
      await upsert.mutateAsync({
        agent_id: agentId,
        is_active: isNexus ? true : isActive,
        provider,
        model: primaryModel,
        temperature: temperature[0],
        max_tokens: parseInt(maxTokens, 10) || 2048,
        system_prompt: systemPrompt || null,
      });

      setButtonState(testPassed ? 'success' : 'failed');
      toast({
        title: testPassed ? 'Agent configured and verified' : 'Test failed — settings saved anyway',
        description: testPassed
          ? `${agent.name} is responding correctly and settings have been saved.`
          : `${agent.name} did not respond, but configuration was saved to the database.`,
        variant: testPassed ? 'default' : 'destructive',
      });
    } catch (err) {
      setButtonState('failed');
      toast({
        title: 'Failed to save settings',
        description: 'An error occurred while saving agent configuration.',
        variant: 'destructive',
      });
    }

    // Reset button after 3 seconds
    setTimeout(() => setButtonState('idle'), 3000);
  };

  const getButtonContent = () => {
    switch (buttonState) {
      case 'testing':
        return <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing…</>;
      case 'saving':
        return <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>;
      case 'success':
        return <><CheckCircle2 className="h-4 w-4 mr-2" />Verified ✓</>;
      case 'failed':
        return <><XCircle className="h-4 w-4 mr-2" />Failed ✗</>;
      default:
        return <><Sparkles className="h-4 w-4 mr-2" />Test & Save</>;
    }
  };

  return (
    <Card className="h-full border-border/50 flex flex-col">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Fixed icon — vivid hex gradient, never washed out */}
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: PANEL_GRADIENTS[agent.id] ?? 'linear-gradient(135deg, #6b7280, #4b5563)' }}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
            </div>
          </div>

          {/* Toggle: hidden for Nexus */}
          {!isNexus && (
            <div className="flex flex-col items-end gap-1">
              <Label htmlFor="agent-active" className="text-xs text-muted-foreground">
                {isActive ? 'Active' : 'Inactive'}
              </Label>
              <Switch
                id="agent-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto py-4 space-y-6">
        {loadingSettings ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                  <Select value={provider} onValueChange={(v) => setProvider(v as 'openai' | 'gemini')}>
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
                  <Select value={primaryModel} onValueChange={setPrimaryModel}>
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
                    onValueChange={setTemperature}
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
                    onChange={(e) => setMaxTokens(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* System Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">System Prompt</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSystemPrompt(defaultSystemPrompts[agentId || ''] || '')}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[120px] text-sm"
                placeholder="Define the agent's behavior and personality…"
              />
              <p className="text-xs text-muted-foreground">
                {systemPrompt.length} characters
              </p>
            </div>
          </>
        )}
      </CardContent>

      {/* Single Test & Save button */}
      <div className="p-4 border-t border-border/50">
        <Button
          className={cn(
            'w-full transition-all',
            buttonState === 'success' && 'bg-emerald-600 hover:bg-emerald-700',
            buttonState === 'failed'  && 'bg-destructive hover:bg-destructive/90',
            buttonState === 'idle'    && 'bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600',
          )}
          disabled={buttonState === 'testing' || buttonState === 'saving'}
          onClick={handleTestAndSave}
        >
          {getButtonContent()}
        </Button>
      </div>
    </Card>
  );
}
