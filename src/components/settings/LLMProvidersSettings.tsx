"use client";

import { useState, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2, Settings2, ArrowRight, CheckCircle2, AlertCircle, Circle, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useLLMSettings,
  useUpdateLLMSettings,
  useTestConnection,
  useAIChat,
  OPENAI_TEXT_MODELS,
  OPENAI_IMAGE_MODELS,
  OPENAI_DEEP_RESEARCH_MODELS,
  OPENAI_VIDEO_MODELS,
  GEMINI_TEXT_MODELS,
  GEMINI_IMAGE_MODELS,
  GEMINI_VIDEO_MODELS,
  FAL_TEXT_MODELS,
  FAL_IMAGE_MODELS,
  FAL_VIDEO_MODELS,
} from '@/hooks/useLLMSettings';
import { useProviderKeyStatus, hasProviderKey } from '@/hooks/useProviderKeyStatus';
import { useAuth } from '@/contexts/AuthContext';
import { ProviderCard } from './ProviderCard';

// Provider icons as SVG
const FalIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M8 8h8v2H10v2h4v2h-4v4H8V8z" fill="currentColor" />
  </svg>
);

const OpenAIIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const GeminiIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285F4" />
        <stop offset="50%" stopColor="#9B72CB" />
        <stop offset="100%" stopColor="#D96570" />
      </linearGradient>
    </defs>
    <path
      d="M12 2C12.5 7 17 11.5 22 12C17 12.5 12.5 17 12 22C11.5 17 7 12.5 2 12C7 11.5 11.5 7 12 2Z"
      fill="url(#gemini-gradient)"
    />
  </svg>
);

export function LLMProvidersSettings() {
  const { data: settings, isLoading } = useLLMSettings();
  const updateSettings = useUpdateLLMSettings();
  const testConnection = useTestConnection();
  const { mutateAsync: sendAIChat } = useAIChat();
  const { data: keyStatus } = useProviderKeyStatus();
  const { isAdmin } = useAuth();
  const hasOpenAI = hasProviderKey(keyStatus?.openai);
  const hasGemini = hasProviderKey(keyStatus?.gemini);
  const hasFal = hasProviderKey(keyStatus?.fal);

  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [falStatus, setFalStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testingProvider, setTestingProvider] = useState<'openai' | 'gemini' | 'fal' | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const verifyAbortRef = useRef<AbortController | null>(null);
  const [verificationSteps, setVerificationSteps] = useState<Array<{
    capability: string;
    provider: string;
    model: string;
    status: 'pending' | 'running' | 'success' | 'error';
    error?: string;
    configOnly?: boolean;
  }>>([]);

  const handleUpdateSetting = async (key: string, value: unknown) => {
    try {
      // Reset verification status when active provider settings change
      if (key.startsWith('active_')) {
        setVerificationStatus('idle');
      }
      await updateSettings.mutateAsync({ [key]: value });
      toast.success('Setting updated');
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  const PROVIDER_LABELS: Record<string, string> = { openai: 'OpenAI', gemini: 'Gemini', fal: 'fal.ai' };

  const handleTestConnection = async (provider: 'openai' | 'gemini' | 'fal', apiKey: string) => {
    setTestingProvider(provider);

    try {
      await testConnection.mutateAsync({ provider, apiKey: apiKey || '' });

      if (provider === 'openai') setOpenaiStatus('success');
      else if (provider === 'gemini') setGeminiStatus('success');
      else setFalStatus('success');

      toast.success(`${PROVIDER_LABELS[provider]} connection verified!`);
    } catch (error) {
      if (provider === 'openai') setOpenaiStatus('error');
      else if (provider === 'gemini') setGeminiStatus('error');
      else setFalStatus('error');

      toast.error(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setTestingProvider(null);
    }
  };

  // SEC-001: API keys are now managed exclusively via Supabase edge function
  // environment variables (OPENAI_API_KEY, GEMINI_API_KEY). The plaintext
  // columns have been dropped from llm_settings. Key presence is checked
  // via the 'check-keys' action in the ai-chat edge function.

  const updateStep = (index: number, update: Partial<typeof verificationSteps[0]>) => {
    setVerificationSteps(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s));
  };

  const cancelVerification = () => {
    verifyAbortRef.current?.abort();
    setIsVerifying(false);
    setVerificationSteps(prev =>
      prev.map(s => s.status === 'running' ? { ...s, status: 'pending' } : s)
    );
    setVerificationStatus('idle');
    toast.info('Verification cancelled');
  };

  const handleVerifySettings = async () => {
    if (!settings) return;

    const textProvider = settings.active_text_provider || 'openai';
    const textModel = textProvider === 'openai'
      ? (settings.openai_text_model || 'gpt-4o')
      : (settings.gemini_text_model || 'gemini-2.5-flash');
    const hasTextKey = textProvider === 'openai' ? hasOpenAI : hasGemini;

    const imageProvider = settings.active_image_provider || 'openai';
    const imageModel = imageProvider === 'openai'
      ? (settings.openai_image_model || 'gpt-image-1')
      : (settings.gemini_image_model || 'gemini-2.5-flash-image');
    const hasImageKey = imageProvider === 'openai' ? hasOpenAI : hasGemini;

    const deepResearchProvider = settings.active_deep_research_provider || 'openai';
    const hasDeepResearch = deepResearchProvider === 'openai' && hasOpenAI;
    const deepModel = settings.openai_deep_research_model || 'o3-deep-research';

    const videoProvider = settings.active_video_provider || 'openai';
    const videoModel = videoProvider === 'openai'
      ? (settings.openai_video_model || 'sora-2')
      : (settings.gemini_video_model || 'veo-3.1-generate-preview');
    const hasVideoKey = videoProvider === 'openai' ? hasOpenAI : hasGemini;

    const initialSteps = [
      { capability: 'General Reasoning', provider: textProvider, model: textModel, status: 'pending' as const },
      { capability: 'Image Generation', provider: imageProvider, model: imageModel, status: 'pending' as const },
      ...(hasDeepResearch ? [{ capability: 'Deep Research', provider: 'openai', model: deepModel, status: 'pending' as const, configOnly: true }] : []),
      { capability: 'Video Generation', provider: videoProvider, model: videoModel, status: 'pending' as const },
    ];

    setVerificationSteps(initialSteps);
    setVerificationStatus('idle');
    setIsVerifying(true);

    const controller = new AbortController();
    verifyAbortRef.current = controller;

    const results: { success: boolean; error?: string }[] = [];

    try {
      // Step 0: General Reasoning
      setVerificationSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'running' } : s));
      if (hasTextKey) {
        try {
          await sendAIChat({ message: 'Say "verified" in one word', provider: textProvider as 'openai' | 'gemini', model: textModel, mode: 'text' });
          if (controller.signal.aborted) return;
          updateStep(0, { status: 'success' });
          results.push({ success: true });
        } catch (err) {
          if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
          updateStep(0, { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
          results.push({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      } else {
        updateStep(0, { status: 'error', error: 'No API key configured' });
        results.push({ success: false, error: 'No API key configured' });
      }

      if (controller.signal.aborted) return;

      // Step 1: Image Generation
      setVerificationSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'running' } : s));
      if (hasImageKey) {
        try {
          await sendAIChat({ message: 'Generate a simple blue circle on a white background.', provider: imageProvider as 'openai' | 'gemini', model: imageModel, mode: 'image' });
          if (controller.signal.aborted) return;
          updateStep(1, { status: 'success' });
          results.push({ success: true });
        } catch (err) {
          if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
          updateStep(1, { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
          results.push({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      } else {
        updateStep(1, { status: 'error', error: 'No API key configured' });
        results.push({ success: false, error: 'No API key configured' });
      }

      if (controller.signal.aborted) return;

      // Step 2: Deep Research (config check only)
      const deepResearchStepIndex = initialSteps.findIndex(s => s.capability === 'Deep Research');
      if (hasDeepResearch && deepResearchStepIndex !== -1) {
        setVerificationSteps(prev => prev.map((s, i) => i === deepResearchStepIndex ? { ...s, status: 'running' } : s));
        await new Promise(r => setTimeout(r, 300));
        if (controller.signal.aborted) return;
        updateStep(deepResearchStepIndex, { status: 'success' });
        results.push({ success: true });
      }

      if (controller.signal.aborted) return;

      // Step 3: Video Generation
      const videoStepIndex = initialSteps.findIndex(s => s.capability === 'Video Generation');
      if (videoStepIndex !== -1) {
        setVerificationSteps(prev => prev.map((s, i) => i === videoStepIndex ? { ...s, status: 'running' } : s));
        if (hasVideoKey) {
          try {
            const chatPromise = sendAIChat({
              message: 'Generate a 3-second video of a blue circle bouncing on a white background.',
              provider: videoProvider as 'openai' | 'gemini',
              model: videoModel,
              mode: 'video',
            });
            await Promise.race([
              chatPromise,
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Test timed out — video generation can take up to 2.5 minutes')), 150_000)
              ),
            ]);
            if (controller.signal.aborted) return;
            updateStep(videoStepIndex, { status: 'success' });
            results.push({ success: true });
          } catch (err) {
            if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
            updateStep(videoStepIndex, { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
            results.push({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
          }
        } else {
          updateStep(videoStepIndex, { status: 'error', error: 'No API key configured' });
          results.push({ success: false, error: 'No API key configured' });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        setVerificationStatus('success');
        toast.success(`All ${successCount} capabilities verified!`);
      } else {
        setVerificationStatus('error');
        toast.warning(`${successCount} passed · ${failCount} failed`);
      }
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return;
      setVerificationStatus('error');
      toast.error('Verification failed', { description: error instanceof Error ? error.message : 'Unknown error occurred' });
    } finally {
      if (!controller.signal.aborted) setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6 h-full">
      {/* Left Column - Provider Cards (60%) */}
      <div className="xl:col-span-3 space-y-4 sm:space-y-6">
        {/* OpenAI Card */}
        <ProviderCard
          provider="openai"
          title="OpenAI"
          icon={<OpenAIIcon />}
          isConnected={hasOpenAI}
          keySource={keyStatus?.openai ?? 'none'}
          isAdmin={isAdmin}
          textModel={settings?.openai_text_model || 'gpt-4o'}
          imageModel={settings?.openai_image_model || 'gpt-image-1'}
          textModels={OPENAI_TEXT_MODELS}
          imageModels={OPENAI_IMAGE_MODELS}
          accentColor="border-emerald-500/50"
          onTextModelChange={(model) => handleUpdateSetting('openai_text_model', model)}
          onImageModelChange={(model) => handleUpdateSetting('openai_image_model', model)}
          onTestConnection={(apiKey) => handleTestConnection('openai', apiKey)}
          isTestingConnection={testingProvider === 'openai'}
          connectionStatus={openaiStatus}
          showDeepResearch={true}
          deepResearchModel={settings?.openai_deep_research_model || 'o3-deep-research'}
          deepResearchModels={OPENAI_DEEP_RESEARCH_MODELS}
          onDeepResearchModelChange={(model) => handleUpdateSetting('openai_deep_research_model', model)}
          videoModel={settings?.openai_video_model || 'sora-2'}
          videoModels={OPENAI_VIDEO_MODELS}
          onVideoModelChange={(model) => handleUpdateSetting('openai_video_model', model)}
        />

        {/* Gemini Card */}
        <ProviderCard
          provider="gemini"
          title="Google Gemini"
          icon={<GeminiIcon />}
          isConnected={hasGemini}
          keySource={keyStatus?.gemini ?? 'none'}
          isAdmin={isAdmin}
          textModel={settings?.gemini_text_model || 'gemini-2.5-pro'}
          imageModel={settings?.gemini_image_model || 'gemini-2.5-flash-image'}
          textModels={GEMINI_TEXT_MODELS}
          imageModels={GEMINI_IMAGE_MODELS}
          accentColor="border-blue-500/50"
          onTextModelChange={(model) => handleUpdateSetting('gemini_text_model', model)}
          onImageModelChange={(model) => handleUpdateSetting('gemini_image_model', model)}
          onTestConnection={(apiKey) => handleTestConnection('gemini', apiKey)}
          isTestingConnection={testingProvider === 'gemini'}
          connectionStatus={geminiStatus}
          showDeepResearch={false}
          videoModel={settings?.gemini_video_model || 'veo-2'}
          videoModels={GEMINI_VIDEO_MODELS}
          onVideoModelChange={(model) => handleUpdateSetting('gemini_video_model', model)}
        />

        {/* fal.ai Card */}
        <ProviderCard
          provider="fal"
          title="fal.ai"
          icon={<FalIcon />}
          isConnected={hasFal}
          keySource={keyStatus?.fal ?? 'none'}
          isAdmin={isAdmin}
          textModel={settings?.fal_text_model || 'openrouter/router'}
          imageModel={settings?.fal_image_model || 'fal-ai/flux-pro/v1.1-ultra'}
          textModels={FAL_TEXT_MODELS}
          imageModels={FAL_IMAGE_MODELS}
          accentColor="border-purple-500/50"
          onTextModelChange={(model) => handleUpdateSetting('fal_text_model', model)}
          onImageModelChange={(model) => handleUpdateSetting('fal_image_model', model)}
          onTestConnection={(apiKey) => handleTestConnection('fal', apiKey)}
          isTestingConnection={testingProvider === 'fal'}
          connectionStatus={falStatus}
          showDeepResearch={false}
          videoModel={settings?.fal_video_model || 'fal-ai/kling-video/v3/pro/text-to-video'}
          videoModels={FAL_VIDEO_MODELS}
          onVideoModelChange={(model) => handleUpdateSetting('fal_video_model', model)}
        />

        {/* Active Provider Selection - moved to right column */}
      </div>

      {/* Right Column - Nexus Link + Active Provider Selection (40%) */}
      <div className="xl:col-span-2 space-y-4 sm:space-y-6">
        {/* Nexus Link Card */}
        <Link href="/ai-agents/nexus" className="block">
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-lime-300 bg-gradient-to-br from-lime-50 via-white to-green-50 overflow-hidden relative">
            {/* Decorative glow effect */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-lime-500/20 rounded-full blur-3xl group-hover:bg-lime-500/30 transition-all" />
            
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-lg">
                  <Settings2 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Test with Nexus</CardTitle>
                  <CardDescription>LLM Control Center</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative">
              <p className="text-sm text-muted-foreground mb-4">
                Test your LLM provider connections live, chat with AI models, generate images, and configure all AI agent settings in one place.
              </p>
              <div className="flex items-center text-lime-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                Open Nexus <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Active Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Provider Selection</CardTitle>
            <CardDescription>
              Choose which provider to use for each AI capability across the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>For General Reasoning</Label>
                <Select
                  value={settings?.active_text_provider || 'openai'}
                  onValueChange={(v) => handleUpdateSetting('active_text_provider', v)}
                  disabled={!hasOpenAI && !hasGemini && !hasFal}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai" disabled={!hasOpenAI}>OpenAI</SelectItem>
                    <SelectItem value="gemini" disabled={!hasGemini}>Google Gemini</SelectItem>
                    <SelectItem value="fal" disabled={!hasFal}>fal.ai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>For Deep Research</Label>
                <Select
                  value={settings?.active_deep_research_provider || 'openai'}
                  onValueChange={(v) => handleUpdateSetting('active_deep_research_provider', v)}
                  disabled={!hasOpenAI}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai" disabled={!hasOpenAI}>
                      OpenAI
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only OpenAI supports deep research</p>
              </div>

              <div className="space-y-2">
                <Label>For Image Generation</Label>
                <Select
                  value={settings?.active_image_provider || 'openai'}
                  onValueChange={(v) => handleUpdateSetting('active_image_provider', v)}
                  disabled={!hasOpenAI && !hasGemini && !hasFal}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai" disabled={!hasOpenAI}>OpenAI</SelectItem>
                    <SelectItem value="gemini" disabled={!hasGemini}>Google Gemini</SelectItem>
                    <SelectItem value="fal" disabled={!hasFal}>fal.ai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>For Video Generation</Label>
                <Select
                  value={settings?.active_video_provider || 'openai'}
                  onValueChange={(v) => handleUpdateSetting('active_video_provider', v)}
                  disabled={!hasOpenAI && !hasGemini && !hasFal}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai" disabled={!hasOpenAI}>OpenAI</SelectItem>
                    <SelectItem value="gemini" disabled={!hasGemini}>Google Gemini</SelectItem>
                    <SelectItem value="fal" disabled={!hasFal}>fal.ai</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Requires paid API access (OpenAI Sora / Google Veo / fal.ai)</p>
              </div>
            </div>

            {/* Verify Settings Button */}
            <div className="pt-4 border-t space-y-3">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full transition-colors duration-300",
                  isVerifying && "border-destructive/50 bg-destructive/5 text-destructive hover:bg-destructive/10",
                  !isVerifying && verificationStatus === 'success' && "border-green-500 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800",
                  !isVerifying && verificationStatus === 'error' && "border-red-500 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                )}
                onClick={isVerifying ? cancelVerification : handleVerifySettings}
                disabled={!isVerifying && !hasOpenAI && !hasGemini}
              >
                {isVerifying ? (
                  <><X className="h-4 w-4 mr-2" />Cancel Verification</>
                ) : verificationStatus === 'success' ? (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Verified Successfully</>
                ) : verificationStatus === 'error' ? (
                  <><AlertCircle className="h-4 w-4 mr-2" />Verification Failed — Retry</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Verify Active Settings</>
                )}
              </Button>

              {/* Step Progress Panel */}
              {verificationSteps.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  {verificationSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {/* Status icon */}
                      <span className="shrink-0">
                        {step.status === 'pending' && <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />}
                        {step.status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />}
                        {step.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                        {step.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                      </span>

                      {/* Capability name */}
                      <span className={cn(
                        "font-medium w-24 sm:w-32 shrink-0",
                        step.status === 'pending' && "text-muted-foreground",
                        step.status === 'running' && "text-foreground",
                        step.status === 'success' && "text-green-700",
                        step.status === 'error' && "text-destructive",
                      )}>
                        {step.capability}
                        {step.configOnly && <span className="ml-1 font-normal opacity-60">(config)</span>}
                      </span>

                      {/* Provider / model */}
                      <span className="text-muted-foreground truncate flex-1">
                        {step.provider === 'openai' ? 'OpenAI' : 'Gemini'} · {step.model}
                      </span>

                      {/* Status label */}
                      <span className={cn(
                        "shrink-0 ml-auto",
                        step.status === 'pending' && "text-muted-foreground/60",
                        step.status === 'running' && "text-amber-500",
                        step.status === 'success' && "text-green-600",
                        step.status === 'error' && "text-destructive",
                      )}>
                        {step.status === 'pending' && 'Pending'}
                        {step.status === 'running' && 'Running…'}
                        {step.status === 'success' && 'Passed'}
                        {step.status === 'error' && (step.error ? `${step.error.slice(0, 28)}…` : 'Failed')}
                      </span>
                    </div>
                  ))}

                  {/* Progress bar */}
                  <Progress
                    value={(verificationSteps.filter(s => s.status === 'success' || s.status === 'error').length / verificationSteps.length) * 100}
                    className="h-1 mt-1"
                  />

                  {/* Summary row */}
                  {!isVerifying && verificationSteps.every(s => s.status === 'success' || s.status === 'error') && (
                    <p className={cn(
                      "text-xs font-medium pt-1 text-center",
                      verificationStatus === 'success' ? "text-green-600" : "text-amber-600"
                    )}>
                      {verificationStatus === 'success'
                        ? `All ${verificationSteps.length} capabilities verified ✓`
                        : `${verificationSteps.filter(s => s.status === 'success').length} passed · ${verificationSteps.filter(s => s.status === 'error').length} failed`}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Tests that your active provider selections are working correctly
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
