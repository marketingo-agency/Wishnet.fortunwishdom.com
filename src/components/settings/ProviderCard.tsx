import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  XCircle, X, PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChat } from '@/hooks/useLLMSettings';
import { useToast } from '@/hooks/use-toast';
import { TestAllPanel, type TestAllStep } from './TestAllPanel';
import { ProviderModelSelectors, type ModelOption } from './ProviderModelSelectors';
import { ApiKeyEditor } from './ApiKeyEditor';
import type { KeySource } from '@/hooks/useProviderKeyStatus';

interface ProviderCardProps {
  provider: 'openai' | 'gemini' | 'fal';
  title: string;
  icon: React.ReactNode;
  isConnected: boolean;
  keySource: KeySource;
  isAdmin: boolean;
  textModel: string;
  imageModel: string;
  textModels: ModelOption[];
  imageModels: ModelOption[];
  accentColor: string;
  onTextModelChange: (model: string) => void;
  onImageModelChange: (model: string) => void;
  onTestConnection: (apiKey: string) => void;
  isTestingConnection: boolean;
  connectionStatus: 'idle' | 'success' | 'error';
  showDeepResearch?: boolean;
  deepResearchModel?: string;
  deepResearchModels?: ModelOption[];
  onDeepResearchModelChange?: (model: string) => void;
  videoModel?: string;
  videoModels?: ModelOption[];
  onVideoModelChange?: (model: string) => void;
}

function getTestPrompt(modelType: 'text' | 'image' | 'video'): string {
  if (modelType === 'text') return 'Say "Hello" in one word only.';
  if (modelType === 'image') return 'Generate a simple blue circle on white background.';
  return 'Generate a 3-second video of a calm ocean wave.';
}

export function ProviderCard({
  provider,
  title,
  icon,
  isConnected,
  keySource,
  isAdmin,
  textModel,
  imageModel,
  textModels,
  imageModels,
  accentColor,
  onTextModelChange,
  onImageModelChange,
  onTestConnection,
  isTestingConnection,
  connectionStatus,
  showDeepResearch = false,
  deepResearchModel,
  deepResearchModels,
  onDeepResearchModelChange,
  videoModel,
  videoModels,
  onVideoModelChange,
}: ProviderCardProps) {
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [modelTestStatus, setModelTestStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const [hoveringModel, setHoveringModel] = useState<string | null>(null);
  const [testAllSteps, setTestAllSteps] = useState<TestAllStep[]>([]);
  const [isTestingAll, setIsTestingAll] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const testAllAbortRef = useRef<AbortController | null>(null);

  const { mutateAsync: sendChat } = useAIChat();
  const { toast } = useToast();

  // Auto-dismiss the Test All panel after 3s if all passed
  useEffect(() => {
    if (!isTestingAll && testAllSteps.length > 0) {
      const allPassed = testAllSteps.every(s => s.status === 'success');
      if (allPassed) {
        const timer = setTimeout(() => setTestAllSteps([]), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isTestingAll, testAllSteps]);

  const cancelTest = (modelValue: string) => {
    abortControllerRef.current?.abort();
    setTestingModel(null);
    setModelTestStatus(prev => ({ ...prev, [modelValue]: null }));
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
      promise.then(
        (value) => { clearTimeout(timer); resolve(value); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });

  const handleTestModel = async (modelValue: string, modelType: 'text' | 'image' | 'video') => {
    if (!isConnected) {
      toast({ title: 'Provider Not Connected', description: 'Please configure the API key in Supabase secrets.', variant: 'destructive' });
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setTestingModel(modelValue);
    setModelTestStatus(prev => ({ ...prev, [modelValue]: null }));

    try {
      const chatPromise = sendChat({ message: getTestPrompt(modelType), provider, model: modelValue, mode: modelType });
      const timeoutMs = modelType === 'video' ? 150_000 : 60_000;
      if (modelType === 'image' || modelType === 'video') {
        await withTimeout(chatPromise, timeoutMs, 'Test timed out — the model may be overloaded. Please try again later.');
      } else {
        await chatPromise;
      }
      if (controller.signal.aborted) return;
      setModelTestStatus(prev => ({ ...prev, [modelValue]: 'success' }));
      toast({ title: 'Model Test Passed', description: `${modelValue} is working correctly!` });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return;
      setModelTestStatus(prev => ({ ...prev, [modelValue]: 'error' }));
      toast({ title: 'Model Test Failed', description: error instanceof Error ? error.message : 'Model test failed', variant: 'destructive' });
    } finally {
      if (!controller.signal.aborted) setTestingModel(null);
    }
  };

  const handleTestAll = async () => {
    if (!isConnected) return;

    const steps: TestAllStep[] = [
      { label: 'General Reasoning', modelValue: textModel, modelType: 'text', status: 'pending' },
      ...(showDeepResearch && deepResearchModel
        ? [{ label: 'Deep Research', modelValue: deepResearchModel, modelType: 'text' as const, status: 'pending' as const }]
        : []),
      { label: 'Image Generation', modelValue: imageModel, modelType: 'image', status: 'pending' },
      ...(videoModel && videoModels
        ? [{ label: 'Video Generation', modelValue: videoModel, modelType: 'video' as const, status: 'pending' as const }]
        : []),
    ];

    setTestAllSteps(steps);
    setIsTestingAll(true);
    const controller = new AbortController();
    testAllAbortRef.current = controller;

    for (let i = 0; i < steps.length; i++) {
      if (controller.signal.aborted) break;
      setTestAllSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
      try {
        const chatPromise = sendChat({ message: getTestPrompt(steps[i].modelType), provider, model: steps[i].modelValue, mode: steps[i].modelType });
        const timeoutMs = steps[i].modelType === 'video' ? 150_000 : 60_000;
        if (steps[i].modelType === 'image' || steps[i].modelType === 'video') {
          await withTimeout(chatPromise, timeoutMs, 'Test timed out — the model may be overloaded. Please try again later.');
        } else {
          await chatPromise;
        }
        if (controller.signal.aborted) break;
        setTestAllSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'success' } : s));
        setModelTestStatus(prev => ({ ...prev, [steps[i].modelValue]: 'success' }));
      } catch (err) {
        if (controller.signal.aborted) break;
        const msg = err instanceof Error ? err.message : 'Failed';
        setTestAllSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'error', error: msg } : s));
        setModelTestStatus(prev => ({ ...prev, [steps[i].modelValue]: 'error' }));
      }
    }
    setIsTestingAll(false);
  };

  const cancelTestAll = () => {
    testAllAbortRef.current?.abort();
    setIsTestingAll(false);
    setTestAllSteps([]);
  };

  return (
    <Card className={cn('transition-all duration-300 border-2 shadow-md', isConnected ? accentColor : 'border-muted')}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 w-full flex-wrap">
          <div className="p-2 rounded-lg bg-primary/10">{icon}</div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {title}
              {connectionStatus === 'error' ? (
                <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                  <XCircle className="h-3 w-3 mr-1" />Failed
                </Badge>
              ) : isConnected ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  <span className="relative flex h-2 w-2 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">Not Connected</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {provider === 'openai' ? 'Integrated OpenAI models' : 'Integrated Gemini models'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isTestingAll ? (
              <Button variant="ghost" size="sm" onClick={cancelTestAll} className="text-destructive hover:text-destructive text-xs gap-1">
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleTestAll} disabled={!isConnected} className="text-xs gap-1">
                <PlayCircle className="h-3.5 w-3.5" /> Test All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <TestAllPanel steps={testAllSteps} isTestingAll={isTestingAll} />

        {/* API Key — admin-only editor (falls back to read-only when non-admin) */}
        <ApiKeyEditor provider={provider} keySource={keySource} isAdmin={isAdmin} />

        <ProviderModelSelectors
          textModel={textModel}
          imageModel={imageModel}
          textModels={textModels}
          imageModels={imageModels}
          onTextModelChange={onTextModelChange}
          onImageModelChange={onImageModelChange}
          showDeepResearch={showDeepResearch}
          deepResearchModel={deepResearchModel}
          deepResearchModels={deepResearchModels}
          onDeepResearchModelChange={onDeepResearchModelChange}
          videoModel={videoModel}
          videoModels={videoModels}
          onVideoModelChange={onVideoModelChange}
          testButton={{
            testingModel,
            hoveringModel,
            modelTestStatus,
            isConnected,
            onTest: handleTestModel,
            onCancel: cancelTest,
            onHoverStart: setHoveringModel,
            onHoverEnd: () => setHoveringModel(null),
          }}
        />
      </CardContent>
    </Card>
  );
}
