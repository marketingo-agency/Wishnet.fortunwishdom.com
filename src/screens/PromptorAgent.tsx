"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import type { OutputType } from '@/hooks/usePromptor';
import { Button } from '@/components/ui/button';
import { Wand2, Zap, History, Settings2 } from 'lucide-react';
import { PromptorHeader } from '@/components/promptor/PromptorHeader';
import { PromptorCreate } from '@/components/promptor/PromptorCreate';
import { PromptorOptimize } from '@/components/promptor/PromptorOptimize';
import { PromptorHistory } from '@/components/promptor/PromptorHistory';
import { PromptorSettings } from '@/components/promptor/PromptorSettings';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePromptorSettings, DEFAULT_SETTINGS, type PromptorOutput } from '@/hooks/usePromptor';
import { useAgentSettings } from '@/hooks/useAgentSettings';
import { usePromptorSession } from '@/hooks/usePromptorSession';
import { cn } from '@/lib/utils';

type TabValue = 'create' | 'optimize' | 'history' | 'settings';

const TABS: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: 'create', label: 'Create', icon: <Wand2 className="h-4 w-4" /> },
  { value: 'optimize', label: 'Optimize', icon: <Zap className="h-4 w-4" /> },
  { value: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
  { value: 'settings', label: 'Settings', icon: <Settings2 className="h-4 w-4" /> },
];

export default function PromptorAgent() {
  const router = useRouter();
  const { data: settings } = usePromptorSettings();
  const { data: agentSettings, isLoading: loadingAgentSettings } = useAgentSettings('promptor');
  const [lastOutput, setLastOutput] = useState<PromptorOutput | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('create');
  const effectiveSettings = settings || DEFAULT_SETTINGS;

  const { session, updateCreate, updateOptimize } = usePromptorSession();

  // Initialize output type from settings on first load (fresh session only)
  useEffect(() => {
    if (settings && session.create.brief === '' && !session.create.output && settings.default_output_type !== session.create.outputType) {
      updateCreate({ outputType: settings.default_output_type as OutputType });
    }
  }, [settings]);

  // Determine if Promptor is inactive based on DB settings
  const isInactive = agentSettings !== undefined && agentSettings !== null && !agentSettings.is_active;

  return (
    <div className="flex h-full p-0 relative">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">

        {/* Header */}
        <PromptorHeader
          lastHeartChunks={lastOutput?.retrieval_meta?.heart_chunks}
          lastBrainChunks={lastOutput?.retrieval_meta?.brain_chunks}
          isConnected
        />

        {/* Tab bar */}
        <div className="flex items-center gap-0 px-4 sm:px-6 border-b border-border/50 bg-muted/50/30 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                activeTab === tab.value
                  ? 'border-violet-500 text-violet-700'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable content — all panels always mounted, hidden via CSS */}
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 min-w-0 overflow-hidden max-w-5xl mx-auto">
            <div className={activeTab !== 'create' ? 'hidden' : ''}>
              <PromptorCreate
                settings={effectiveSettings}
                session={session.create}
                onUpdate={updateCreate}
                onOutputChange={setLastOutput}
              />
            </div>
            <div className={activeTab !== 'optimize' ? 'hidden' : ''}>
              <PromptorOptimize
                settings={effectiveSettings}
                session={session.optimize}
                onUpdate={updateOptimize}
                onOutputChange={setLastOutput}
              />
            </div>
            <div className={activeTab !== 'history' ? 'hidden' : ''}>
              <PromptorHistory />
            </div>
            <div className={activeTab !== 'settings' ? 'hidden' : ''}>
              <PromptorSettings />
            </div>
          </div>
        </ScrollArea>

      </div>

      {/* Inactive overlay — shown when Promptor is deactivated from Nexus */}
      {!loadingAgentSettings && isInactive && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-2xl">
          <div className="flex flex-col items-center gap-3 text-center px-6 max-w-xs">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">Promptor is Inactive</h2>
            <p className="text-sm text-muted-foreground">
              This agent has been deactivated. Go to Nexus to re-activate it.
            </p>
            <Button
              className="mt-2 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600"
              onClick={() => router.push('/ai-agents/nexus?tab=agents')}
            >
              Go to Nexus
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
