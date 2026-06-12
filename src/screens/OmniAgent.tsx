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
import { OmniImagesWizard } from '@/components/omni/wizard/OmniImagesWizard';
import { TransformWizard } from '@/components/omni/transform/TransformWizard';
import { RepurposeModeWizard } from '@/components/omni/repurpose-mode/RepurposeModeWizard';
import { OMNI_TRACKS } from '@/components/omni/omniConstants';

type OmniTheme = 'light' | 'dark';
type OmniView = 'home' | OmniTrack;
type ImagesMode = 'hub' | 'omni_images' | 'transform_upscale' | 'repurposing';

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
  const [imagesMode, setImagesMode] = useState<ImagesMode>('hub');
  const [wizardRunId, setWizardRunId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const track = params.get('track');
    if (track && TRACK_IDS.includes(track)) setView(track as OmniTrack);
    const mode = params.get('mode');
    if (mode === 'omni_images' || mode === 'transform_upscale' || mode === 'repurposing') setImagesMode(mode);
    const run = params.get('run');
    if (run) setWizardRunId(run);
  }, []);

  const syncUrl = useCallback((next: OmniView, mode: ImagesMode, runId: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (next === 'home') url.searchParams.delete('track');
    else url.searchParams.set('track', next);
    if (mode !== 'hub' && next === 'images') url.searchParams.set('mode', mode);
    else url.searchParams.delete('mode');
    if (runId && mode !== 'hub') url.searchParams.set('run', runId);
    else url.searchParams.delete('run');
    window.history.replaceState({}, '', url);
  }, []);

  const selectView = useCallback((next: OmniView) => {
    setView(next);
    setImagesMode('hub');
    setWizardRunId(null);
    syncUrl(next, 'hub', null);
  }, [syncUrl]);

  const openImagesMode = useCallback((mode: Exclude<ImagesMode, 'hub'>) => {
    setImagesMode(mode);
    setWizardRunId(null);
    syncUrl('images', mode, null);
  }, [syncUrl]);

  const handleRunCreated = useCallback((mode: Exclude<ImagesMode, 'hub'>) => (runId: string) => {
    setWizardRunId(runId);
    syncUrl('images', mode, runId);
  }, [syncUrl]);

  const handleTransformHandoff = useCallback(() => {
    // The run continues into the Omni Images wizard at step 7 (repurposing path).
    setImagesMode('omni_images');
    syncUrl('images', 'omni_images', wizardRunId);
  }, [syncUrl, wizardRunId]);

  const handleRepurposeHandoff = useCallback((runId: string) => {
    // Mode 3 creates the run and hands off in one action, so the id arrives
    // directly instead of via wizardRunId state.
    setWizardRunId(runId);
    setImagesMode('omni_images');
    syncUrl('images', 'omni_images', runId);
  }, [syncUrl]);

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

              {view === 'images' && imagesMode === 'hub' && (
                <OmniImagesHub
                  onBack={goHome}
                  onSelectMode={(mode) => {
                    if (mode === 'omni_images' || mode === 'transform_upscale' || mode === 'repurposing') openImagesMode(mode);
                    // Remaining mode surfaces ship phase by phase.
                  }}
                />
              )}

              {view === 'images' && imagesMode === 'omni_images' && (
                <OmniImagesWizard
                  runId={wizardRunId}
                  onRunCreated={handleRunCreated('omni_images')}
                  onExit={() => selectView('images')}
                />
              )}

              {view === 'images' && imagesMode === 'transform_upscale' && (
                <TransformWizard
                  runId={wizardRunId}
                  onRunCreated={handleRunCreated('transform_upscale')}
                  onExit={() => selectView('images')}
                  onHandoffToRepurposing={handleTransformHandoff}
                />
              )}

              {view === 'images' && imagesMode === 'repurposing' && (
                <RepurposeModeWizard
                  onExit={() => selectView('images')}
                  onHandoff={handleRepurposeHandoff}
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
