"use client";

/**
 * WhisperAgent — the AI Podcast Generator workspace.
 * Standard app shell mirroring the other agents, blue/indigo identity, 6 tabs.
 * Surfaces ship phase-by-phase.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mic,
  LayoutDashboard,
  Clapperboard,
  Library,
  Radio,
  AudioLines,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhisperSettingsTab } from '@/components/whisper/settings/WhisperSettingsTab';
import { WhisperVoicesTab } from '@/components/whisper/voices/WhisperVoicesTab';
import { WhisperStudioTab } from '@/components/whisper/studio/WhisperStudioTab';
import { WhisperEpisodesTab } from '@/components/whisper/episodes/WhisperEpisodesTab';
import { WhisperShowsTab } from '@/components/whisper/shows/WhisperShowsTab';
import { WhisperOverviewTab } from '@/components/whisper/overview/WhisperOverviewTab';

type WhisperTabId = 'overview' | 'studio' | 'episodes' | 'shows' | 'voices' | 'settings';

interface WhisperTab {
  id: WhisperTabId;
  label: string;
  icon: LucideIcon;
}

const TABS: WhisperTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'studio', label: 'Studio', icon: Clapperboard },
  { id: 'episodes', label: 'Episodes', icon: Library },
  { id: 'shows', label: 'Shows', icon: Radio },
  { id: 'voices', label: 'Voices', icon: AudioLines },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const TAB_IDS = TABS.map((t) => t.id) as string[];

export default function WhisperAgent() {
  const [activeTab, setActiveTab] = useState<WhisperTabId>('overview');

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('tab');
    if (param && TAB_IDS.includes(param)) setActiveTab(param as WhisperTabId);
  }, []);

  const selectTab = useCallback((id: WhisperTabId) => {
    setActiveTab(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', id);
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  const panel = useMemo(() => {
    switch (activeTab) {
      case 'studio':
        return <WhisperStudioTab />;
      case 'episodes':
        return <WhisperEpisodesTab />;
      case 'shows':
        return <WhisperShowsTab />;
      case 'voices':
        return <WhisperVoicesTab />;
      case 'settings':
        return <WhisperSettingsTab />;
      case 'overview':
      default:
        return <WhisperOverviewTab onNavigate={(t) => selectTab(t as WhisperTabId)} />;
    }
  }, [activeTab, selectTab]);

  return (
    <div className="flex h-full p-0">
      <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:rounded-2xl">
        {/* ── Header ── */}
        <div className="border-b px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 shadow-sm shadow-indigo-500/20 sm:p-3">
              <Mic className="h-6 w-6 text-white sm:h-7 sm:w-7" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Whisper</h1>
              <p className="text-sm text-muted-foreground">AI Podcast Generator</p>
            </div>
          </div>

          {/* ── Tab strip ── */}
          <nav
            role="tablist"
            aria-label="Whisper sections"
            className="mt-4 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls="whisper-tabpanel"
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Body ── */}
        <div id="whisper-tabpanel" role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
          {panel}
        </div>
      </div>
    </div>
  );
}
