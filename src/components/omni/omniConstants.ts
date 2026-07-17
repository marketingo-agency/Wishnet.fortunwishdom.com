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
    id: 'audios',
    label: 'Audios',
    description: 'Voice, music, and sound creation. This track is on the roadmap and will plug in here.',
    icon: Headphones,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'bg-emerald-500/25',
    availability: 'coming_soon',
  },
  {
    id: 'videos',
    label: 'Videos',
    description: 'Cinematic clips, reels, and motion design. This track is on the roadmap and will plug in here.',
    icon: Film,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'bg-violet-500/25',
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
