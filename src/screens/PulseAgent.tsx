"use client";

/**
 * PulseAgent — the Social Media Command Center workspace.
 * Standard app shell (flex h-full p-0 → bg-card rounded-2xl border → header + body),
 * mirroring the other AI-agent pages, with an 8-tab top strip. Each tab's surface
 * ships phase-by-phase; Settings reuses the existing PulseSettings component.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Share2,
  LayoutDashboard,
  PenSquare,
  CalendarDays,
  LayoutGrid,
  Library,
  MessagesSquare,
  BarChart3,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PulseSettingsTab } from '@/components/pulse/settings/PulseSettingsTab';
import { PulsePostsTab } from '@/components/pulse/posts/PulsePostsTab';
import { PulseCreateTab } from '@/components/pulse/create/PulseCreateTab';
import { PulseCalendarTab } from '@/components/pulse/calendar/PulseCalendarTab';
import { PulseEngagementTab } from '@/components/pulse/engagement/PulseEngagementTab';
import { PulseAnalyticsTab } from '@/components/pulse/analytics/PulseAnalyticsTab';
import { PulseOverviewTab } from '@/components/pulse/overview/PulseOverviewTab';
import { PulseLibraryTab } from '@/components/pulse/library/PulseLibraryTab';

type PulseTabId =
  | 'overview'
  | 'create'
  | 'calendar'
  | 'posts'
  | 'library'
  | 'engagement'
  | 'analytics'
  | 'settings';

interface PulseTab {
  id: PulseTabId;
  label: string;
  icon: LucideIcon;
}

const TABS: PulseTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'create', label: 'Create', icon: PenSquare },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'posts', label: 'Posts', icon: LayoutGrid },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'engagement', label: 'Engagement', icon: MessagesSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const TAB_IDS = TABS.map((t) => t.id) as string[];

export default function PulseAgent() {
  // Start on 'overview' for SSR/hydration parity, then sync from the URL after mount.
  const [activeTab, setActiveTab] = useState<PulseTabId>('overview');

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('tab');
    if (param && TAB_IDS.includes(param)) setActiveTab(param as PulseTabId);
  }, []);

  const selectTab = useCallback((id: PulseTabId) => {
    setActiveTab(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', id);
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  const panel = useMemo(() => {
    switch (activeTab) {
      case 'settings':
        return <PulseSettingsTab />;
      case 'create':
        return <PulseCreateTab />;
      case 'calendar':
        return <PulseCalendarTab />;
      case 'posts':
        return <PulsePostsTab />;
      case 'library':
        return <PulseLibraryTab />;
      case 'engagement':
        return <PulseEngagementTab />;
      case 'analytics':
        return <PulseAnalyticsTab />;
      case 'overview':
      default:
        return <PulseOverviewTab onNavigate={(t) => selectTab(t as PulseTabId)} />;
    }
  }, [activeTab, selectTab]);

  return (
    <div className="flex h-full p-0">
      <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:rounded-2xl">
        {/* ── Header ── */}
        <div className="border-b px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 p-2 shadow-sm shadow-pink-500/20 sm:p-3">
              <Share2 className="h-6 w-6 text-white sm:h-7 sm:w-7" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Pulse</h1>
              <p className="text-sm text-muted-foreground">Social Media Command Center</p>
            </div>
          </div>

          {/* ── Tab strip ── */}
          <nav
            role="tablist"
            aria-label="Pulse sections"
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
                  aria-controls="pulse-tabpanel"
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-1',
                    isActive
                      ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300'
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
        <div id="pulse-tabpanel" role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
          {panel}
        </div>
      </div>
    </div>
  );
}
