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
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Orbit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAgentSettings } from '@/hooks/useAgentSettings';
import type { OmniRun, OmniTrack } from '@/hooks/omni';
import { OmniTopBar } from '@/components/omni/OmniTopBar';
import { OmniEntryTiles } from '@/components/omni/OmniEntryTiles';
import { OmniImagesHub } from '@/components/omni/OmniImagesHub';
import { OmniImagesWizard } from '@/components/omni/wizard/OmniImagesWizard';
import { TransformWizard } from '@/components/omni/transform/TransformWizard';
import { RepurposeModeWizard } from '@/components/omni/repurpose-mode/RepurposeModeWizard';
import { CharacterStudioPicker } from '@/components/omni/character-studio/CharacterStudioPicker';
import { HistoryView } from '@/components/omni/history/HistoryView';
import { BrainstormView } from '@/components/omni/brainstorm/BrainstormView';
import { VideosHub } from '@/components/omni/VideosHub';
import { AudiosHub } from '@/components/omni/AudiosHub';
import { CastPersonasView } from '@/components/omni/cast/CastPersonasView';
import { PodcastScenarioWizard } from '@/components/omni/podcast-scenario/PodcastScenarioWizard';
import { PodcastStudioWizard } from '@/components/omni/podcast-studio/PodcastStudioWizard';
import { ScenarioWizard } from '@/components/omni/scenario/ScenarioWizard';
import { VideoStudioWizard } from '@/components/omni/video-studio/VideoStudioWizard';
import { ClipsWizard } from '@/components/omni/clips/ClipsWizard';
import { AnimateWizard } from '@/components/omni/animate/AnimateWizard';
import { RepurposeVideoWizard } from '@/components/omni/video-repurpose/RepurposeVideoWizard';
import { resolveSurfaceForRun } from '@/components/omni/history/historyRouting';
import { isAudioMode, isVideoMode } from '@/components/omni/stepRegistry';
import { OMNI_TRACKS } from '@/components/omni/omniConstants';

type OmniTheme = 'light' | 'dark';
type OmniView = 'home' | OmniTrack;
// surprise_me is no longer a surface: it folded into the wizard's step 1 as
// "Inspire me". ?mode=surprise_me deep links land on the hub (legacy alias);
// legacy surprise runs open in the wizard via resolveSurfaceForRun as before.
type ImagesMode = 'hub' | 'omni_images' | 'character_studio' | 'transform_upscale' | 'repurposing' | 'history' | 'brainstorming';

const IMAGES_MODE_IDS: ImagesMode[] = ['omni_images', 'character_studio', 'transform_upscale', 'repurposing', 'history', 'brainstorming'];

const TRACK_IDS = OMNI_TRACKS.map((t) => t.id) as string[];

type VideosMode = 'hub' | 'history' | 'video_scenario' | 'omni_videos' | 'video_clips' | 'video_animate' | 'video_repurpose';

type AudiosMode = 'hub' | 'history' | 'podcast_scenario' | 'omni_podcast' | 'cast_personas' | 'podcast_video' | 'publish_feed';
/** Audio surfaces accepted from the URL — widened as each phase ships its
 *  wizard (a deep link to an unbuilt surface must land on the hub, not blank). */
const BUILT_AUDIO_SURFACES: AudiosMode[] = ['history', 'cast_personas', 'podcast_scenario', 'omni_podcast'];

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
  const [videosMode, setVideosMode] = useState<VideosMode>('hub');
  const [audiosMode, setAudiosMode] = useState<AudiosMode>('hub');
  const [wizardRunId, setWizardRunId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const track = params.get('track');
    // The brainstorming track is an alias for the Images-hub chat surface.
    if (track === 'brainstorming') {
      setView('images');
      setImagesMode('brainstorming');
    } else if (track && TRACK_IDS.includes(track)) {
      setView(track as OmniTrack);
    }
    // ?mode/?run belong to the images surfaces only (F6): parsing them for
    // other tracks would leave phantom state behind a coming-soon view.
    const imagesTrack = track === 'images' || track === 'brainstorming';
    if (imagesTrack) {
      const mode = params.get('mode');
      if (mode && (IMAGES_MODE_IDS as string[]).includes(mode)) setImagesMode(mode as ImagesMode);
      const run = params.get('run');
      if (run) setWizardRunId(run);
    }
    if (track === 'videos') {
      const mode = params.get('mode');
      if (mode === 'history' || mode === 'video_scenario' || mode === 'omni_videos' || mode === 'video_clips' || mode === 'video_animate' || mode === 'video_repurpose') setVideosMode(mode);
      const run = params.get('run');
      if (run) setWizardRunId(run);
    }
    if (track === 'audios') {
      const mode = params.get('mode');
      if (mode && (BUILT_AUDIO_SURFACES as string[]).includes(mode)) setAudiosMode(mode as AudiosMode);
      const run = params.get('run');
      if (run) setWizardRunId(run);
    }
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

  const openImagesMode = useCallback((mode: Exclude<ImagesMode, 'hub'>) => {
    setView('images');
    setImagesMode(mode);
    setWizardRunId(null);
    syncUrl('images', mode, null);
  }, [syncUrl]);

  const selectView = useCallback((next: OmniView) => {
    // The Brainstorming track tile opens the same chat surface as the
    // Images-hub mode card, so the run id stays URL-addressable.
    if (next === 'brainstorming') {
      openImagesMode('brainstorming');
      return;
    }
    setView(next);
    setImagesMode('hub');
    setVideosMode('hub');
    setAudiosMode('hub');
    setWizardRunId(null);
    syncUrl(next, 'hub', null);
  }, [openImagesMode, syncUrl]);

  const openVideosMode = useCallback((mode: VideosMode, runId: string | null = null) => {
    setVideosMode(mode);
    setWizardRunId(runId);
    const url = new URL(window.location.href);
    url.searchParams.set('track', 'videos');
    if (mode === 'hub') url.searchParams.delete('mode');
    else url.searchParams.set('mode', mode);
    if (runId && mode !== 'hub') url.searchParams.set('run', runId);
    else url.searchParams.delete('run');
    window.history.replaceState({}, '', url);
  }, []);

  const openAudiosMode = useCallback((mode: AudiosMode, runId: string | null = null) => {
    setAudiosMode(mode);
    setWizardRunId(runId);
    const url = new URL(window.location.href);
    url.searchParams.set('track', 'audios');
    if (mode === 'hub') url.searchParams.delete('mode');
    else url.searchParams.set('mode', mode);
    if (runId && mode !== 'hub') url.searchParams.set('run', runId);
    else url.searchParams.delete('run');
    window.history.replaceState({}, '', url);
  }, []);

  const handleRunCreated = useCallback((mode: Exclude<ImagesMode, 'hub'>) => (runId: string) => {
    setWizardRunId(runId);
    syncUrl('images', mode, runId);
  }, [syncUrl]);

  const handleTransformHandoff = useCallback(() => {
    // The run continues into the Omni Images wizard at step 7 (repurposing path).
    setImagesMode('omni_images');
    syncUrl('images', 'omni_images', wizardRunId);
  }, [syncUrl, wizardRunId]);

  const openStudioWithRun = useCallback((runId: string) => {
    // Repurposing and Character Studio create their run in one action, then
    // hand the id straight to the Studio wizard.
    setWizardRunId(runId);
    setImagesMode('omni_images');
    syncUrl('images', 'omni_images', runId);
  }, [syncUrl]);

  const queryClient = useQueryClient();
  const handleHistoryOpenRun = useCallback((run: OmniRun) => {
    // Fresh data before re-entering: a stale assets snapshot would make
    // step 5's restore undercount and resubmit paid generations.
    void queryClient.invalidateQueries({ queryKey: ['omni-run', run.id] });
    void queryClient.invalidateQueries({ queryKey: ['omni-assets', run.id] });
    // Video-mode workspaces land phase by phase (interim-terminal rule):
    // until a mode's surface is built, History resumes stay put with an
    // honest note instead of dropping the run onto a foreign wizard.
    if (isVideoMode(run.mode)) {
      setView('videos');
      openVideosMode(run.mode as VideosMode, run.id);
      return;
    }
    if (isAudioMode(run.mode)) {
      // Audio wizards land phase by phase; until a mode's surface is built,
      // History resumes settle on the Audios hub (interim-terminal rule).
      setView('audios');
      const surface = run.mode as AudiosMode;
      openAudiosMode(BUILT_AUDIO_SURFACES.includes(surface) ? surface : 'hub', run.id);
      return;
    }
    const surface = resolveSurfaceForRun(run) as ImagesMode;
    setWizardRunId(run.id);
    setView('images');
    setImagesMode(surface);
    syncUrl('images', surface, run.id);
  }, [queryClient, syncUrl, openVideosMode, openAudiosMode]);

  const { data: agentSettings, isLoading: loadingAgentSettings } = useAgentSettings('omni');
  const isInactive = !loadingAgentSettings && agentSettings && !agentSettings.is_active;

  const goHome = useCallback(() => selectView('home'), [selectView]);


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
                    if ((IMAGES_MODE_IDS as string[]).includes(mode)) openImagesMode(mode as Exclude<ImagesMode, 'hub'>);
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

              {view === 'images' && imagesMode === 'character_studio' && (
                <CharacterStudioPicker
                  onExit={() => selectView('images')}
                  onCreated={openStudioWithRun}
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
                  onHandoff={openStudioWithRun}
                />
              )}

              {view === 'images' && imagesMode === 'history' && (
                <HistoryView
                  onOpenRun={handleHistoryOpenRun}
                  onExit={() => selectView('images')}
                />
              )}

              {view === 'images' && imagesMode === 'brainstorming' && (
                <BrainstormView
                  runId={wizardRunId}
                  onRunCreated={handleRunCreated('brainstorming')}
                  onLocked={handleHistoryOpenRun}
                  onExit={() => selectView('images')}
                />
              )}

              {view === 'audios' && audiosMode === 'hub' && (
                <AudiosHub
                  onBack={goHome}
                  onSelectMode={(mode) => {
                    openAudiosMode(mode as AudiosMode);
                    // Other mode surfaces ship phase by phase (cards are inert until then).
                  }}
                />
              )}

              {view === 'audios' && audiosMode === 'podcast_scenario' && (
                <PodcastScenarioWizard
                  runId={wizardRunId}
                  onRunCreated={(id) => openAudiosMode('podcast_scenario', id)}
                  onExit={() => openAudiosMode('hub')}
                  onHandoffToStudio={(id) => openAudiosMode('omni_podcast', id)}
                />
              )}

              {view === 'audios' && audiosMode === 'omni_podcast' && (
                <PodcastStudioWizard
                  runId={wizardRunId}
                  onRunCreated={(id) => openAudiosMode('omni_podcast', id)}
                  onExit={() => openAudiosMode('hub')}
                />
              )}

              {view === 'audios' && audiosMode === 'cast_personas' && (
                <CastPersonasView onExit={() => openAudiosMode('hub')} />
              )}

              {view === 'audios' && audiosMode === 'history' && (
                <HistoryView
                  family="audios"
                  onOpenRun={handleHistoryOpenRun}
                  onExit={() => openAudiosMode('hub')}
                />
              )}

              {view === 'videos' && videosMode === 'hub' && (
                <VideosHub
                  onBack={goHome}
                  onSelectMode={(mode) => {
                    openVideosMode(mode as VideosMode);
                    // Other mode surfaces ship phase by phase (cards are inert until then).
                  }}
                />
              )}

              {view === 'videos' && videosMode === 'video_scenario' && (
                <ScenarioWizard
                  runId={wizardRunId}
                  onRunCreated={(id) => openVideosMode('video_scenario', id)}
                  onExit={() => openVideosMode('hub')}
                  onHandoffToStudio={(id) => openVideosMode('omni_videos', id)}
                />
              )}

              {view === 'videos' && videosMode === 'video_repurpose' && (
                <RepurposeVideoWizard
                  runId={wizardRunId}
                  onRunCreated={(id) => openVideosMode('video_repurpose', id)}
                  onExit={() => openVideosMode('hub')}
                />
              )}
              {view === 'videos' && videosMode === 'video_animate' && (
                <AnimateWizard
                  runId={wizardRunId}
                  onRunCreated={(id) => openVideosMode('video_animate', id)}
                  onExit={() => openVideosMode('hub')}
                />
              )}
              {view === 'videos' && videosMode === 'video_clips' && (
                <ClipsWizard
                  runId={wizardRunId}
                  onRunCreated={(id) => openVideosMode('video_clips', id)}
                  onExit={() => openVideosMode('hub')}
                />
              )}
              {view === 'videos' && videosMode === 'omni_videos' && (
                <VideoStudioWizard
                  runId={wizardRunId}
                  onRunCreated={(id) => openVideosMode('omni_videos', id)}
                  onExit={() => openVideosMode('hub')}
                />
              )}

              {view === 'videos' && videosMode === 'history' && (
                <HistoryView
                  family="videos"
                  onOpenRun={handleHistoryOpenRun}
                  onExit={() => openVideosMode('hub')}
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
