import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2, XCircle, Loader2, Play,
  X, PlayCircle, AlertCircle, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChat } from '@/hooks/useLLMSettings';
import { useToast } from '@/hooks/use-toast';

interface ModelOption {
  value: string;
  label: string;
  description: string;
}

interface ProviderCardProps {
  provider: 'openai' | 'gemini';
  title: string;
  icon: React.ReactNode;
  isConnected: boolean;
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

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface TestAllStep {
  label: string;
  modelValue: string;
  modelType: 'text' | 'image' | 'video';
  status: StepStatus;
  error?: string;
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

  // Test All state
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

  // Wraps a promise with a client-side timeout, properly clearing the timer on settle
  // Using manual Promise wiring (not Promise.race) to avoid an unhandled rejection from
  // the dangling setTimeout promise that can trigger React's error boundary
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
      const chatPromise = sendChat({
        message: getTestPrompt(modelType),
        provider,
        model: modelValue,
        mode: modelType,
      });

      // Apply a client-side timeout for image/video to catch edge function timeouts early
      // Video models (e.g. Veo 3.1) can take up to 150s — match the edge function's polling budget
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
      toast({
        title: 'Model Test Failed',
        description: error instanceof Error ? error.message : 'Model test failed',
        variant: 'destructive',
      });
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
        const chatPromise = sendChat({
          message: getTestPrompt(steps[i].modelType),
          provider,
          model: steps[i].modelValue,
          mode: steps[i].modelType,
        });

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

  

  // Reusable test button renderer
  const renderTestButton = (modelValue: string, modelType: 'text' | 'image' | 'video') => {
    const isRunning = testingModel === modelValue;
    const isHovering = hoveringModel === modelValue;
    const status = modelTestStatus[modelValue];

    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          if (isRunning) {
            cancelTest(modelValue);
          } else {
            handleTestModel(modelValue, modelType);
          }
        }}
        onMouseEnter={() => setHoveringModel(modelValue)}
        onMouseLeave={() => setHoveringModel(null)}
        disabled={!isConnected && !isRunning}
        className={cn(
          'shrink-0 transition-all',
          isRunning && isHovering && 'border-destructive/50 text-destructive hover:bg-destructive/10',
          status === 'success' && !isRunning && 'border-green-300 text-green-600',
          status === 'error' && !isRunning && 'border-destructive/40 text-destructive',
        )}
        title={isRunning ? 'Cancel test' : 'Test this model'}
      >
        {isRunning ? (
          isHovering
            ? <X className="h-4 w-4" />
            : <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : status === 'error' ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
    );
  };

  const completedSteps = testAllSteps.filter(s => s.status === 'success' || s.status === 'error').length;
  const progressValue = testAllSteps.length > 0 ? (completedSteps / testAllSteps.length) * 100 : 0;

  return (
    <Card
      className={cn(
        'transition-all duration-300 border-2 shadow-md',
        isConnected ? accentColor : 'border-muted'
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 w-full flex-wrap">
          <div className="p-2 rounded-lg bg-primary/10">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {title}
              {connectionStatus === 'error' ? (
                <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
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
                <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                  Not Connected
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {provider === 'openai' ? 'Integrated OpenAI models' : 'Integrated Gemini models'}
            </p>
          </div>

          {/* Test All button */}
          <div className="ml-auto flex items-center gap-2">
            {isTestingAll ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelTestAll}
                className="text-destructive hover:text-destructive text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAll}
                disabled={!isConnected}
                className="text-xs gap-1"
              >
                <PlayCircle className="h-3.5 w-3.5" /> Test All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Test All progress panel */}
        {testAllSteps.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            {testAllSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="shrink-0">
                  {step.status === 'pending' && <Circle className="h-3 w-3 text-muted-foreground/40" />}
                {step.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-warning" />}
                  {step.status === 'success' && <CheckCircle2 className="h-3 w-3 text-success" />}
                  {step.status === 'error' && <AlertCircle className="h-3 w-3 text-destructive" />}
                </span>
                <span className={cn(
                  'flex-1 font-medium',
                  step.status === 'pending' && 'text-muted-foreground',
                  step.status === 'running' && 'text-foreground',
                  step.status === 'success' && 'text-green-700',
                  step.status === 'error' && 'text-destructive',
                )}>
                  {step.label}
                </span>
                <span className="text-muted-foreground font-mono truncate max-w-[120px]">
                  {step.modelValue}
                </span>
                <span className={cn(
                  'shrink-0 font-medium',
                  step.status === 'pending' && 'text-muted-foreground/60',
                  step.status === 'running' && 'text-yellow-600',
                  step.status === 'success' && 'text-green-600',
                  step.status === 'error' && 'text-destructive',
                )}>
                  {step.status === 'pending' && '–'}
                  {step.status === 'running' && 'Running…'}
                  {step.status === 'success' && 'Passed'}
                  {step.status === 'error' && 'Failed'}
                </span>
              </div>
            ))}
            <Progress value={progressValue} className="h-1 mt-2" />
            {!isTestingAll && completedSteps === testAllSteps.length && (
              <p className={cn(
                'text-xs font-medium text-center pt-0.5',
                testAllSteps.every(s => s.status === 'success') ? 'text-emerald-600' : 'text-amber-600',
              )}>
                {testAllSteps.every(s => s.status === 'success')
                  ? `All ${testAllSteps.length} models passed ✓`
                  : `${testAllSteps.filter(s => s.status === 'success').length} passed · ${testAllSteps.filter(s => s.status === 'error').length} failed`
                }
              </p>
            )}
          </div>
        )}

        {/* API Key Status — SEC-001: keys managed via environment variables only */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">API Key</Label>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured via environment secret
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not configured
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isConnected
              ? `${provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'} is set in Supabase Edge Function secrets.`
              : `Add ${provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'} to Supabase Edge Function secrets in the dashboard.`}
          </p>
        </div>

        {/* General Reasoning Model Select */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">General Reasoning</Label>
          <div className="flex gap-2">
            <Select value={textModel} onValueChange={onTextModelChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {textModels.map((model) => (
                  <SelectItem key={model.value} value={model.value} className="py-2.5">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{model.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderTestButton(textModel, 'text')}
          </div>
        </div>

        {/* Deep Research Model Select (OpenAI only) */}
        {showDeepResearch && deepResearchModels && onDeepResearchModelChange && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Deep Research</Label>
            <div className="flex gap-2">
              <Select value={deepResearchModel} onValueChange={onDeepResearchModelChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a deep research model" />
                </SelectTrigger>
                <SelectContent>
                  {deepResearchModels.map((model) => (
                    <SelectItem key={model.value} value={model.value} className="py-2.5">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{model.label}</span>
                        <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {deepResearchModel && renderTestButton(deepResearchModel, 'text')}
            </div>
          </div>
        )}

        {/* Image Generation Model Select */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Image Generation</Label>
          <div className="flex gap-2">
            <Select value={imageModel} onValueChange={onImageModelChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select an image model" />
              </SelectTrigger>
              <SelectContent>
                {imageModels.map((model) => (
                  <SelectItem key={model.value} value={model.value} className="py-2.5">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{model.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderTestButton(imageModel, 'image')}
          </div>
        </div>

        {/* Video Generation Model Select */}
        {videoModels && onVideoModelChange && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Video Generation</Label>
            <div className="flex gap-2">
              <Select value={videoModel} onValueChange={onVideoModelChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a video model" />
                </SelectTrigger>
                <SelectContent>
                  {videoModels.map((model) => (
                    <SelectItem key={model.value} value={model.value} className="py-2.5">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{model.label}</span>
                        <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {videoModel && renderTestButton(videoModel, 'video')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
