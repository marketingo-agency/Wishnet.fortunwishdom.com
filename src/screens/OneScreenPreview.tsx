"use client";

/**
 * OneScreenPreview: the ChatGPT-style one-screen Wishnet concept, as a
 * self-contained prototype at /preview/one-screen.
 *
 * Left: collapsible history rail (Fortun Wishnet branding, mock runs).
 * Center: home (greeting + composer) or active (mock thread / run card).
 * Top right: theme toggle, settings, and the REAL user's avatar menu.
 *
 * Page-local theme rides data-preview-theme (dark default, persisted).
 * Zero backend calls beyond the auth/profile context the app already loads.
 */
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_RUNS, type PreviewRun } from '@/components/preview/one-screen/previewMockData';
import { PreviewRail } from '@/components/preview/one-screen/PreviewRail';
import { PreviewTopBar } from '@/components/preview/one-screen/PreviewTopBar';
import { PreviewHome } from '@/components/preview/one-screen/PreviewHome';
import { PreviewActiveView } from '@/components/preview/one-screen/PreviewActiveView';
import { PT } from '@/components/preview/one-screen/previewTokens';

type PreviewTheme = 'light' | 'dark';

type ViewState =
  | { type: 'home' }
  | { type: 'run'; runId: string }
  | { type: 'adhoc'; prompt: string };

export default function OneScreenPreview() {
  const { profile } = useAuth();

  const [theme, setTheme] = useState<PreviewTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      return (localStorage.getItem('preview-theme') as PreviewTheme | null) ?? 'dark';
    } catch {
      // Storage access can throw in hardened-privacy browsers; theme falls back.
      return 'dark';
    }
  });
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [view, setView] = useState<ViewState>({ type: 'home' });
  const [draft, setDraft] = useState('');

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('preview-theme', next);
      } catch {
        // Storage blocked: the toggle still works for this session only.
      }
      return next;
    });
  }, []);

  const handleSelectRun = useCallback((run: PreviewRun) => {
    setView({ type: 'run', runId: run.id });
    setMobileRailOpen(false);
  }, []);

  const handleNew = useCallback(() => {
    setView({ type: 'home' });
    setDraft('');
    setMobileRailOpen(false);
  }, []);

  const handleHomeSend = useCallback((text: string) => {
    setView({ type: 'adhoc', prompt: text });
    setDraft('');
  }, []);

  const activeRun = view.type === 'run' ? MOCK_RUNS.find((r) => r.id === view.runId) : undefined;
  const title =
    view.type === 'home'
      ? 'Omni Creation Studio'
      : view.type === 'adhoc'
        ? 'New creation'
        : activeRun?.title ?? 'Creation';
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Remount the active view per selection so each mock thread starts fresh.
  const viewKey = view.type === 'run' ? `run-${view.runId}` : view.type === 'adhoc' ? `adhoc-${view.prompt}` : 'home';

  return (
    <div data-preview-theme={theme} className="h-screen w-full overflow-hidden">
      <div className={cn('flex h-full w-full transition-colors duration-300 motion-reduce:transition-none safe-bottom safe-x', PT.page)}>
        <PreviewRail
          collapsed={railCollapsed}
          onToggleCollapsed={() => setRailCollapsed((v) => !v)}
          mobileOpen={mobileRailOpen}
          onMobileClose={() => setMobileRailOpen(false)}
          activeId={view.type === 'run' ? view.runId : null}
          onSelect={handleSelectRun}
          onNew={handleNew}
        />
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <PreviewTopBar
            theme={theme}
            onToggleTheme={toggleTheme}
            title={title}
            onOpenMobileRail={() => setMobileRailOpen(true)}
          />
          <main id="main-content" className="min-h-0 flex-1">
            {view.type === 'home' ? (
              <PreviewHome
                firstName={firstName}
                draft={draft}
                onDraftChange={setDraft}
                onSend={handleHomeSend}
              />
            ) : (
              <PreviewActiveView
                key={viewKey}
                run={activeRun}
                adhocPrompt={view.type === 'adhoc' ? view.prompt : undefined}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
