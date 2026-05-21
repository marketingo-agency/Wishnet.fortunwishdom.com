import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Settings2, Sparkles, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { agents } from './AgentConfigGrid';
import { AGENT_GRADIENTS, AGENT_GRADIENT_FALLBACK } from './agentGradients';
import {
  type LLMSettings,
  OPENAI_TEXT_MODELS,
  GEMINI_TEXT_MODELS,
  useAIChat,
} from '@/hooks/useLLMSettings';
import { useAgentSettings, useUpsertAgentSettings } from '@/hooks/useAgentSettings';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AgentModelConfig } from './AgentModelConfig';
import { AgentSystemPrompt } from './AgentSystemPrompt';

const defaultSystemPrompts: Record<string, string> = {
  nexus:    'You are Nexus, the central control hub for AI operations. You help users test and configure AI capabilities with precision and clarity.',
  promptor: 'You are Promptor, an expert prompt engineer. You optimize and craft prompts for maximum effectiveness, ensuring clear communication between users and AI systems.',
  osha:     'You are Osha, a friendly platform assistant. You help users navigate the platform, answer questions, and provide guidance on features and capabilities.',
  whisper:  'You are Whisper, a podcast producer. You write engaging, well-structured podcast scripts and prepare them for natural-sounding audio narration.',
  pulse:    'You are Pulse, a social media strategist. You create engaging content strategies, analyze trends, and optimize social presence for maximum impact.',
  pixel:    'You are Pixel, a visual designer specialist. You create stunning visuals, optimize image generation prompts, and ensure visual consistency across projects.',
  atlas:    'You are ATLAS, the Kickstarter operations control agent. You structure, calculate, verify, and monitor KS operations across SKU data, factory quotes, QC, freight, 3PL, pledge manager, backer delivery, and financial modeling. You identify risks, missing data, and cost impact, and recommend next actions for human review — you never make final decisions.',
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

  const [isActive, setIsActive]         = useState(true);
  const [provider, setProvider]         = useState<'openai' | 'gemini'>('openai');
  const [primaryModel, setPrimaryModel] = useState('gpt-4o');
  const [temperature, setTemperature]   = useState([0.7]);
  const [maxTokens, setMaxTokens]       = useState('2048');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [buttonState, setButtonState]   = useState<ButtonState>('idle');

  const isInitialLoad = useRef(true);
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup all timers on unmount
  useEffect(() => () => {
    if (initTimerRef.current) clearTimeout(initTimerRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

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
      setIsActive(true);
      setProvider('openai');
      setPrimaryModel(agent?.model || 'gpt-4o');
      setTemperature([0.7]);
      setMaxTokens('2048');
      setSystemPrompt(defaultSystemPrompts[agentId] ?? '');
    }
    setButtonState('idle');
    if (initTimerRef.current) clearTimeout(initTimerRef.current);
    initTimerRef.current = setTimeout(() => { isInitialLoad.current = false; }, 0);
  }, [agentId, savedSettings, agent?.model]);

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
  const isNexus = agent.id === 'nexus';

  const handleTestAndSave = async () => {
    if (!agentId) return;

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
    } catch {
      setButtonState('failed');
      toast({
        title: 'Failed to save settings',
        description: 'An error occurred while saving agent configuration.',
        variant: 'destructive',
      });
    }

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setButtonState('idle'), 3000);
  };

  const getButtonContent = () => {
    switch (buttonState) {
      case 'testing':
        return <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>;
      case 'saving':
        return <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>;
      case 'success':
        return <><CheckCircle2 className="h-4 w-4 mr-2" />Verified</>;
      case 'failed':
        return <><XCircle className="h-4 w-4 mr-2" />Failed</>;
      default:
        return <><Sparkles className="h-4 w-4 mr-2" />Test &amp; Save</>;
    }
  };

  return (
    <Card className="h-full border-border/50 flex flex-col">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: AGENT_GRADIENTS[agent.id] ?? AGENT_GRADIENT_FALLBACK }}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
            </div>
          </div>

          {!isNexus && (
            <div className="flex flex-col items-end gap-1">
              <Label htmlFor="agent-active" className="text-xs text-muted-foreground">
                {isActive ? 'Active' : 'Inactive'}
              </Label>
              <Switch id="agent-active" checked={isActive} onCheckedChange={setIsActive} />
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
            <AgentModelConfig
              provider={provider}
              primaryModel={primaryModel}
              temperature={temperature}
              maxTokens={maxTokens}
              onProviderChange={setProvider}
              onModelChange={setPrimaryModel}
              onTemperatureChange={setTemperature}
              onMaxTokensChange={setMaxTokens}
            />

            <Separator />

            <AgentSystemPrompt
              systemPrompt={systemPrompt}
              onSystemPromptChange={setSystemPrompt}
              onReset={() => setSystemPrompt(defaultSystemPrompts[agentId || ''] || '')}
            />
          </>
        )}
      </CardContent>

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
