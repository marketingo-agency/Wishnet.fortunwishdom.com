/**
 * Video network presets (Plan 2 D-V6) — a PARALLEL registry to the image
 * presets in omniNetworkPresets.ts. Deliberately NOT an extension: every
 * image consumer assumes static pixels, while video targets carry fps,
 * duration caps, and file-size ceilings.
 *
 * Reframe targets snap to each MODEL's aspect enum (falVideoSpecs) exactly
 * like MODEL_ASPECT_ENUMS does for images — these are the NETWORK-side truths.
 */

import type { ComponentType } from 'react';
import { Facebook, Instagram, Youtube, Music2 } from 'lucide-react';
import { PinterestIcon } from './PinterestIcon';

export type OmniVideoNetworkId = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'pinterest';

export interface OmniVideoPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  ratio: string;
  fps: number;
  /** Hard platform ceiling in seconds. */
  maxSeconds: number;
  /** The engagement sweet spot the UI recommends. */
  sweetSpotSeconds: [number, number];
  /** Platform upload ceiling in MB (v1: informative cap for the size check). */
  maxMB: number;
}

export interface OmniVideoNetwork {
  id: OmniVideoNetworkId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  presets: OmniVideoPreset[];
}

export const OMNI_VIDEO_NETWORKS: OmniVideoNetwork[] = [
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: Music2,
    accent: 'text-cyan-400',
    presets: [
      { id: 'tiktok_vertical', label: 'Vertical', width: 1080, height: 1920, ratio: '9:16', fps: 30, maxSeconds: 600, sweetSpotSeconds: [15, 60], maxMB: 287 },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    accent: 'text-fuchsia-400',
    presets: [
      { id: 'ig_reel', label: 'Reel', width: 1080, height: 1920, ratio: '9:16', fps: 30, maxSeconds: 90, sweetSpotSeconds: [15, 45], maxMB: 250 },
      { id: 'ig_feed_square', label: 'Feed square', width: 1080, height: 1080, ratio: '1:1', fps: 30, maxSeconds: 60, sweetSpotSeconds: [15, 45], maxMB: 250 },
    ],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    accent: 'text-red-500',
    presets: [
      { id: 'yt_short', label: 'Short', width: 1080, height: 1920, ratio: '9:16', fps: 30, maxSeconds: 180, sweetSpotSeconds: [20, 60], maxMB: 256 },
      { id: 'yt_longform', label: 'Long-form', width: 1920, height: 1080, ratio: '16:9', fps: 30, maxSeconds: 43200, sweetSpotSeconds: [180, 900], maxMB: 2048 },
    ],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    accent: 'text-blue-500',
    presets: [
      { id: 'fb_landscape', label: 'Landscape', width: 1920, height: 1080, ratio: '16:9', fps: 30, maxSeconds: 14400, sweetSpotSeconds: [30, 120], maxMB: 1024 },
      { id: 'fb_reel', label: 'Reel', width: 1080, height: 1920, ratio: '9:16', fps: 30, maxSeconds: 90, sweetSpotSeconds: [15, 45], maxMB: 250 },
    ],
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    icon: PinterestIcon,
    accent: 'text-red-500',
    presets: [
      { id: 'pin_standard', label: 'Standard pin', width: 1000, height: 1500, ratio: '2:3', fps: 30, maxSeconds: 300, sweetSpotSeconds: [6, 15], maxMB: 2048 },
      { id: 'pin_vertical', label: 'Vertical pin', width: 1080, height: 1920, ratio: '9:16', fps: 30, maxSeconds: 300, sweetSpotSeconds: [6, 15], maxMB: 2048 },
    ],
  },
];

export function getVideoNetwork(id: OmniVideoNetworkId): OmniVideoNetwork {
  return OMNI_VIDEO_NETWORKS.find((n) => n.id === id)!;
}

export function getVideoPreset(networkId: OmniVideoNetworkId, presetId: string): OmniVideoPreset | undefined {
  return getVideoNetwork(networkId)?.presets.find((p) => p.id === presetId);
}
