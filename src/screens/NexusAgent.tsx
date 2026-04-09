"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { NexusHeader } from '@/components/nexus/NexusHeader';
import { NexusTabs, NexusTab } from '@/components/nexus/NexusTabs';
import { NexusConsole } from '@/components/nexus/NexusConsole';
import { QuickPrompts } from '@/components/nexus/QuickPrompts';
import { ProviderStatus } from '@/components/nexus/ProviderStatus';
import { AgentConfigGrid } from '@/components/nexus/AgentConfigGrid';
import { AgentConfigPanel } from '@/components/nexus/AgentConfigPanel';
import { PromptLibrary, Prompt } from '@/components/nexus/PromptLibrary';
import { PromptEditor } from '@/components/nexus/PromptEditor';
import { QuickPromptEditor } from '@/components/nexus/QuickPromptEditor';
import { QuickPrompt } from '@/hooks/useQuickPrompts';

export default function NexusAgent() {
  const searchParams = useSearchParams();
  const { data: settings, isLoading } = useLLMSettings();
  const [activeTab, setActiveTab] = useState<NexusTab>(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'prompts' || tabParam === 'agents' || tabParam === 'console') {
      return tabParam;
    }
    return 'console';
  });
  
  // Console state
  const [consolePrompt, setConsolePrompt] = useState('');
  const [consoleMode, setConsoleMode] = useState<'text' | 'image' | 'research'>('text');
  
  // Agents state
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // Prompts state
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedQuickPrompt, setSelectedQuickPrompt] = useState<QuickPrompt | null>(null);

  const handleSelectQuickPrompt = (prompt: string, mode: 'text' | 'image') => {
    setConsolePrompt(prompt);
    setConsoleMode(mode);
  };

  const handleTestPrompt = (content: string) => {
    setActiveTab('console');
    setConsolePrompt(content);
    setConsoleMode('text');
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full p-0">
      <div className="flex-1 flex flex-col min-h-0 bg-background rounded-xl sm:rounded-2xl border border-border shadow-sm m-0 sm:m-4 overflow-hidden">
        {/* Header */}
        <NexusHeader settings={settings || null} />
        
        {/* Tabs */}
        <NexusTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'console' && (
            <div className="h-full flex flex-col md:flex-row">
              {/* Left Column - Quick Actions */}
              <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border/50 p-2 sm:p-4 flex md:flex-col gap-2 sm:gap-4 overflow-x-auto md:overflow-y-auto shrink-0">
                <div className="min-w-[160px] md:min-w-0 shrink-0">
                  <ProviderStatus settings={settings || null} />
                </div>
                <div className="min-w-[200px] md:min-w-0 shrink-0">
                  <QuickPrompts onSelectPrompt={handleSelectQuickPrompt} />
                </div>
              </div>
              
              {/* Right Column - Console */}
              <div className="flex-1 p-3 sm:p-4 min-h-0">
                <NexusConsole 
                  settings={settings || null}
                  initialPrompt={consolePrompt}
                  initialMode={consoleMode}
                />
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="h-full flex flex-col lg:flex-row">
              {/* Left Column - Agent Grid */}
              <div className="flex-1 p-3 sm:p-4 overflow-auto">
                <AgentConfigGrid 
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={setSelectedAgentId}
                />
              </div>
              
              {/* Right Column - Config Panel (hidden on mobile when no agent selected) */}
              <div className={cn(
                "w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border/50 p-3 sm:p-4 shrink-0",
                !selectedAgentId && "hidden lg:block"
              )}>
                <AgentConfigPanel 
                  agentId={selectedAgentId}
                  settings={settings || null}
                />
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="h-full flex flex-col lg:flex-row">
              {/* Left - Library */}
              <div className="flex-1 p-3 sm:p-4 overflow-auto">
                <PromptLibrary 
                  onSelectPrompt={(prompt) => {
                    setSelectedPrompt(prompt);
                    setSelectedQuickPrompt(null);
                  }}
                  onSelectQuickPrompt={(qp) => {
                    setSelectedQuickPrompt(qp);
                    setSelectedPrompt(null);
                  }}
                  selectedPromptId={selectedPrompt?.id || null}
                />
              </div>
              
              {/* Right - Editor (hidden on mobile when nothing selected) */}
              <div className={cn(
                "w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border/50 p-3 sm:p-4 shrink-0",
                !selectedPrompt && !selectedQuickPrompt && "hidden lg:block"
              )}>
                {selectedQuickPrompt ? (
                  <QuickPromptEditor 
                    prompt={selectedQuickPrompt}
                    onClose={() => setSelectedQuickPrompt(null)}
                  />
                ) : (
                  <PromptEditor 
                    prompt={selectedPrompt}
                    onTestPrompt={handleTestPrompt}
                  />
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
