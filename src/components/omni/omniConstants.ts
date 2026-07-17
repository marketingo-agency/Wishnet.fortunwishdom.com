/**
 * Omni workspace constants: entry tracks and Images-track modes.
 * Tracks render as the four large tiles on the Omni home screen.
 * Modes render inside the Images hub; availability flips on as phases ship.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Lightbulb,
  Images,
  Headphones,
  Film,
  Sparkles,
  Drama,
  ZoomIn,
  Crop,
  History,
  Clapperboard,
  NotebookPen,
  Zap,
  PersonStanding,
  Recycle,
} from 'lucide-react';
import type { OmniMode, OmniTrack } from '@/hooks/omni';

export type TrackAvailability = 'available' | 'in_development' | 'coming_soon';

export interface OmniTrackDef {
  id: OmniTrack;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind gradient classes for the tile icon tile */
  gradient: string;
  /** Tailwind glow class behind the icon */
  glow: string;
  availability: TrackAvailability;
}

export const OMNI_TRACKS: OmniTrackDef[] = [
  {
    id: 'brainstorming',
    label: 'Brainstorming',
    description: 'Develop ideas in a grounded chat, then jump into the right creation mode with everything prefilled.',
    icon: Lightbulb,
    gradient: 'from-amber-400 to-orange-500',
    glow: 'bg-amber-500/25',
    availability: 'available',
  },
  {
    id: 'images',
    label: 'Images',
    description: 'Generate across every fal.ai model, transform and upscale, repurpose for social, and ship to the Content Library.',
    icon: Images,
    gradient: 'from-cyan-500 to-blue-600',
    glow: 'bg-cyan-500/25',
    availability: 'available',
  },
  {
    id: 'videos',
    label: 'Videos',
    description: 'Scenario-first video production: multi-scene studio builds, short-form clips, animation, and per-network repurposing.',
    icon: Film,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'bg-violet-500/25',
    availability: 'available',
  },
  {
    id: 'audios',
    label: 'Audios',
    description: 'Voice, music, and sound creation. This track is on the roadmap and will plug in here.',
    icon: Headphones,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'bg-emerald-500/25',
    availability: 'coming_soon',
  },
];

export interface OmniModeDef {
  /** character_studio is a curated Studio entry (pre-seeded omni_images run),
   *  not a persisted omni_runs.mode value. */
  id: OmniMode | 'history' | 'character_studio';
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  /** Set true as each phase ships */
  available: boolean;
  availabilityNote: string;
}

/** Six-card 2×3 hub (Sam-approved order). Surprise Me folded into the
 *  wizard's step 1 as "Inspire me" — its legacy runs still open from History. */
export const OMNI_IMAGE_MODES: OmniModeDef[] = [
  {
    // Label-only rename (D2): the persisted mode value stays 'omni_images'
    // (omni_runs.mode has a DB CHECK) — only the display name is "Studio".
    id: 'omni_images',
    label: 'Studio',
    description: 'The full creation pipeline: brief, models, live generation, distribution formats, captions, finalize.',
    icon: Sparkles,
    accent: 'text-cyan-400',
    available: true,
    availabilityNote: '',
  },
  {
    id: 'character_studio',
    label: 'Character Studio',
    description: 'Create new scenes featuring your Wishpedia characters, anchored to their canon art.',
    icon: Drama,
    accent: 'text-fuchsia-400',
    available: true,
    availabilityNote: '',
  },
  {
    id: 'brainstorming',
    label: 'Brainstorming',
    description: 'Discuss and develop an image idea, then lock it and continue in the right mode.',
    icon: Lightbulb,
    accent: 'text-amber-400',
    available: true,
    availabilityNote: '',
  },
  {
    id: 'transform_upscale',
    label: 'Transform and Upscale',
    description: 'Analyze an existing image, then transform or upscale it with the right models.',
    icon: ZoomIn,
    accent: 'text-blue-400',
    available: true,
    availabilityNote: '',
  },
  {
    id: 'repurposing',
    label: 'Images Repurposing',
    description: 'Turn finished images into every social network format and save the set to the Content Library.',
    icon: Crop,
    accent: 'text-emerald-400',
    available: true,
    availabilityNote: '',
  },
  {
    id: 'history',
    label: 'History',
    description: 'Every run, every mode. Retake any entry or resume a workflow at the exact step you left it.',
    icon: History,
    accent: 'text-violet-400',
    available: true,
    availabilityNote: '',
  },
];

export interface OmniVideoModeDef {
  id: 'video_scenario' | 'omni_videos' | 'video_clips' | 'video_animate' | 'video_repurpose' | 'history';
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  available: boolean;
  availabilityNote: string;
}

/** Six-card 2×3 Videos hub (Sam-approved structure, Plan 2 §0). Cards flip
 *  to available as their phase lands. */
export const OMNI_VIDEO_MODES: OmniVideoModeDef[] = [
  {
    id: 'video_scenario',
    label: 'Scenario Studio',
    description: 'Pre-production: brief or URL to a knowledge-grounded scenario with storyboard keyframes and a shot list, ready to seed Video Studio.',
    icon: NotebookPen,
    accent: 'text-violet-400',
    available: true,
    availabilityNote: '',
  },
  {
    id: 'omni_videos',
    label: 'Video Studio',
    description: 'The full production pipeline: scenario, per-scene clips in draft and hero tiers, voiceover and music, assembly, captions, distribution.',
    icon: Clapperboard,
    accent: 'text-purple-400',
    available: true,
    availabilityNote: '',
  },
  {
    id: 'video_clips',
    label: 'Clips',
    description: 'The short-form fast lane: one idea to a platform-ready vertical clip with native audio and captions in four screens.',
    icon: Zap,
    accent: 'text-rose-400',
    available: false,
    availabilityNote: 'Lands in Phase 8 of this build.',
  },
  {
    id: 'video_animate',
    label: 'Animate',
    description: 'Bring any image to life: motion from a prompt, character consistency from canon references, or a talking character with a brand voice.',
    icon: PersonStanding,
    accent: 'text-indigo-400',
    available: false,
    availabilityNote: 'Lands in Phase 9 of this build.',
  },
  {
    id: 'video_repurpose',
    label: 'Repurpose & Enhance',
    description: 'A master video fanned into per-network variants: AI reframe without cropping, trim to length, thumbnails, upscale.',
    icon: Recycle,
    accent: 'text-teal-400',
    available: false,
    availabilityNote: 'Lands in Phase 10 of this build.',
  },
  {
    id: 'history',
    label: 'History',
    description: 'Every video run, resumable at the exact stage you left it.',
    icon: History,
    accent: 'text-cyan-400',
    available: true,
    availabilityNote: '',
  },
];
