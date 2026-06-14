"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { LLMSettings } from '@/hooks/useLLMSettings';
import { useProviderKeyStatus, hasProviderKey } from '@/hooks/useProviderKeyStatus';

interface ProviderStatusProps {
  settings: LLMSettings | null;
}

export function ProviderStatus({ settings }: ProviderStatusProps) {
  const { data: keyStatus } = useProviderKeyStatus();

  const providers = [
    {
      id: 'openai',
      name: 'OpenAI',
      connected: hasProviderKey(keyStatus?.openai),
      activeFor: [
        settings?.active_text_provider === 'openai' && 'Text',
        settings?.active_deep_research_provider === 'openai' && 'Research',
      ].filter(Boolean),
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      connected: hasProviderKey(keyStatus?.gemini),
      activeFor: [
        settings?.active_text_provider === 'gemini' && 'Text',
      ].filter(Boolean),
    },
    {
      id: 'claude',
      name: 'Anthropic Claude',
      connected: hasProviderKey(keyStatus?.claude),
      activeFor: [
        settings?.active_text_provider === 'claude' && 'Text',
      ].filter(Boolean),
    },
    {
      id: 'fal',
      name: 'fal.ai',
      connected: hasProviderKey(keyStatus?.fal),
      // fal is the sole image + video engine app-wide.
      activeFor: ['Image', 'Video'],
    },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-emerald-500" />
            Provider Status
          </CardTitle>
          <Link href="/settings?tab=llm">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Configure
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {provider.connected ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{provider.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {provider.connected && provider.activeFor.length > 0 ? (
                provider.activeFor.map((capability) => (
                  <Badge 
                    key={capability as string} 
                    variant="secondary" 
                    className="text-xs px-1.5 py-0"
                  >
                    {capability}
                  </Badge>
                ))
              ) : (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${provider.connected ? 'text-muted-foreground' : 'text-amber-800 border-amber-300 dark:text-amber-300 dark:border-amber-800'}`}
                >
                  {provider.connected ? 'Standby' : 'Not Connected'}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
