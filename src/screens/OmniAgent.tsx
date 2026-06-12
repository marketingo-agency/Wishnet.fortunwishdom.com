"use client";

/**
 * OmniAgent: the Omni Multimodal Creation AI workspace.
 * Phase 0 shell: four-tile entry screen, Images mode chooser skeleton,
 * coming-soon surfaces for Audios/Videos, page-local dark mode
 * (data-omni-theme + localStorage, replicating Pixel's mechanism),
 * fullscreen capability, and the agent inactive overlay.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Orbit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAgentSettings } from '@/hooks/useAgentSettings';
import type { OmniTrack } from '@/hooks/omni';
import { OmniTopBar } from '@/components/omni/OmniTopBar';
import { OmniEntryTiles } from '@/components/omni/OmniEntryTiles';
import { OmniImagesHub } from '@/components/omni/OmniImagesHub';
import { OmniComingSoon } from '@/components/omni/OmniComingSoon';
import { OMNI_TRACKS } from '@/components/omni/omniConstants';

type OmniTheme = 'light' | 'dark';
type OmniView = 'home' | OmniTrack;

const TRACK_IDS = OMNI_TRACKS.map((t) => t.id) as string[];

export default function OmniAgent() {
  const router = useRouter();

  const [omniTheme, setOmniTheme] = useState<OmniTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('omni-theme') as OmniTheme | null) ?? 'dark';
    }
    return 'dark';
  });
  const toggleOmniTheme = useCallback(() => {
    setOmniTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('omni-theme', next);
      return next;
    });
  }, []);
  // Sync to localStorage on mount (SSR safety)
  useEffect(() => {
    localStorage.setItem('omni-theme', omniTheme);
  }, [omniTheme]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => setIsFullscreen((f) => !f), []);

  // Start on 'home' for SSR/hydration parity, then sync from the URL after mount.
  const [view, setView] = useState<OmniView>('home');
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('track');
    if (param && TRACK_IDS.includes(param)) setView(param as OmniTrack);
  }, []);

  const selectView = useCallback((next: OmniView) => {
    setView(next);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (next === 'home') url.searchParams.delete('track');
      else url.searchParams.set('track', next);
      window.history.replaceState({}, '', url);
    }
  }, []);

  const { data: agentSettings, isLoading: loadingAgentSettings } = useAgentSettings('omni');
  const isInactive = !loadingAgentSettings && agentSettings && !agentSettings.is_active;

  const goHome = useCallback(() => selectView('home'), [selectView]);

  const trackDef = (id: OmniTrack) => OMNI_TRACKS.find((t) => t.id === id)!;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        data-omni-theme={omniTheme}
        className={cn(
          'relative flex flex-col overflow-hidden border border-border bg-background text-foreground shadow-sm',
          isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[calc(100vh-80px)] rounded-xl',
        )}
      >
        <OmniTopBar
          isConnected={!isInactive}
          showHome={view !== 'home'}
          onHome={goHome}
          omniTheme={omniTheme}
          onToggleTheme={toggleOmniTheme}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        <main className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="h-full"
            >
              {view === 'home' && <OmniEntryTiles onSelectTrack={(track) => selectView(track)} />}

              {view === 'images' && (
                <OmniImagesHub
                  onBack={goHome}
                  onSelectMode={() => {
                    // Mode surfaces ship phase by phase; cards are disabled until then.
                  }}
                />
              )}

              {view === 'brainstorming' && (
                <OmniComingSoon
                  icon={trackDef('brainstorming').icon}
                  gradient={trackDef('brainstorming').gradient}
                  title="Brainstorming is on its way"
                  description="Develop ideas with Omni in a grounded chat, then lock them and continue in the right creation mode with everything prefilled. This surface lands in an upcoming phase."
                  badgeLabel="In Development"
                  badgeClassName="border-amber-500/40 bg-amber-500/10 text-amber-400"
                  onBack={goHome}
                />
              )}

              {view === 'audios' && (
                <OmniComingSoon
                  icon={trackDef('audios').icon}
                  gradient={trackDef('audios').gradient}
                  title="Audios is coming soon"
                  description="Voice, music, and sound creation will live here. The track has a reserved slot and will plug straight into this workspace."
                  badgeLabel="Coming Soon"
                  onBack={goHome}
                />
              )}

              {view === 'videos' && (
                <OmniComingSoon
                  icon={trackDef('videos').icon}
                  gradient={trackDef('videos').gradient}
                  title="Videos is coming soon"
                  description="Cinematic clips, reels, and motion design will live here. The track has a reserved slot and will plug straight into this workspace."
                  badgeLabel="Coming Soon"
                  onBack={goHome}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {isInactive && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex max-w-sm flex-col items-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">Omni is Inactive</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Omni has been deactivated. Enable it in the Nexus Control Center.
              </p>
              <Button
                onClick={() => router.push('/ai-agents/nexus?tab=agents')}
                className="mt-6 cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
              >
                <Orbit className="h-4 w-4" />
                Go to Nexus
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
