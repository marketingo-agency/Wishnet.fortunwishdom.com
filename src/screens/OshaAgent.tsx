"use client";

import React, { useState } from 'react';
import { MessageSquare, Settings2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OshaHeader } from '@/components/osha/OshaHeader';
import { OshaChat } from '@/components/osha/OshaChat';
import { OshaSettings } from '@/components/osha/OshaSettings';
import { useOshaSettings, useOshaMessages, DEFAULT_OSHA_SETTINGS } from '@/hooks/useOsha';
import { useAgentSettings } from '@/hooks/useAgentSettings';

type TabValue = 'chat' | 'settings';

const TABS: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: 'chat', label: 'Chat', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'settings', label: 'Settings', icon: <Settings2 className="h-4 w-4" /> },
];

export default function OshaAgent() {
  const [activeTab, setActiveTab] = useState<TabValue>('chat');
  const { data: settings = DEFAULT_OSHA_SETTINGS, isLoading: loadingSettings } = useOshaSettings();
  const { data: agentSettings, isLoading: loadingAgentSettings } = useAgentSettings('osha');
  const { data: messages = [], isLoading: isLoadingMessages, refetch } = useOshaMessages();

  const isInactive = !loadingAgentSettings && agentSettings && !agentSettings.is_active;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] relative">
      {/* Header */}
      <OshaHeader
        mode={settings.default_mode}
        isConnected={!isInactive}
      />

      {/* Tab bar — sky-branded underline style */}
      <div className="flex items-center gap-0 border-b border-border mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
              activeTab === tab.value
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-200',
            activeTab === 'chat' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
        >
          <OshaChat
            messages={messages}
            settings={settings}
            isLoadingMessages={isLoadingMessages}
            onMessagesChange={() => refetch()}
          />
        </div>

        <div
          className={cn(
            'absolute inset-0 overflow-y-auto transition-opacity duration-200',
            activeTab === 'settings' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
        >
          {!loadingSettings && <OshaSettings settings={settings} />}
        </div>
      </div>

      {/* Inactive overlay */}
      {isInactive && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 z-10">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-1">Osha is Inactive</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Osha has been deactivated. An administrator can re-enable it in the agent settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
